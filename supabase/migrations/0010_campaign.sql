-- キャンペーン一斉送信の履歴 + notification_jobs への紐付け

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  customer_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0
);

alter table public.notification_jobs
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists notification_jobs_campaign_idx on public.notification_jobs (campaign_id);

alter table public.campaigns enable row level security;

create policy campaigns_staff_all on public.campaigns
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

grant select, insert, update, delete on public.campaigns to authenticated;
