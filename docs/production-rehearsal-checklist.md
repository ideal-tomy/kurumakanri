# 本番移行リハーサルチェックリスト

クライアント側でアカウントを新規作成した前提で、ゼロから復旧できることを確認する。

## 1. Supabase

1. 新規プロジェクト作成
2. 以下を順番実行
   - `supabase/migrations/0001_init_schema.sql`
   - `supabase/migrations/0002_views_and_helpers.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_audit_logs_insert_policy.sql`
   - `supabase/migrations/0005_priority_tasks.sql`
   - `supabase/migrations/0006_hotfix_priority_and_rls.sql`
3. `staff_profiles` に管理者ユーザーを投入
4. `/login` 可能か確認

## 2. Vercel

1. 環境変数投入
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_OPS_MANAGER_CONTACT`
2. 再デプロイ
3. `/login` と `/dashboard` 表示確認

## 3. LINE

1. Messaging API チャネル作成
2. Webhook URL を `/api/webhooks/line` に設定
3. Webhook 有効化
4. テストアカウントで友だち追加
5. 管理画面からLINE送信して到達確認

## 4. 運用導線

1. `/priorities` の `今週の送信候補` 件数を確認
2. 対象1件を送信
3. `/notifications/logs` で結果確認
4. 失敗1件を再送し、復旧手順を確認

## 5. 合格条件

- ログインできる
- LINE送信が成功する
- 失敗時に原因が識別できる
- 再送が成功する
