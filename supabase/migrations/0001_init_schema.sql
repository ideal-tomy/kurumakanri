-- =====================================================================
-- Shaken Notify 初期スキーマ
-- - 顧客 / 車両 / 整備履歴 / 見積
-- - 通知ルール / ジョブ / ログ / 配信同意
-- - 監査ログ / スタッフプロフィール
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ----- 列挙型 -----
create type customer_status as enum ('ACTIVE', 'INACTIVE', 'OPTED_OUT');
create type notification_channel as enum ('LINE', 'MAIL');
create type notification_job_status as enum ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
create type notification_log_result as enum ('SUCCESS', 'FAILED', 'BOUNCED', 'COMPLAINED');
create type quote_status as enum ('DRAFT', 'ISSUED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
create type rule_kind as enum ('SHAKEN_DAYS_BEFORE', 'OIL_KM_INTERVAL');
create type user_role as enum ('ADMIN', 'STAFF');

-- ----- スタッフプロフィール（auth.users と 1:1） -----
create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role user_role not null default 'STAFF',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- 顧客 -----
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  furigana text,
  phone text,
  email text,
  line_user_id text unique,
  status customer_status not null default 'ACTIVE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_status_idx on public.customers (status);
create index customers_email_idx on public.customers (lower(email));

-- ----- 車両 -----
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  maker text not null,
  model text not null,
  plate text not null,
  vin text,
  inspection_expire_date date not null,
  initial_mileage integer not null default 0,
  initial_mileage_recorded_at date not null default current_date,
  monthly_avg_km integer,                -- 顧客ヒアリングで入力する月平均走行km
  last_oil_change_mileage integer,       -- 直近のオイル交換時走行距離
  last_oil_change_at date,
  oil_interval_km integer not null default 4000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_customer_idx on public.vehicles (customer_id);
create index vehicles_inspection_expire_idx on public.vehicles (inspection_expire_date);

-- ----- 整備履歴 -----
create table public.service_histories (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  title text not null,
  performed_at date not null,
  mileage integer,
  notes text,
  created_at timestamptz not null default now()
);

create index service_histories_vehicle_idx on public.service_histories (vehicle_id, performed_at desc);

-- ----- 見積 -----
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  quote_no text unique,
  status quote_status not null default 'DRAFT',
  total_amount integer not null default 0,
  legal_items jsonb not null default '[]'::jsonb,
  service_items jsonb not null default '[]'::jsonb,
  notes text,
  valid_until date,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_vehicle_idx on public.quotes (vehicle_id);

-- ----- 通知ルール -----
create table public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,         -- shaken_180days / shaken_90days / oil_4000km
  rule_name text not null,
  kind rule_kind not null,
  trigger_days_before integer,           -- SHAKEN_DAYS_BEFORE 用
  trigger_oil_interval_km integer,       -- OIL_KM_INTERVAL 用
  channels notification_channel[] not null default array['LINE','MAIL']::notification_channel[],
  template_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- 通知テンプレート -----
create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  channel notification_channel not null,
  subject text,
  content text not null,
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_key, channel, version)
);

create index template_versions_active_idx on public.template_versions (template_key, channel, active);

-- ----- 通知ジョブ -----
create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  rule_id uuid references public.notification_rules(id) on delete set null,
  channel notification_channel not null,
  template_key text not null,
  scheduled_at timestamptz not null default now(),
  status notification_job_status not null default 'PENDING',
  attempts integer not null default 0,
  idempotency_key text not null unique,
  payload jsonb,
  last_error text,
  requested_by uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_jobs_status_idx on public.notification_jobs (status, scheduled_at);
create index notification_jobs_customer_idx on public.notification_jobs (customer_id, scheduled_at desc);

-- ----- 通知ログ -----
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  result notification_log_result not null,
  error_code text,
  error_message text,
  payload jsonb,
  sent_at timestamptz not null default now()
);

create index notification_logs_job_idx on public.notification_logs (job_id, sent_at desc);
create index notification_logs_result_idx on public.notification_logs (result, sent_at desc);

-- ----- 配信同意 -----
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel notification_channel not null,
  opt_in boolean not null default true,
  opt_out_at timestamptz,
  source text,
  updated_at timestamptz not null default now(),
  unique (customer_id, channel)
);

create index consents_customer_idx on public.consents (customer_id, channel);

-- ----- 監査ログ -----
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.staff_profiles(user_id) on delete set null,
  action text not null,
  resource text not null,
  resource_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_resource_idx on public.audit_logs (resource, resource_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ----- updated_at 自動更新 -----
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger trg_quotes_updated before update on public.quotes
  for each row execute function public.set_updated_at();
create trigger trg_rules_updated before update on public.notification_rules
  for each row execute function public.set_updated_at();
create trigger trg_jobs_updated before update on public.notification_jobs
  for each row execute function public.set_updated_at();
create trigger trg_consents_updated before update on public.consents
  for each row execute function public.set_updated_at();
create trigger trg_staff_updated before update on public.staff_profiles
  for each row execute function public.set_updated_at();
