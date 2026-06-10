# アカウントと権限（RBAC）

## Supabase Auth

- Supabase の **メール / パスワード認証** を利用。
- ユーザー作成後、`staff_profiles` テーブルに 1 行紐付けないとログインできません（`/login?error=no-profile`）。

## `staff_profiles.role`

| ロール | 説明 |
| --- | --- |
| `ADMIN` | すべてのスタッフ機能 + `staff_profiles` / `notification_rules` / `template_versions` の管理権限（RLS 上は ADMIN のみ書込可） |
| `STAFF` | 日常運用（顧客 CRUD・通知送信・見積生成・ログ閲覧） |

## Row Level Security の要点（実装）

| テーブル | STAFF | ADMIN |
| --- | --- | --- |
| `customers` / `vehicles` / `quotes` … | CRUD | CRUD |
| `notification_jobs` | CRUD | CRUD |
| `notification_logs` | 読取 | 読取 |
| `audit_logs` | 読取 / **書込可（INSERT）** | 同上 |
| `notification_rules` / `template_versions` | 読取 | 読取 + 書込 |

## 顧客側アカウント

- **顧客はログインしない**。署名付きの公開ページのみ利用可能。
  - `/p/:token` — 顧客ポータル（お車の状況・見積概要・整備履歴）。`CUSTOMER_PORTAL_SECRET` で署名。
  - `/q/:token` — 見積詳細・印刷。`QUOTE_SHARE_SECRET` で署名。
  - `/u/:token` — 配信停止。`OPT_OUT_SECRET` で署名。
  - `/me?cid=` — レガシー（後方互換）。新規送信では `/p/` を使用すること。
- ポータル・見積トークンは有効期限付き。流出時も改ざん検知できるが、運用ではリンクの再発行・期限管理に注意してください。

## サービスロールキー

- `SUPABASE_SERVICE_ROLE_KEY` は **サーバー側のみ**（Webhook・顧客向けページ `/p` `/me` `/q` `/u`）。
- ブラウザやモバイルアプリに埋め込まないこと。
