# Shaken Notify

車検期限・オイル交換目安の **一覧表示 + 手動送信** を中心とした運用ツール（LINE / メール対応）。
Supabase（Postgres + Auth）と Next.js App Router で構成します。

## ディレクトリ

| パス | 説明 |
| --- | --- |
| `src/app/` | Next.js ページ・Route Handler (`/api/*`) |
| `supabase/migrations/` | Postgres スキーマ・RLS |
| `supabase/seed.sql` | ローカル開発用デモデータ |
| `supabase/functions/daily-extract/` | 将来の自動送信用 Edge Function（初期 OFF） |
| `docs/` | クライアント向けチェックリスト・マニュアル類 |

## 前提

- Node.js 20+
- Docker Desktop（Supabase CLI のローカル起動用）

## セットアップ（ローカル）

```bash
npm install

# Supabase CLI をインストールしていない場合
# npm i -g supabase

cp .env.example .env.local   # Windows はコピーでも可

# Supabase をローカル起動しマイグレーション + seed を適用
supabase start
supabase db reset   # migrations + seed.sql

# anon / service_role キーを .env.local に転記（supabase status で表示）

npm run dev
```

ブラウザ: http://localhost:3000

## セットアップ（Supabaseクラウド / 初心者向け）

### 1) API URL とキーを設定

1. Supabase で対象プロジェクトを開く
2. `Settings` で API URL と公開可能キー（publishable / anon）を確認
3. `.env`（または `.env.local`）に設定

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<公開可能キー>
SUPABASE_SERVICE_ROLE_KEY=<サーバー用キー>
```

注意:
- `NEXT_PUBLIC_SUPABASE_URL` は `https://<project-ref>.supabase.co` のみ（ダッシュボードURLは不可）
- `NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_URL=https://...` のような二重代入は不可

### 2) DBマイグレーションを順番に適用

SQL Editor で以下を **この順番で** 実行してください。

1. `supabase/migrations/0001_init_schema.sql`
2. `supabase/migrations/0002_views_and_helpers.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_audit_logs_insert_policy.sql`
5. `supabase/migrations/0005_priority_tasks.sql`
6. `supabase/migrations/0006_hotfix_priority_and_rls.sql`

## 初回スタッフユーザーの作成

1. `Authentication` -> `Users` でユーザーを作成（メール + パスワード）
2. SQL Editor で `staff_profiles` テーブルがあることを確認

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'staff_profiles';
```

3. `staff_profiles` に行を追加:

```sql
insert into public.staff_profiles (user_id, name, role, active)
values ('<auth.users の UUID>', '管理者', 'ADMIN', true);
```

4. `/login` でログイン。

## ログインできないときの復旧チェック（上から順に）

1. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` の値が正しいか
2. `Authentication -> Users` に対象メールのユーザーが存在するか
3. パスワードが設定済みか（招待だけで未設定だとログイン不可）
4. Email Confirm が ON の場合、確認メールを完了しているか
5. `public.staff_profiles` に対象 `user_id` があり、`active=true` か

確認SQL:

```sql
select user_id, name, role, active
from public.staff_profiles
order by created_at desc;
```

```sql
select public.is_active_staff();
```

## 環境変数（本番）

`.env.example` を参照。最低限:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（Webhook・運用ツールのみ）
- `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`
- `RESEND_API_KEY` / `MAIL_FROM`
- `OPT_OUT_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_OPS_MANAGER_CONTACT`（障害時連絡先表示）

## 週次運用（本番）

- 体制: 担当者1名 + バックアップ1名
- 頻度: 毎週
- ルール:
  - 対応済みは送信対象に含めない
  - 障害時は管理者へ連絡
- 操作:
  1. `/priorities` の「今週の送信候補」を確認
  2. 送信/対応後、手動タスクを完了に更新
  3. `/notifications/logs` で FAILED を再送
  4. 再送でも失敗する場合は管理者へエスカレーション

## スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` / `npm start` | 本番ビルド |
| `npm test` | Vitest 単体テスト |
| `supabase db reset` | DB をマイグレーション + seed で初期化 |

## 優先ワークキュー（新設）

- 画面: `/priorities`
- 用途:
  - 自動抽出（車検/オイルの連絡候補）
  - 手動タスク（電話・フォロー・見積など）
  - 並び替え（優先度 / 時系列）とフィルタ（自動/手動/未完了/完了）
- 操作:
  - 画面上部フォームから手動タスクを追加
  - 一覧行から `着手` / `完了` を更新
  - 顧客リンクや電話リンクから実務へ遷移

## 設計資料

- [要件定義.md](要件定義.md)
- [技術要件.md](技術要件.md)
- `docs/account-checklist.md` … クライアント側アカウント準備（1ページ）
- `docs/acceptance-checklist.md` … 受入会チェックリスト
- `docs/verification-report.md` … 開発側事前確認ログ
- `docs/weekly-ops-runbook.md` … 週次運用手順
- `docs/incident-escalation-flow.md` … 障害時対応フロー
- `docs/production-rehearsal-checklist.md` … 本番移行リハーサル手順

## `files/` からの取り込み方針

- 取り込む: 通知運用フローの説明、初学者向けの操作ガイド
- 取り込まない: 現行構成と不整合な import/path 指定、重複判定が異なる実装
- 本リポジトリでは必ず `src/app` / `src/lib` / `supabase/migrations` の現行構成に合わせる
