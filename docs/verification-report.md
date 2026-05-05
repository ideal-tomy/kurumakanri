# 実装側での事前確認記録（verify-onsite）

> 本文書はクライアント受入会の代替ではなく、開発側で実行できる自動チェック／静的確認の結果です。
> 実ネットワーク送信・DNS・LINE 実機などは **本番／検証環境** で `acceptance-checklist.md` に沿って実施してください。

| 確認項目 | 手段 | 結果 | メモ |
| --- | --- | --- | --- |
| TypeScript 型チェック | `npx tsc --noEmit` | OK | |
| Next.js 本番ビルド | `npx next build` | OK | middleware / Route Handler を含む |
| 単体テスト | `npx vitest run` | OK | mileage / rules / quote / template / idempotency / optout |
| `audit_logs` への INSERT（設計） | RLS ポリシー追加 (`0004_audit_logs_insert_policy.sql`) | OK | 旧状態では authenticated INSERT が拒否されていたため修正 |
| 顧客詳細の見積読込 | `customers/[id]` のクエリ順序修正 | OK | `.in()` に空配列を渡さないよう変更 |
| `/me` の見積読込 | `vehicle_id IN (...)` に統一 | OK | 複数台でも最新 1 件を取得 |
| 配信履歴 JOIN | Supabase のネスト select をやめ 2 クエリに分割 | OK | 実行時エラー回避 |

## 未実施（環境依存）

- LINE / メールの実送信（トークン・DNS 未設定ではモック送信のみ）
- Playwright E2E（`npm exec playwright install` 後、`npm run dev` 起動状態で `npx playwright test`）
- Supabase `db reset`（ローカル Docker が必要）
