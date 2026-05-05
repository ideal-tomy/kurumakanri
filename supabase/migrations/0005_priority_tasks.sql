-- =====================================================================
-- 優先ワークキュー: 手動タスク + 自動候補統合ビュー
-- =====================================================================

create type task_type as enum ('CALL', 'FOLLOWUP', 'QUOTE', 'OTHER');
create type task_status as enum ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

create table public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_type task_type not null default 'OTHER',
  status task_status not null default 'OPEN',
  priority smallint not null default 3 check (priority between 1 and 5),
  due_at timestamptz,
  scheduled_at timestamptz,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_to uuid references public.staff_profiles(user_id) on delete set null,
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_tasks_status_idx on public.staff_tasks (status, due_at);
create index staff_tasks_assigned_idx on public.staff_tasks (assigned_to, status, due_at);
create index staff_tasks_customer_idx on public.staff_tasks (customer_id, created_at desc);
create index staff_tasks_priority_idx on public.staff_tasks (priority desc, due_at asc);

create trigger trg_staff_tasks_updated before update on public.staff_tasks
  for each row execute function public.set_updated_at();

alter table public.staff_tasks enable row level security;

create policy staff_tasks_read on public.staff_tasks
  for select to authenticated
  using (
    public.is_active_staff()
    and (
      assigned_to is null
      or assigned_to = auth.uid()
      or exists (
        select 1
        from public.staff_profiles me
        where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
      )
    )
  );

create policy staff_tasks_insert on public.staff_tasks
  for insert to authenticated
  with check (
    public.is_active_staff()
    and created_by = auth.uid()
    and (
      assigned_to is null
      or assigned_to = auth.uid()
      or exists (
        select 1
        from public.staff_profiles me
        where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
      )
    )
  );

create policy staff_tasks_update on public.staff_tasks
  for update to authenticated
  using (
    public.is_active_staff()
    and (
      assigned_to is null
      or assigned_to = auth.uid()
      or exists (
        select 1
        from public.staff_profiles me
        where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
      )
    )
  )
  with check (
    public.is_active_staff()
    and (
      assigned_to is null
      or assigned_to = auth.uid()
      or exists (
        select 1
        from public.staff_profiles me
        where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
      )
    )
  );

create policy staff_tasks_delete on public.staff_tasks
  for delete to authenticated
  using (
    public.is_active_staff()
    and (
      assigned_to is null
      or assigned_to = auth.uid()
      or exists (
        select 1
        from public.staff_profiles me
        where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
      )
    )
  );

grant select, insert, update, delete on table public.staff_tasks to authenticated;

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
select * from auto_oil
union all
select * from manual_tasks;

grant select on public.v_priority_queue to authenticated;
