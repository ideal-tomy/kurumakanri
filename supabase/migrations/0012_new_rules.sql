-- 車検30日前・期限切れ + 顧客 overview 拡張 + 優先キュー + テンプレ

-- ----- v_customer_overview（最終LINE・次フェーズ・最新見積） -----
create or replace view public.v_customer_overview as
select
  c.id as customer_id,
  c.name,
  c.furigana,
  c.phone,
  c.email,
  c.line_user_id,
  c.status,
  v.id as vehicle_id,
  v.maker,
  v.model,
  v.plate,
  v.vin,
  v.inspection_expire_date,
  v.initial_mileage,
  v.initial_mileage_recorded_at,
  v.monthly_avg_km,
  v.last_oil_change_mileage,
  v.last_oil_change_at,
  v.oil_interval_km,
  public.estimated_mileage(v.initial_mileage, v.initial_mileage_recorded_at, v.monthly_avg_km) as estimated_mileage,
  public.days_until(v.inspection_expire_date) as days_until_inspection,
  las.last_line_at as last_line_sent_at,
  case
    when public.days_until(v.inspection_expire_date) < 0 then '車検満了後フォロー'
    when public.days_until(v.inspection_expire_date) <= 30 then '車検1ヶ月前'
    when public.days_until(v.inspection_expire_date) between 60 and 100 then '車検3か月前'
    when public.days_until(v.inspection_expire_date) between 150 and 210 then '車検半年前'
    else null
  end as next_notification_rule,
  v.inspection_expire_date as next_notification_due_at,
  lq.quote_id as latest_quote_id,
  lq.grand_total as latest_quote_grand_total
from public.customers c
left join public.vehicles v on v.customer_id = c.id
left join lateral (
  select q.id as quote_id, coalesce(q.grand_total, q.total_amount, 0) as grand_total
  from public.quotes q
  where q.vehicle_id = v.id
  order by q.issued_at desc nulls last, q.created_at desc
  limit 1
) lq on true
left join lateral (
  select max(nl.sent_at) as last_line_at
  from public.notification_logs nl
  inner join public.notification_jobs nj on nj.id = nl.job_id
  where nj.customer_id = c.id
    and nj.channel = 'LINE'
    and nl.result = 'SUCCESS'
) las on true;

-- ----- 車検30日前（満了まで0〜30日） -----
create or replace view public.v_targets_shaken_30 as
select o.*
from public.v_customer_overview o
left join public.consents cn_line
  on cn_line.customer_id = o.customer_id and cn_line.channel = 'LINE'
left join public.consents cn_mail
  on cn_mail.customer_id = o.customer_id and cn_mail.channel = 'MAIL'
where o.status = 'ACTIVE'
  and o.vehicle_id is not null
  and o.days_until_inspection between 0 and 30
  and (coalesce(cn_line.opt_in, true) or coalesce(cn_mail.opt_in, true));

-- ----- 期限切れフォロー（満了から1〜90日経過 = days -90..-1） -----
create or replace view public.v_targets_shaken_overdue as
select o.*
from public.v_customer_overview o
left join public.consents cn_line
  on cn_line.customer_id = o.customer_id and cn_line.channel = 'LINE'
left join public.consents cn_mail
  on cn_mail.customer_id = o.customer_id and cn_mail.channel = 'MAIL'
where o.status = 'ACTIVE'
  and o.vehicle_id is not null
  and o.days_until_inspection between -90 and -1
  and (coalesce(cn_line.opt_in, true) or coalesce(cn_mail.opt_in, true));

-- ----- v_priority_queue 再定義 -----
create or replace view public.v_priority_queue as
with auto_shaken_90 as (
  select
    concat('AUTO:SHAKEN90:', customer_id::text, ':', coalesce(vehicle_id::text, 'NONE')) as queue_id,
    'AUTO'::text as source_type,
    null::uuid as task_id,
    'CALL'::task_type as task_type,
    'OPEN'::task_status as status,
    case
      when coalesce(days_until_inspection, 9999) <= 30 then 5
      when coalesce(days_until_inspection, 9999) <= 60 then 4
      else 3
    end::smallint as priority,
    coalesce(
      (current_date + make_interval(days => greatest(coalesce(days_until_inspection, 0), 0)))::timestamptz,
      now()
    ) as sort_due_at,
    null::timestamptz as completed_at,
    now() as created_at,
    format('車検期限が近い顧客へ連絡: %s 様', name) as title,
    format('%s / %s %s / 残り%s日', coalesce(plate, '-'), coalesce(maker, '-'), coalesce(model, '-'), coalesce(days_until_inspection, 0)) as description,
    customer_id,
    vehicle_id,
    name as customer_name,
    phone,
    plate
  from public.v_targets_shaken_90
),
auto_shaken_180 as (
  select
    concat('AUTO:SHAKEN180:', customer_id::text, ':', coalesce(vehicle_id::text, 'NONE')) as queue_id,
    'AUTO'::text as source_type,
    null::uuid as task_id,
    'FOLLOWUP'::task_type as task_type,
    'OPEN'::task_status as status,
    2::smallint as priority,
    coalesce(
      (current_date + make_interval(days => greatest(coalesce(days_until_inspection, 0), 0)))::timestamptz,
      now()
    ) as sort_due_at,
    null::timestamptz as completed_at,
    now() as created_at,
    format('車検半年前フォロー: %s 様', name) as title,
    format('%s / %s %s / 残り%s日', coalesce(plate, '-'), coalesce(maker, '-'), coalesce(model, '-'), coalesce(days_until_inspection, 0)) as description,
    customer_id,
    vehicle_id,
    name as customer_name,
    phone,
    plate
  from public.v_targets_shaken_180
),
auto_shaken_30 as (
  select
    concat('AUTO:SHAKEN30:', customer_id::text, ':', coalesce(vehicle_id::text, 'NONE')) as queue_id,
    'AUTO'::text as source_type,
    null::uuid as task_id,
    'CALL'::task_type as task_type,
    'OPEN'::task_status as status,
    case
      when coalesce(days_until_inspection, 9999) <= 7 then 5
      when coalesce(days_until_inspection, 9999) <= 14 then 4
      else 3
    end::smallint as priority,
    coalesce(
      (current_date + make_interval(days => greatest(coalesce(days_until_inspection, 0), 0)))::timestamptz,
      now()
    ) as sort_due_at,
    null::timestamptz as completed_at,
    now() as created_at,
    format('車検1ヶ月前リマインド: %s 様', name) as title,
    format('%s / %s %s / 残り%s日', coalesce(plate, '-'), coalesce(maker, '-'), coalesce(model, '-'), coalesce(days_until_inspection, 0)) as description,
    customer_id,
    vehicle_id,
    name as customer_name,
    phone,
    plate
  from public.v_targets_shaken_30
),
auto_overdue as (
  select
    concat('AUTO:OVERDUE:', customer_id::text, ':', coalesce(vehicle_id::text, 'NONE')) as queue_id,
    'AUTO'::text as source_type,
    null::uuid as task_id,
    'FOLLOWUP'::task_type as task_type,
    'OPEN'::task_status as status,
    case
      when coalesce(days_until_inspection, 0) >= -14 then 5
      when coalesce(days_until_inspection, 0) >= -30 then 4
      else 3
    end::smallint as priority,
    coalesce(
      (current_date + make_interval(days => greatest(coalesce(days_until_inspection, 0), 0)))::timestamptz,
      now()
    ) as sort_due_at,
    null::timestamptz as completed_at,
    now() as created_at,
    format('車検満了後フォロー: %s 様', name) as title,
    format('%s / %s %s / 期限切れ%s日', coalesce(plate, '-'), coalesce(maker, '-'), coalesce(model, '-'), abs(coalesce(days_until_inspection, 0))) as description,
    customer_id,
    vehicle_id,
    name as customer_name,
    phone,
    plate
  from public.v_targets_shaken_overdue
),
auto_oil as (
  select
    concat('AUTO:OIL:', customer_id::text, ':', coalesce(vehicle_id::text, 'NONE')) as queue_id,
    'AUTO'::text as source_type,
    null::uuid as task_id,
    'CALL'::task_type as task_type,
    'OPEN'::task_status as status,
    case
      when coalesce(oil_overage_km, 0) >= 500 then 5
      when coalesce(oil_overage_km, 0) >= 200 then 4
      else 3
    end::smallint as priority,
    now() as sort_due_at,
    null::timestamptz as completed_at,
    now() as created_at,
    format('オイル交換目安連絡: %s 様', name) as title,
    format('%s / %s %s / 超過目安%skm', coalesce(plate, '-'), coalesce(maker, '-'), coalesce(model, '-'), coalesce(oil_overage_km, 0)) as description,
    customer_id,
    vehicle_id,
    name as customer_name,
    phone,
    plate
  from public.v_targets_oil
),
manual_tasks as (
  select
    concat('MANUAL:', t.id::text) as queue_id,
    'MANUAL'::text as source_type,
    t.id as task_id,
    t.task_type,
    t.status,
    t.priority,
    coalesce(t.due_at, t.scheduled_at, t.created_at) as sort_due_at,
    t.completed_at,
    t.created_at,
    t.title,
    coalesce(t.description, '') as description,
    t.customer_id,
    t.vehicle_id,
    c.name as customer_name,
    c.phone,
    v.plate
  from public.staff_tasks t
  left join public.customers c on c.id = t.customer_id
  left join public.vehicles v on v.id = t.vehicle_id
)
select * from auto_shaken_90
union all
select * from auto_shaken_180
union all
select * from auto_shaken_30
union all
select * from auto_overdue
union all
select * from auto_oil
union all
select * from manual_tasks;

-- ----- 新ルール用テンプレ（v1 で投入。dispatcher 変数は v3 と同様） -----
insert into public.template_versions (template_key, channel, subject, content, version, active)
values
  ('shaken_30days', 'LINE', null,
'【車検1ヶ月前】ご予約のご案内

{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）の車検満了まで残り{{daysLeft}}日です。

▼ お見積合計（概算）: {{grandTotal}}
有効期限: {{validUntil}}
詳細: {{quoteUrl}}

▼ 法定費用概算：計 ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▶ 整備費用一覧
{{maintenanceInfoUrl}}

お早めのご予約をお待ちしております。', 1, true),

  ('shaken_30days', 'MAIL', '【車検1ヶ月前】ご予約のご案内',
'{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）の車検満了まで残り{{daysLeft}}日です。

▼ お見積合計（概算）: {{grandTotal}}
有効期限: {{validUntil}}
詳細: {{quoteUrl}}

▼ 法定費用概算：計 ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▶ 整備費用一覧
{{maintenanceInfoUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 1, true),

  ('shaken_overdue', 'LINE', null,
'【車検満了後のご案内】

{{name}} 様

{{vehicleName}}（{{plate}}）は車検満了日を過ぎております（{{daysLeft}}日経過）。

▼ お見積合計（概算）: {{grandTotal}}
詳細: {{quoteUrl}}

早めのご来店をお願いいたします。', 1, true),

  ('shaken_overdue', 'MAIL', '【車検満了後のご案内】',
'{{name}} 様

{{vehicleName}}（{{plate}}）は車検満了日を過ぎております。

▼ お見積合計（概算）: {{grandTotal}}
詳細: {{quoteUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 1, true)
on conflict (template_key, channel, version) do nothing;
