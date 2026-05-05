-- ============================================================
-- 板金屋向け顧客管理システム 初期スキーマ
-- ============================================================

-- 拡張機能の有効化（cronはSupabase Dashboardで有効化する場合あり）
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. 顧客テーブル
-- ============================================================
create table customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                     -- 氏名
  name_kana text,                         -- フリガナ
  phone text,                             -- 電話番号
  email text,                             -- メール（任意）
  address text,                           -- 住所
  postal_code text,                       -- 郵便番号
  line_user_id text unique,               -- LINE user_id（フェーズ3で使用）
  line_friend_added_at timestamptz,       -- LINE友だち追加日時
  notification_preference text default 'phone'
    check (notification_preference in ('line', 'phone', 'sms', 'mail')),
  notes text,                             -- 自由メモ
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_customers_name_kana on customers(name_kana);
create index idx_customers_phone on customers(phone);
create index idx_customers_line_user_id on customers(line_user_id);

-- ============================================================
-- 2. 車両テーブル（1顧客が複数台所有可能）
-- ============================================================
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  plate_number text not null,             -- ナンバー（例: 品川500あ1234）
  maker text,                             -- メーカー（トヨタ、ホンダ等）
  model text,                             -- 車種（プリウス等）
  model_code text,                        -- 型式
  color text,                             -- 色
  vin text,                               -- 車台番号
  first_registration_date date,           -- 初年度登録年月
  inspection_expiry_date date,            -- 車検満了日 ★重要
  insurance_expiry_date date,             -- 自賠責満了日
  last_oil_change_date date,              -- 最終オイル交換日
  last_oil_change_mileage integer,        -- 最終オイル交換時走行距離(km)
  current_mileage integer,                -- 直近確認の走行距離(km)
  current_mileage_date date,              -- 走行距離確認日
  avg_monthly_mileage integer default 833,-- 平均月間走行距離(km) デフォルト=年1万km
  last_visit_date date,                   -- 最終来店日
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vehicles_customer_id on vehicles(customer_id);
create index idx_vehicles_plate_number on vehicles(plate_number);
create index idx_vehicles_inspection_expiry on vehicles(inspection_expiry_date);

-- ============================================================
-- 3. 整備履歴テーブル
-- ============================================================
create table service_records (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  service_type text not null
    check (service_type in ('inspection', 'oil_change', 'tire', 'repair', 'other')),
  service_date date not null,
  mileage_at_service integer,             -- 実施時走行距離
  next_recommended_date date,             -- 次回推奨日
  next_recommended_mileage integer,       -- 次回推奨走行距離
  cost integer,                           -- 費用（円）
  notes text,
  created_at timestamptz default now()
);

create index idx_service_records_vehicle_id on service_records(vehicle_id);
create index idx_service_records_service_date on service_records(service_date desc);

-- ============================================================
-- 4. 通知ログテーブル
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  notification_type text not null
    check (notification_type in (
      'inspection_6m', 'inspection_3m', 'inspection_1m',
      'oil_change', 'insurance', 'other'
    )),
  recipient_type text not null
    check (recipient_type in ('staff', 'customer')),
  channel text not null
    check (channel in ('line', 'sms', 'email')),
  status text default 'pending'
    check (status in ('pending', 'sent', 'failed', 'acknowledged')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  message_content text,
  error_message text,
  created_at timestamptz default now()
);

create index idx_notifications_customer_id on notifications(customer_id);
create index idx_notifications_status on notifications(status);
create index idx_notifications_scheduled_at on notifications(scheduled_at);

-- 同じ通知の重複送信防止のためのユニーク制約
-- (同じ車両 × 同じ通知種別 × 同じ予定日は1回のみ)
create unique index idx_notifications_unique on notifications(
  vehicle_id, notification_type, (scheduled_at::date)
) where status != 'failed';

-- ============================================================
-- 5. updated_at 自動更新トリガー
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_customers_updated_at
  before update on customers
  for each row execute function update_updated_at_column();

create trigger update_vehicles_updated_at
  before update on vehicles
  for each row execute function update_updated_at_column();

-- ============================================================
-- 6. 連絡対象を返すビュー（毎朝の通知用）
-- ============================================================
create or replace view daily_notification_targets as
with vehicle_with_predictions as (
  select
    v.id as vehicle_id,
    v.customer_id,
    v.plate_number,
    v.maker,
    v.model,
    v.inspection_expiry_date,
    v.last_oil_change_date,
    v.last_oil_change_mileage,
    v.current_mileage,
    v.current_mileage_date,
    v.avg_monthly_mileage,
    -- オイル交換予測：前回交換時から経過した月数 × 月間平均走行 + 前回時走行距離
    case
      when v.last_oil_change_mileage is not null
       and v.last_oil_change_date is not null
      then v.last_oil_change_mileage +
           (extract(epoch from (now() - v.last_oil_change_date::timestamp)) / (86400 * 30)
            * v.avg_monthly_mileage)::integer
      else null
    end as predicted_current_mileage,
    -- オイル交換まで何km残っているか
    case
      when v.last_oil_change_mileage is not null
       and v.last_oil_change_date is not null
      then 5000 - (
        (extract(epoch from (now() - v.last_oil_change_date::timestamp)) / (86400 * 30)
         * v.avg_monthly_mileage)::integer
      )
      else null
    end as oil_change_km_remaining
  from vehicles v
)
select
  c.id as customer_id,
  c.name as customer_name,
  c.phone,
  c.notification_preference,
  v.vehicle_id,
  v.plate_number,
  v.maker,
  v.model,
  v.inspection_expiry_date,
  v.predicted_current_mileage,
  v.oil_change_km_remaining,
  -- 通知種別判定
  case
    when v.inspection_expiry_date - current_date between 175 and 185 then 'inspection_6m'
    when v.inspection_expiry_date - current_date between 85 and 95 then 'inspection_3m'
    when v.inspection_expiry_date - current_date between 25 and 35 then 'inspection_1m'
    when v.oil_change_km_remaining is not null
     and v.oil_change_km_remaining between 0 and 500 then 'oil_change'
    else null
  end as notification_type,
  -- 車検まで何日か
  v.inspection_expiry_date - current_date as days_until_inspection
from vehicle_with_predictions v
join customers c on c.id = v.customer_id
where
  -- 車検通知のいずれかに該当
  (v.inspection_expiry_date - current_date between 175 and 185)
  or (v.inspection_expiry_date - current_date between 85 and 95)
  or (v.inspection_expiry_date - current_date between 25 and 35)
  -- またはオイル交換通知に該当
  or (v.oil_change_km_remaining between 0 and 500);

-- ============================================================
-- Row Level Security（ログイン中スタッフのみアクセス可能に）
-- ============================================================
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table service_records enable row level security;
alter table notifications enable row level security;

create policy "authenticated users can do anything on customers"
  on customers for all to authenticated using (true) with check (true);
create policy "authenticated users can do anything on vehicles"
  on vehicles for all to authenticated using (true) with check (true);
create policy "authenticated users can do anything on service_records"
  on service_records for all to authenticated using (true) with check (true);
create policy "authenticated users can do anything on notifications"
  on notifications for all to authenticated using (true) with check (true);
