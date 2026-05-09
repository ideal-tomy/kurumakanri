-- 見積の税サマリー・車両スペック・法定費用マスタ

-- ----- quotes 税関連（発行時スナップショット）
alter table public.quotes add column if not exists taxable_subtotal_ex_tax integer;
alter table public.quotes add column if not exists tax_amount_10 integer;
alter table public.quotes add column if not exists non_taxable_subtotal integer;
alter table public.quotes add column if not exists grand_total integer;

update public.quotes q
set
  non_taxable_subtotal = coalesce(
    (
      select sum(coalesce((elem->>'amount')::integer, 0))
      from jsonb_array_elements(coalesce(q.legal_items, '[]'::jsonb)) as elem
    ),
    0
  ),
  taxable_subtotal_ex_tax = (
    round(
      coalesce(
        (
          select sum(coalesce((elem->>'amount')::integer, 0))
          from jsonb_array_elements(coalesce(q.service_items, '[]'::jsonb)) as elem
        ),
        0
      )::numeric / 1.1
    )::integer
  ),
  tax_amount_10 = greatest(
    0,
    coalesce(
      (
        select sum(coalesce((elem->>'amount')::integer, 0))
        from jsonb_array_elements(coalesce(q.service_items, '[]'::jsonb)) as elem
      ),
      0
    ) - (
      round(
        coalesce(
          (
            select sum(coalesce((elem->>'amount')::integer, 0))
            from jsonb_array_elements(coalesce(q.service_items, '[]'::jsonb)) as elem
          ),
          0
        )::numeric / 1.1
      )::integer
    )
  ),
  grand_total =
    coalesce(
      (
        select sum(coalesce((elem->>'amount')::integer, 0))
        from jsonb_array_elements(coalesce(q.legal_items, '[]'::jsonb)) as elem
      ),
      0
    ) +
    coalesce(
      (
        select sum(coalesce((elem->>'amount')::integer, 0))
        from jsonb_array_elements(coalesce(q.service_items, '[]'::jsonb)) as elem
      ),
      0
    )
where grand_total is null;

update public.quotes
set grand_total = total_amount
where grand_total is null;

-- ----- vehicles: 車検証相当スペック（JSON）
alter table public.vehicles add column if not exists vehicle_specs jsonb not null default '{}'::jsonb;

-- ----- statutory fee master
create table if not exists public.statutory_fee_rates (
  id uuid primary key default gen_random_uuid(),
  effective_from date not null,
  vehicle_class text not null check (vehicle_class in ('LIGHT', 'STANDARD')),
  jibaiseki_24mo_yen integer not null check (jibaiseki_24mo_yen >= 0),
  weight_tax_yen_standard integer not null check (weight_tax_yen_standard >= 0),
  weight_tax_yen_eco integer not null check (weight_tax_yen_eco >= 0),
  prepaid_inspection_yen integer not null default 2200 check (prepaid_inspection_yen >= 0),
  lane_stamp_yen integer not null default 2300 check (lane_stamp_yen >= 0),
  document_fee_yen integer not null default 770 check (document_fee_yen >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint statutory_fee_rates_effective_vehicle unique (effective_from, vehicle_class)
);

create index if not exists statutory_fee_rates_lookup_idx on public.statutory_fee_rates (vehicle_class, effective_from desc);

alter table public.statutory_fee_rates enable row level security;

create policy statutory_fee_rates_staff_read on public.statutory_fee_rates
  for select to authenticated using (public.is_active_staff());

create policy statutory_fee_rates_admin_write on public.statutory_fee_rates
  for all to authenticated using (public.is_admin_staff()) with check (public.is_admin_staff());

insert into public.statutory_fee_rates (
  effective_from, vehicle_class, jibaiseki_24mo_yen, weight_tax_yen_standard, weight_tax_yen_eco,
  prepaid_inspection_yen, lane_stamp_yen, document_fee_yen, notes
) values
  (
    date '2020-01-01', 'LIGHT', 17290, 8800, 8800,
    2200, 2300, 770,
    '概算デフォルト。実際の税制・車区分に応じて管理画面または SQL で更新してください。'
  ),
  (
    date '2020-01-01', 'STANDARD', 17650, 24600, 15000,
    2200, 2300, 770,
    '概算デフォルト（重量税は非エコ / エコ例）。'
  )
on conflict (effective_from, vehicle_class) do nothing;
