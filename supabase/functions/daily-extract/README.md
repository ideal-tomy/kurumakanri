# daily-extract Edge Function

通知対象を抽出して `notification_jobs` に投入するための Edge Function。
**初期は OFF（cron 未登録）の状態で配置されている**。

## 有効化手順（運用合意後）

1. クライアントの本番 Supabase プロジェクトで環境変数を設定:
   - `AUTO_SEND_ENABLED=true`
   - `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
2. デプロイ:
   ```bash
   supabase functions deploy daily-extract --project-ref <project-ref>
   ```
3. Scheduled Function（cron）を登録:
   ```bash
   supabase functions deploy daily-extract --schedule "0 23 * * *"
   ```
   （UTC 23:00 = JST 朝 8:00）
4. 監査ログ `audit_logs.action='edge.daily_extract'` に summary が記録されることを確認。

## OFF のまま検証する

- `AUTO_SEND_ENABLED=false` または未設定で実行すると、抽出件数のみカウントして
  `notification_jobs` には投入しない（dry-run）。
- これにより、運用前に対象件数が見込みどおりかを確認できる。
