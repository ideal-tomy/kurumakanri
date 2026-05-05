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

- **顧客はログインしない**。`/me?cid=` と署名付き `/u/:token` のみ公開。
- `cid` はスタッフしか原本を知らない想定だが、URL が流出すると概要情報が見えるため、ピンポイント URL は運用ルールで管理してください。

## サービスロールキー

- `SUPABASE_SERVICE_ROLE_KEY` は **サーバー側のみ**（Webhook・一部ページ `/me` `/u`）。
- ブラウザやモバイルアプリに埋め込まないこと。
