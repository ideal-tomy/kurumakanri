# LINE連携デバッグ作業レポート（2026-05-06）

## 目的

管理画面から、対象顧客（車検半年前/オイル交換目安）に対してLINE通知を送信できる運用状態を作る。

---

## 結論サマリ

- Webhook疎通は最終的に **成功**（LINE Developers の検証成功、`line.follow_unmatched` がDBに記録）。
- 顧客への `line_user_id` 紐付けも **成功**。
- テンプレート未登録問題も **解消**（`template_versions` にLINE用テンプレ3件登録）。
- ただし通知送信は最終的に **未成功**。
- 最終失敗要因は環境変数/トークン起因で、少なくとも以下を確認:
  - `OPT_OUT_SECRET` 未設定エラー発生履歴あり
  - `LINE_CHANNEL_ACCESS_TOKEN` 未設定エラー発生履歴あり
  - 設定後は `HTTP_401 Authentication failed`（トークン無効/不一致）発生

---

## 現在の状態（最新）

### 成功している項目

- ローカルUI崩れ（`/_next/static/... 404`）は `.next`/cache削除と再起動で復旧。
- ログイン動作は復旧済み。
- Webhook URL:
  - `https://kurumakanri.vercel.app/api/webhooks/line`
  - `Use webhook: ON`
  - `検証: 成功` を確認済み
- `audit_logs` に `line.follow_unmatched` が記録され、`payload.lineUserId` が取得できた。
- `customers.line_user_id` に取得IDを更新済み（`LINEテスト顧客`）。
- `consents` も `LINE opt_in = true`。
- `template_versions` に `shaken_180days / shaken_90days / oil_4000km` の `LINE` テンプレを登録済み。

### 未達成項目

- 管理画面からのLINE送信成功（`notification_logs.result=SUCCESS`）が未確認。
- 最新失敗は `notification_logs.error_code = HTTP_401`。

---

## 時系列レポート（作業・対策・観測）

## 1. 初期不具合（UI崩れ・ログイン不能）

### 症状
- ログイン画面でCSS崩れ、`/_next/static/chunks/... 404`
- `Cannot find module './276.js'`
- `TypeError: __webpack_modules__[moduleId] is not a function`

### 実施対策
- 3000番ポートの既存プロセス停止
- `.next` と `node_modules/.cache` 削除
- `npm run dev` 再起動

### 結果
- UI崩れ解消
- ログイン復旧

---

## 2. DB/認証周りの基盤修正

### 症状
- `days_until(date) does not exist`
- `staff_profiles` のRLS再帰
- `v_targets_shaken_90` 等のビュー未存在

### 実施対策
- `0006_hotfix_priority_and_rls.sql` を追加/適用
- `days_until()` 関数再作成
- `estimated_mileage` 関数修正
- `staff_profiles` 管理者判定を `is_admin_staff()` 経由に修正
- `v_customer_overview`, `v_targets_shaken_180`, `v_targets_shaken_90`, `v_targets_oil` 再作成

### 結果
- SQL実行エラー解消
- 抽出一覧ページが動作可能に

---

## 3. 本番運用開始PLANの実装

### 実施内容
- LINE本番ガード（token未設定時の明示エラー）
- 優先キューの対応済み除外ロジック
- 週次運用KPI表示
- 障害時ガイド表示
- 運用ドキュメント追加（Runbook / 障害対応 / リハーサル）

### 結果
- `npm run test` 成功
- `npm run build` 成功
- 機能は導入済み

---

## 4. LINE Webhook疎通確認

### 症状
- LINE Developers のWebhook検証がタイムアウト
- `audit_logs` に `line.%` が出ない

### 実施対策・指示
- `GET /api/webhooks/line` の `405` は正常と説明（POST専用）
- `curl POST` 疎通確認を実施
- Vercel Logs で `/api/webhooks/line` status確認
- 署名エラー（401 invalid signature）に対して `LINE_CHANNEL_SECRET` 再設定を指示
- 再デプロイ実施

### 結果
- LINE Developers 検証成功
- `line.follow_unmatched` 記録成功

---

## 5. 顧客紐付け（line_user_id）

### 症状
- 対象顧客に送っても失敗

### 実施対策
- `audit_logs.payload.lineUserId` 抽出
- `customers.line_user_id` 更新
- `consents` のLINE opt-in確認

### 結果
- 紐付け完了（DBで確認済み）

---

## 6. 送信失敗の原因切り分け（API200だが失敗）

### 観測
- Networkの `send` は `200` になるケースあり
- ただし送信トーストは失敗表示
- `notification_jobs`/`notification_logs` で失敗履歴が確認される

### 具体的な失敗履歴
- `MISSING_LINE_ACCESS_TOKEN`
  - `error_message`: `LINE_CHANNEL_ACCESS_TOKEN が未設定のため本番送信できません`
- `HTTP_401`
  - `error_message`: `Authentication failed. Confirm that the access token ...`

### 実施対策・指示
- Vercelに `OPT_OUT_SECRET` 設定指示（未設定で500化するため）
- Vercelに `LINE_CHANNEL_ACCESS_TOKEN` 設定指示
- 再デプロイ指示
- さらに `HTTP_401` について、同一チャネルでのアクセストークン再発行と再設定を指示

### 結果
- `MISSING_LINE_ACCESS_TOKEN` は一度解消
- ただし `HTTP_401` が残存（最終未解決）

---

## 実施した代表SQL/確認項目

## Webhookイベント確認
```sql
select created_at, action, payload
from public.audit_logs
where action like 'line.%'
order by created_at desc
limit 20;
```

## 顧客へのLINE ID紐付け
```sql
update public.customers
set line_user_id = '<U...>'
where name = 'LINEテスト顧客';
```

## 同意状態確認
```sql
select c.id, c.name, c.line_user_id, coalesce(cs.opt_in, null) as line_opt_in
from public.customers c
left join public.consents cs on cs.customer_id = c.id and cs.channel = 'LINE'
where c.name = 'LINEテスト顧客';
```

## 送信ジョブ確認
```sql
select id, created_at, status, channel, last_error
from public.notification_jobs
where created_at > now() - interval '10 minutes'
order by created_at desc;
```

## 送信ログ確認
```sql
select sent_at, result, error_code, error_message
from public.notification_logs
where sent_at > now() - interval '10 minutes'
order by sent_at desc;
```

## テンプレ存在確認
```sql
select template_key, channel, active, version
from public.template_versions
where active = true
order by template_key, channel, version desc;
```

---

## 失敗原因の整理（なぜ成功しないか）

最終時点の直接原因は以下。

1. **環境変数不足が複合で発生**
   - `OPT_OUT_SECRET` 未設定
   - `LINE_CHANNEL_ACCESS_TOKEN` 未設定

2. **設定後のトークン認証失敗**
   - `HTTP_401` が継続
   - 可能性:
     - 別チャネルのトークンを設定
     - 期限切れ/失効トークン
     - 値貼り付け時の余白・改行

3. **UIのエラー可視性不足**
   - フロントの表示が `send failed` に寄り、一次切り分けが難しい
   - 実体は `failedByCode` で判定可能だが、画面上に十分露出していない

---

## 推奨の次アクション（再開時）

1. LINE Developers の **同一チャネル** でアクセストークンを再発行
2. Vercel `LINE_CHANNEL_ACCESS_TOKEN` を上書き（空白なし）
3. `OPT_OUT_SECRET` 存在確認
4. 再デプロイ
5. `/api/notifications/send` Response で `failedByCode` を確認
6. `notification_logs` 最新1件が `SUCCESS` になることを確認

---

## 補足（運用状態）

- 「Webhook疎通」「顧客紐付け」「対象抽出」「テンプレ準備」までは到達済み。
- 送信最終成功を阻害しているのは、実質 `LINE_CHANNEL_ACCESS_TOKEN` の有効性一点に収束している。

