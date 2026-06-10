-- LINEテスト顧客を車検「180日以内」（v_targets_shaken_180: 残日 150〜210）に合わせ、LINE 送信テストがしやすい状態にする。
-- 既存の line_user_id は上書きしない。

do $$
declare
  cid uuid;
  vid uuid;
  line_test_id constant uuid := '10000000-0000-4000-8000-0000000000f1';
begin
  select id into cid from public.customers where name = 'LINEテスト顧客' limit 1;

  if cid is null then
    insert into public.customers (id, name, furigana, phone, email, line_user_id, status, notes)
    values (
      line_test_id,
      'LINEテスト顧客',
      'ライン テストコキャク',
      '090-LINE-0001',
      'line-test@demo.local',
      null,
      'ACTIVE',
      'LINE送信テスト用（車検半年前リスト対象）'
    )
    returning id into cid;
  end if;

  select v.id into vid
  from public.vehicles v
  where v.customer_id = cid
  order by v.created_at
  limit 1;

  if vid is null then
    insert into public.vehicles (
      customer_id, maker, model, plate, vin,
      inspection_expire_date, initial_mileage, initial_mileage_recorded_at,
      monthly_avg_km, last_oil_change_mileage, last_oil_change_at, oil_interval_km
    )
    values (
      cid, 'トヨタ', 'プリウス', '横浜 399 て 9999', 'LINE-TEST-VIN-001',
      current_date + 175, 42000, current_date - 90,
      800, 38000, current_date - 120, 4000
    )
    returning id into vid;
  else
    update public.vehicles
       set inspection_expire_date = current_date + 175,
           updated_at = now()
     where id = vid;
  end if;

  insert into public.consents (customer_id, channel, opt_in, source)
  values (cid, 'LINE', true, 'migration_0017')
  on conflict (customer_id, channel) do update
    set opt_in = true, source = excluded.source, updated_at = now();

  insert into public.consents (customer_id, channel, opt_in, source)
  values (cid, 'MAIL', true, 'migration_0017')
  on conflict (customer_id, channel) do nothing;

  if not exists (select 1 from public.quotes where vehicle_id = vid) then
    insert into public.quotes (
      vehicle_id, quote_no, status, total_amount,
      legal_items, service_items, notes, valid_until, issued_at
    )
    values (
      vid,
      'LINE-TEST-' || substring(replace(vid::text, '-', '') from 1 for 12),
      'ISSUED',
      73150,
      '[
        {"label": "自賠責保険料（24ヶ月）", "amount": 17650},
        {"label": "重量税（エコカー減税適用）", "amount": 15000},
        {"label": "印紙代", "amount": 1800}
      ]'::jsonb,
      '[
        {"label": "24ヶ月点検基本料", "amount": 28000},
        {"label": "ブレーキフルード交換", "amount": 4500},
        {"label": "エンジンオイル交換", "amount": 6200}
      ]'::jsonb,
      'LINE送信テスト用の見積です。',
      current_date + 175,
      now()
    );
  else
    update public.quotes
       set valid_until = current_date + 175,
           updated_at = now()
     where vehicle_id = vid
       and id = (
         select q.id from public.quotes q
         where q.vehicle_id = vid
         order by q.issued_at desc nulls last, q.created_at desc
         limit 1
       );
  end if;
end $$;
