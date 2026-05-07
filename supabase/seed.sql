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

-- =====================================================================
-- クライアント向けプレゼン用デモ顧客 10 名
-- - 固定 UUID のため supabase db reset 後も同じ ID で再現できる
-- - line_user_id は NULL（既存の「LINEテスト顧客」などの LINE 連携検証用 ID は上書きしない）
-- - 車検 180日 / 90日 / 期限切れ / オイル目安 など一覧が埋まるよう日付・走行距離をばらしている
-- =====================================================================

insert into public.customers (id, name, furigana, phone, email, line_user_id, status, notes)
values
  ('10000000-0000-4000-8000-000000000001'::uuid, '【デモ】小林 一郎', 'コバヤシ イチロウ', '090-1000-0001', 'demo01@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000002'::uuid, '【デモ】加藤 恵子', 'カトウ ケイコ', '090-1000-0002', 'demo02@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000003'::uuid, '【デモ】吉田 翔太', 'ヨシダ ショウタ', '090-1000-0003', 'demo03@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000004'::uuid, '【デモ】山田 花子', 'ヤマダ ハナコ', '090-1000-0004', 'demo04@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000005'::uuid, '【デモ】佐々木 誠', 'ササキ マコト', '090-1000-0005', 'demo05@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000006'::uuid, '【デモ】井上 麻衣', 'イノウエ マイ', '090-1000-0006', 'demo06@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000007'::uuid, '【デモ】木村 拓海', 'キムラ タクミ', '090-1000-0007', 'demo07@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000008'::uuid, '【デモ】林 千夏', 'ハヤシ チナツ', '090-1000-0008', 'demo08@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-000000000009'::uuid, '【デモ】清水 隆', 'シミズ タカシ', '090-1000-0009', 'demo09@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）'),
  ('10000000-0000-4000-8000-00000000000a'::uuid, '【デモ】森 優子', 'モリ ユウコ', '090-1000-0010', 'demo10@demo.local', null, 'ACTIVE', 'クライアント説明用デモ（削除可）')
on conflict (id) do nothing;

-- 車両（同一 seed 再実行時はデモ顧客の車両を差し替え）
delete from public.vehicles v
where v.customer_id in (
  '10000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000003'::uuid,
  '10000000-0000-4000-8000-000000000004'::uuid,
  '10000000-0000-4000-8000-000000000005'::uuid,
  '10000000-0000-4000-8000-000000000006'::uuid,
  '10000000-0000-4000-8000-000000000007'::uuid,
  '10000000-0000-4000-8000-000000000008'::uuid,
  '10000000-0000-4000-8000-000000000009'::uuid,
  '10000000-0000-4000-8000-00000000000a'::uuid
);

insert into public.vehicles (
  customer_id, maker, model, plate, vin,
  inspection_expire_date, initial_mileage, initial_mileage_recorded_at,
  monthly_avg_km, last_oil_change_mileage, last_oil_change_at, oil_interval_km
)
select * from (values
  -- 車検 180日帯（残日数 150〜210）
  ('10000000-0000-4000-8000-000000000001'::uuid, 'トヨタ', 'ヤリス', '横浜 301 あ 1001', 'DEMO-VIN-001', current_date + 175, 35000, current_date - 120, 700, 31000, current_date - 100, 4000),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'ホンダ', 'ヴェゼル', '横浜 302 い 2002', 'DEMO-VIN-002', current_date + 190, 52000, current_date - 200, 850, 48000, current_date - 60, 4000),
  -- 車検 90日帯（残日数 60〜100）
  ('10000000-0000-4000-8000-000000000003'::uuid, '日産', 'ノート', '横浜 303 う 3003', 'DEMO-VIN-003', current_date + 75, 41000, current_date - 90, 600, 37000, current_date - 120, 4000),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'マツダ', 'MAZDA3', '横浜 304 え 4004', 'DEMO-VIN-004', current_date + 88, 61000, current_date - 150, 1100, 56500, current_date - 45, 4000),
  -- 期限切れ（フィルタ「期限切れ」で確認）
  ('10000000-0000-4000-8000-000000000005'::uuid, 'スバル', 'インプレッサ', '横浜 305 お 5005', 'DEMO-VIN-005', current_date - 12, 48000, current_date - 400, 800, 44500, current_date - 200, 4000),
  -- まだ先（一覧の「通常」確認用）
  ('10000000-0000-4000-8000-000000000006'::uuid, '三菱', 'アウトランダー', '横浜 306 か 6006', 'DEMO-VIN-006', current_date + 320, 72000, current_date - 300, 900, 68500, current_date - 30, 4000),
  -- オイル交換目安リスト向け（推定走行が目安に近い）
  ('10000000-0000-4000-8000-000000000007'::uuid, 'トヨタ', 'カローラ', '横浜 307 き 7007', 'DEMO-VIN-007', current_date + 240, 40000, current_date - 100, 950, 36200, current_date - 80, 4000),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'ホンダ', 'ステップワゴン', '横浜 308 く 8008', 'DEMO-VIN-008', current_date + 200, 55000, current_date - 120, 800, 51200, current_date - 50, 4000),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'レクサス', 'NX', '横浜 309 け 9009', 'DEMO-VIN-009', current_date + 165, 28000, current_date - 60, 500, 24200, current_date - 200, 4000),
  ('10000000-0000-4000-8000-00000000000a'::uuid, 'ダイハツ', 'ロッキー', '横浜 310 こ 0010', 'DEMO-VIN-010', current_date + 92, 33000, current_date - 45, 750, 29200, current_date - 30, 4000)
) as t(customer_id, maker, model, plate, vin, inspection_expire_date, initial_mileage, initial_mileage_recorded_at, monthly_avg_km, last_oil_change_mileage, last_oil_change_at, oil_interval_km)
where exists (select 1 from public.customers c where c.id = t.customer_id);

-- 配信同意
insert into public.consents (customer_id, channel, opt_in, source)
select id, 'LINE'::notification_channel, true, 'seed_demo_client'
from public.customers
where id between '10000000-0000-4000-8000-000000000001'::uuid and '10000000-0000-4000-8000-00000000000a'::uuid
on conflict (customer_id, channel) do nothing;

insert into public.consents (customer_id, channel, opt_in, source)
select id, 'MAIL'::notification_channel, true, 'seed_demo_client'
from public.customers
where id between '10000000-0000-4000-8000-000000000001'::uuid and '10000000-0000-4000-8000-00000000000a'::uuid
on conflict (customer_id, channel) do nothing;

-- 見積（デモ顧客の車両のみ）
insert into public.quotes (vehicle_id, quote_no, status, total_amount, legal_items, service_items, notes, valid_until, issued_at)
select v.id,
       'DEMO-' || replace(v.id::text, '-', ''),
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
       'デモ用見積です。',
       v.inspection_expire_date,
       now()
from public.vehicles v
where v.customer_id between '10000000-0000-4000-8000-000000000001'::uuid and '10000000-0000-4000-8000-00000000000a'::uuid
  and v.vin like 'DEMO-VIN-%'
on conflict (quote_no) do nothing;
