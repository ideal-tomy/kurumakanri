-- =====================================================================
-- LINE 未マッチ一覧ビュー
-- 目的:
--   公式LINEで友だち追加されたが customers.line_user_id に未紐付けの
--   userId を、最新メッセージ本文と併せて一覧表示するためのビュー。
--   customers.line_user_id が更新されると自動で一覧から外れる。
-- =====================================================================

create or replace view public.v_line_unmatched as
with follows as (
  select
    payload->>'lineUserId' as line_user_id,
    min(created_at) as first_follow_at
  from public.audit_logs
  where action = 'line.follow_unmatched'
    and payload ? 'lineUserId'
  group by payload->>'lineUserId'
),
latest_msg as (
  select distinct on (payload->>'lineUserId')
    payload->>'lineUserId' as line_user_id,
    payload->>'text' as last_text,
    created_at as last_message_at
  from public.audit_logs
  where action = 'line.message_unmatched'
    and payload ? 'lineUserId'
  order by payload->>'lineUserId', created_at desc
)
select
  f.line_user_id,
  f.first_follow_at,
  m.last_text,
  m.last_message_at
from follows f
left join latest_msg m on m.line_user_id = f.line_user_id
where f.line_user_id not in (
  select line_user_id from public.customers where line_user_id is not null
);

comment on view public.v_line_unmatched is
  'LINE Webhook で受信したが customers.line_user_id に未紐付けの userId 一覧（最新メッセージ付き）';
