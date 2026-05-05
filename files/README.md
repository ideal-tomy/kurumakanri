# 板金屋向け 顧客管理システム（フェーズ1）

スタッフ向けに毎朝LINEで「本日の連絡対象リスト」を送る、顧客・車両管理システム。

## 構成

- **フロント**: Next.js 14 (App Router)
- **DB / Auth**: Supabase
- **通知**: LINE Messaging API
- **スケジューラ**: Vercel Cron（毎日6:00 JST = UTC 21:00 を想定）

## セットアップ手順

### 1. Supabase プロジェクトを作る

1. https://supabase.com/ でプロジェクトを新規作成
2. SQL Editor で `supabase/migrations/001_initial_schema.sql` を実行
3. Project Settings → API から以下をコピー
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`（サーバー側のみ使用）

### 2. LINE 公式アカウントを作る

1. https://www.lycbiz.com/jp/ で LINE 公式アカウントを開設（無料プランでOK）
2. https://developers.line.biz/console/ で同じアカウントの Messaging API チャネルを作成
3. **Messaging API設定** タブで以下を取得・設定
   - Channel access token (long-lived) を発行 → `LINE_CHANNEL_ACCESS_TOKEN`
   - Channel secret → `LINE_CHANNEL_SECRET`
4. 「応答メッセージ」を OFF に（自動応答が邪魔になるため）

### 3. スタッフのLINE user_idを取得する

これが少し手間なステップ。

1. 上で作ったLINE公式アカウントを、スタッフのスマホで友だち追加
2. 一時的にWebhookエンドポイント（簡易なものでOK）を立てて `event.source.userId` をログに出す
3. スタッフが何かメッセージを送るとログに `Uxxxxxxx...` の形式のIDが出てくる
4. このIDを `LINE_STAFF_USER_IDS` にカンマ区切りで設定

または最初は管理者1人で動作確認 → スタッフ追加、の流れでもOK。

### 4. Vercelにデプロイ

```bash
npm install
vercel --prod
```

環境変数（`.env.example` 参照）をVercelダッシュボードで設定。

`vercel.json` のCron設定により、毎朝6:00 JSTに `/api/cron/daily-notify` が叩かれる。

### 5. 動作確認

1. `/customers/new` から顧客を1人登録（車検満了日を「30日後」に設定）
2. 手動でCron叩く: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/daily-notify`
3. スタッフのLINEに通知が届けばOK

## 通知ロジック

`daily_notification_targets` ビューで判定。

| 通知種別 | 条件 |
|---------|------|
| 車検 6ヶ月前 | 車検満了日まで 175〜185日 |
| 車検 3ヶ月前 | 車検満了日まで 85〜95日 |
| 車検 1ヶ月前 | 車検満了日まで 25〜35日 |
| オイル交換目安 | 前回交換時走行距離 + 月平均×経過月数 が 4500〜5000kmに到達 |

オイル交換予測は、紙からの移行直後はデータが薄いので
`avg_monthly_mileage` のデフォルト833km(年1万km)を使う。
来店のたびに `current_mileage` と `current_mileage_date` を更新していくと精度が上がる。

## 次のフェーズに向けて

- フェーズ2: 通知履歴UI、ステータス管理（連絡済み/予約済み/完了）、走行距離履歴
- フェーズ3: 顧客本人へのLINE通知、友だち追加フロー、QR印刷物
- 将来: タスク管理、請求書発行、整備記録の自動入力（OCR）

## 紙からの移行のヒント

最初は手入力でしんどいので、以下を検討:
- CSVインポート機能（Excelで一括入力 → 取込）
- スマホで顧客カード撮影 → OCR読み取り（Google Vision API）
- 必須項目だけのクイック登録モード（氏名 + ナンバー + 車検満了日のみ）

来店した顧客から優先的に登録していく運用がオススメ。
すべての顧客を一気に登録しようとせず、自然と網羅していく。
