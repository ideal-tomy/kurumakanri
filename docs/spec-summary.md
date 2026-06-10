# Shaken Notify 仕様サマリ（v1.0）

## 目的

オートサービス店向けに、車検期限・オイル交換タイミングを **一覧で把握し、スタッフが確認したうえで手動送信** できるようにする。
将来的な **自動送信** に備えたジョブ構造・Edge Function を同梱するが、初期リリースでは無効。

## ユーザーと規模

- スタッフ（ADMIN / STAFF）が管理画面を利用。
- 顧客は LINE / メールのリンクから署名付きポータル `/p/:token`（お車・見積概要・整備履歴）、見積詳細 `/q/:token`、配信停止 `/u/:token` にアクセス。レガシー `/me?cid=` は後方互換。
- 想定最大 **200 名規模 / 1 店舗**。

## 主要機能

| 機能 | 概要 |
| --- | --- |
| 認証 | Supabase Auth + `staff_profiles` による RBAC |
| 顧客・車両 CRUD | 月平均走行 km・オイル間隔などを保持 |
| 抽出リスト | 車検 180 日前 / 90 日前 / オイル目安 |
| 手動送信 | LINE / メール / 両方、個別・一括 |
| 冪等キー | 同日・同ルール・同チャネルの二重送信防止 |
| 自動見積 | 法定費用固定 + 標準整備 + 備考定型 |
| 監査ログ | 主要操作を `audit_logs` に記録 |
| Edge Function | `daily-extract`（`AUTO_SEND_ENABLED=false` で dry-run のみ） |

## 技術スタック

- Next.js 14 App Router + TypeScript
- Supabase Postgres + Row Level Security + Auth
- LINE Messaging API（Push）
- Resend（メール、Webhook でバウンス処理）

## 非機能

- 個人情報は RLS でスタッフのみアクセス。
- ログ・監査で送信結果を追跡可能。
- 単体テスト（Vitest）で抽出ロジック・見積計算・テンプレ描画を検証。

## 明示的な未対応（将来検討）

- AI による文面自動生成・応答分類
- 複数店舗ロール分割
- ファイルアップロード（車検証スキャン等）
