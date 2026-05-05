-- =====================================================================
-- Seed: shaken-demo.html のデモ顧客 / 標準テンプレ / 通知ルール
-- ローカル開発用。本番初期データは別途 import する。
-- =====================================================================

-- ----- 通知ルール -----
insert into public.notification_rules (rule_key, rule_name, kind, trigger_days_before, channels, template_key)
values
  ('shaken_180days', '車検180日前', 'SHAKEN_DAYS_BEFORE', 180, array['LINE','MAIL']::notification_channel[], 'shaken_180days'),
  ('shaken_90days',  '車検90日前',  'SHAKEN_DAYS_BEFORE',  90, array['LINE','MAIL']::notification_channel[], 'shaken_90days'),
  ('oil_4000km',     'オイル交換目安', 'OIL_KM_INTERVAL',  null, array['LINE','MAIL']::notification_channel[], 'oil_4000km')
on conflict (rule_key) do nothing;

update public.notification_rules
   set trigger_oil_interval_km = 4000
 where rule_key = 'oil_4000km';

-- ----- 通知テンプレート -----
insert into public.template_versions (template_key, channel, subject, content, version, active)
values
  ('shaken_180days', 'LINE', null,
'{{name}}様

いつもありがとうございます。
お車の車検満了日が約半年後に迫ってまいりました。
お時間のあるときに整備のご予約をご検討ください。

【満了日】{{expireDate}}
【残日数】{{daysLeft}}日

▶ お見積を確認する
{{quoteUrl}}', 1, true),

  ('shaken_180days', 'MAIL', '【車検のご案内】満了日が約半年後となりました',
'{{name}} 様

ご愛用の{{carName}}（{{plate}}）の車検満了日が約半年後の{{expireDate}}となりました。
お時間のあるときに整備のご予約をご検討ください。

▶ お見積確認: {{quoteUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 1, true),

  ('shaken_90days', 'LINE', null,
'{{name}}様

ご愛用の{{carName}}（{{plate}}）の
車検満了日まで残り{{daysLeft}}日となりました。
ご都合の良い日程でご予約をお願いいたします。

【満了日】{{expireDate}}
【現在走行距離（推定）】{{mileage}} km

▶ お見積・ご予約はこちら
{{quoteUrl}}', 1, true),

  ('shaken_90days', 'MAIL', '【車検のご案内】満了日まで90日です',
'{{name}} 様

ご愛用の{{carName}}（{{plate}}）の車検満了日まで残り{{daysLeft}}日となりました。
お早めのご予約をおすすめします。

■ 満了日: {{expireDate}}
■ 走行距離（推定）: {{mileage}} km

お見積・ご予約: {{quoteUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 1, true),

  ('oil_4000km', 'LINE', null,
'{{name}}様

前回オイル交換からの目安走行距離（4,000km）に近づいています。
お早めのオイル交換をおすすめします。

【推定走行距離】{{mileage}} km
【次回交換目安】{{nextOilTargetKm}} km

▶ ご予約はこちら
{{bookingUrl}}', 1, true),

  ('oil_4000km', 'MAIL', '【オイル交換のご案内】交換目安に近づいています',
'{{name}} 様

ご愛用の{{carName}}（{{plate}}）が、前回オイル交換からの目安走行距離（4,000km）に近づいています。

■ 推定走行距離: {{mileage}} km
■ 次回交換目安: {{nextOilTargetKm}} km

ご予約: {{bookingUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 1, true)
on conflict (template_key, channel, version) do nothing;

-- ----- デモ顧客 -----
do $$
declare
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
  c5 uuid; c6 uuid; c7 uuid; c8 uuid;
  v_id uuid;
begin
  insert into public.customers (name, furigana, phone, email, status)
  values ('田中 健一', 'タナカ ケンイチ', '090-1234-5678', 'tanaka@example.jp', 'ACTIVE')
  returning id into c1;
  insert into public.customers (name, furigana, phone, email, status)
  values ('佐藤 美咲', 'サトウ ミサキ', '080-2345-6789', 'sato@example.jp', 'ACTIVE')
  returning id into c2;
  insert into public.customers (name, furigana, phone, email, status)
  values ('鈴木 隆', 'スズキ タカシ', '090-3456-7890', 'suzuki@example.jp', 'ACTIVE')
  returning id into c3;
  insert into public.customers (name, furigana, phone, email, status)
  values ('高橋 由美', 'タカハシ ユミ', '080-4567-8901', 'takahashi@example.jp', 'ACTIVE')
  returning id into c4;
  insert into public.customers (name, furigana, phone, email, status)
  values ('伊藤 健二', 'イトウ ケンジ', '090-5678-9012', 'ito@example.jp', 'ACTIVE')
  returning id into c5;
  insert into public.customers (name, furigana, phone, email, status)
  values ('渡辺 さくら', 'ワタナベ サクラ', '080-6789-0123', 'watanabe@example.jp', 'ACTIVE')
  returning id into c6;
  insert into public.customers (name, furigana, phone, email, status)
  values ('山本 大輔', 'ヤマモト ダイスケ', '090-7890-1234', 'yamamoto@example.jp', 'ACTIVE')
  returning id into c7;
  insert into public.customers (name, furigana, phone, email, status)
  values ('中村 真奈美', 'ナカムラ マナミ', '080-8901-2345', 'nakamura@example.jp', 'ACTIVE')
  returning id into c8;

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c1, 'トヨタ', 'プリウス', '横浜 300 あ 12-34', 'ZVW50-1234567', current_date + 28, 48230, 800, 44230, current_date - 180)
  returning id into v_id;
  insert into public.service_histories (vehicle_id, title, performed_at, mileage)
  values (v_id, '12ヶ月点検 + オイル交換', current_date - 180, 44230),
         (v_id, '前回車検', current_date - 365, 38000);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c2, 'ホンダ', 'N-BOX', '横浜 580 う 56-78', 'JF3-2345678', current_date + 41, 32100, 600, 28000, current_date - 200);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c3, '日産', 'セレナ', '横浜 500 さ 90-12', 'C27-3456789', current_date + 54, 67890, 1000, 64000, current_date - 120);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c4, 'マツダ', 'CX-5', '横浜 330 い 34-56', 'KE-4567890', current_date + 67, 89200, 1500, 86000, current_date - 90);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c5, 'スバル', 'フォレスター', '横浜 300 こ 78-90', 'SK-5678901', current_date + 16, 55400, 700, 52000, current_date - 150);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c6, 'ダイハツ', 'タント', '横浜 580 け 12-90', 'LA-6789012', current_date + 175, 21300, 400, 19000, current_date - 240);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c7, 'トヨタ', 'アクア', '横浜 500 ま 45-67', 'NHP10-7890123', current_date + 32, 41800, 900, 38000, current_date - 150);

  insert into public.vehicles (customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, monthly_avg_km, last_oil_change_mileage, last_oil_change_at)
  values (c8, 'ホンダ', 'フィット', '横浜 510 な 89-01', 'GR-8901234', current_date + 74, 36700, 500, 33000, current_date - 200);

  -- 配信同意（全員 LINE/MAIL オプトイン）
  insert into public.consents (customer_id, channel, opt_in)
  select id, 'LINE'::notification_channel, true from public.customers
  on conflict (customer_id, channel) do nothing;
  insert into public.consents (customer_id, channel, opt_in)
  select id, 'MAIL'::notification_channel, true from public.customers
  on conflict (customer_id, channel) do nothing;

  -- 見積（法定費用は固定）
  insert into public.quotes (vehicle_id, quote_no, status, total_amount, legal_items, service_items, notes, valid_until, issued_at)
  select v.id,
         'QT-' || to_char(now(), 'YYYY') || '-' || substring(v.id::text from 1 for 8),
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
         '※ 足回り・タイヤ等の状態によっては、実車確認後に追加整備が必要となる場合があります。',
         v.inspection_expire_date,
         now()
    from public.vehicles v;
end $$;
