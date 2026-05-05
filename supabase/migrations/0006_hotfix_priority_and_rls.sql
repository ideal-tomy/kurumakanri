-- =====================================================================
-- Hotfix:
-- 1) estimated_mileage の日数計算を修正
-- 2) staff_profiles のRLS再帰を解消
-- 3) v_targets_* ビューを再作成（0002失敗環境向け）
-- =====================================================================

create or replace function public.estimated_mileage(
  initial_mileage integer,
  initial_recorded_at date,
  monthly_avg_km integer,
  as_of date default current_date
)
returns integer
language sql
immutable
as $$
  select coalesce(initial_mileage, 0)
       + greatest(
           0,
           round(
             coalesce(monthly_avg_km, 0)
             * (greatest((as_of - initial_recorded_at), 0)::numeric / 30.4375)
           )::integer
         );
$$;

create or replace function public.days_until(target_date date)
returns integer
language sql
immutable
as $$
  select (target_date - current_date);
$$;

create or replace function public.is_admin_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_profiles
    where user_id = auth.uid() and role = 'ADMIN' and active
  );
$$;

drop policy if exists staff_profiles_admin_all on public.staff_profiles;
drop policy if exists staff_profiles_admin_insert on public.staff_profiles;
drop policy if exists staff_profiles_admin_update on public.staff_profiles;
drop policy if exists staff_profiles_admin_delete on public.staff_profiles;

create policy staff_profiles_admin_insert on public.staff_profiles
  for insert to authenticated
  with check (public.is_admin_staff());

create policy staff_profiles_admin_update on public.staff_profiles
  for update to authenticated
  using (public.is_admin_staff())
  with check (public.is_admin_staff());

create policy staff_profiles_admin_delete on public.staff_profiles
  for delete to authenticated
  using (public.is_admin_staff());

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
  public.days_until(v.inspection_expire_date) as days_until_inspection
from public.customers c
left join public.vehicles v on v.customer_id = c.id;

create or replace view public.v_targets_shaken_180 as
select o.*
from public.v_customer_overview o
left join public.consents cn_line
  on cn_line.customer_id = o.customer_id and cn_line.channel = 'LINE'
left join public.consents cn_mail
  on cn_mail.customer_id = o.customer_id and cn_mail.channel = 'MAIL'
where o.status = 'ACTIVE'
  and o.vehicle_id is not null
  and o.days_until_inspection between 150 and 210
  and (coalesce(cn_line.opt_in, true) or coalesce(cn_mail.opt_in, true));

create or replace view public.v_targets_shaken_90 as
select o.*
from public.v_customer_overview o
left join public.consents cn_line
  on cn_line.customer_id = o.customer_id and cn_line.channel = 'LINE'
left join public.consents cn_mail
  on cn_mail.customer_id = o.customer_id and cn_mail.channel = 'MAIL'
where o.status = 'ACTIVE'
  and o.vehicle_id is not null
  and o.days_until_inspection between 60 and 100
  and (coalesce(cn_line.opt_in, true) or coalesce(cn_mail.opt_in, true));

create or replace view public.v_targets_oil as
select
  o.*,
  coalesce(o.last_oil_change_mileage, o.initial_mileage) + o.oil_interval_km as next_oil_target_km,
  o.estimated_mileage - (coalesce(o.last_oil_change_mileage, o.initial_mileage) + o.oil_interval_km) as oil_overage_km
from public.v_customer_overview o
left join public.consents cn_line
  on cn_line.customer_id = o.customer_id and cn_line.channel = 'LINE'
left join public.consents cn_mail
  on cn_mail.customer_id = o.customer_id and cn_mail.channel = 'MAIL'
where o.status = 'ACTIVE'
  and o.vehicle_id is not null
  and o.estimated_mileage >= coalesce(o.last_oil_change_mileage, o.initial_mileage) + o.oil_interval_km - 200
  and (coalesce(cn_line.opt_in, true) or coalesce(cn_mail.opt_in, true));
