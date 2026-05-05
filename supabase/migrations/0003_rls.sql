-- =====================================================================
-- Row Level Security
-- 方針:
--   - スタッフ（authenticated）は全件 read/write 可（管理画面のための運用ロール）
--   - service_role は全許可（Edge Function / バッチ用）
--   - 公開アクセスは原則禁止。配信停止のような公開導線は service_role + サインドトークン経由で実装
-- =====================================================================

-- staff_profile: 自分の行は全員 read、管理者のみ write
alter table public.staff_profiles enable row level security;

create policy staff_profiles_self_read on public.staff_profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy staff_profiles_admin_all on public.staff_profiles
  for all to authenticated
  using (
    exists (
      select 1 from public.staff_profiles me
      where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
    )
  )
  with check (
    exists (
      select 1 from public.staff_profiles me
      where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
    )
  );

-- ヘルパ: 認証済みかつ active なスタッフかどうか
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid() and active
  );
$$;

-- 業務テーブル: スタッフは read/write 可
alter table public.customers enable row level security;
create policy customers_staff_all on public.customers
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

alter table public.vehicles enable row level security;
create policy vehicles_staff_all on public.vehicles
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

alter table public.service_histories enable row level security;
create policy service_histories_staff_all on public.service_histories
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

alter table public.quotes enable row level security;
create policy quotes_staff_all on public.quotes
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

alter table public.notification_rules enable row level security;
create policy notification_rules_staff_read on public.notification_rules
  for select to authenticated
  using (public.is_active_staff());
create policy notification_rules_admin_write on public.notification_rules
  for all to authenticated
  using (
    exists (
      select 1 from public.staff_profiles me
      where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
    )
  )
  with check (
    exists (
      select 1 from public.staff_profiles me
      where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
    )
  );

alter table public.template_versions enable row level security;
create policy template_versions_staff_read on public.template_versions
  for select to authenticated
  using (public.is_active_staff());
create policy template_versions_admin_write on public.template_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.staff_profiles me
      where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
    )
  )
  with check (
    exists (
      select 1 from public.staff_profiles me
      where me.user_id = auth.uid() and me.role = 'ADMIN' and me.active
    )
  );

alter table public.notification_jobs enable row level security;
create policy notification_jobs_staff_all on public.notification_jobs
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

alter table public.notification_logs enable row level security;
create policy notification_logs_staff_read on public.notification_logs
  for select to authenticated
  using (public.is_active_staff());

alter table public.consents enable row level security;
create policy consents_staff_all on public.consents
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

alter table public.audit_logs enable row level security;
create policy audit_logs_staff_read on public.audit_logs
  for select to authenticated
  using (public.is_active_staff());
