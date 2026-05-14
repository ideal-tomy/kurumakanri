-- テンプレ v3: お見積合計・有効期限・車名の差し込み（dispatcher の {{grandTotal}} {{validUntil}} {{vehicleName}}）

update public.template_versions
   set active = false
 where template_key in ('shaken_180days', 'shaken_90days', 'oil_4000km')
   and version = 2;

insert into public.template_versions (template_key, channel, subject, content, version, active)
values
  ('shaken_180days', 'LINE', null,
'【車検6ヶ月前】概算費用のお知らせ

{{name}} 様

いつもありがとうございます。
お車（{{plate}}）の車検満了まで残り約{{daysLeft}}日となりました。

▼ お見積合計（概算）: {{grandTotal}}
有効期限: {{validUntil}}
車両: {{vehicleName}}

▼ 詳細な内訳・PDF保存はこちら
{{quoteUrl}}

登録情報に基づいた「法定費用（最低限かかる費用）」の概算をお出ししました。

▼ 法定費用概算：計 ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}
※お車の状態により変動する場合があります。

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧（画像）
{{maintenanceInfoUrl}}

早めのご予約で割引になるプランもございます。ぜひご検討ください。', 3, true),

  ('shaken_180days', 'MAIL', '【車検6ヶ月前】概算費用のお知らせ',
'{{name}} 様

ご愛用の{{carName}}（{{plate}}）の車検満了日が約半年後の{{expireDate}}となりました。

▼ お見積合計（概算）: {{grandTotal}}
有効期限: {{validUntil}}

▼ 詳細な内訳
{{quoteUrl}}

登録情報に基づいた「法定費用（最低限かかる費用）」の概算をお出ししました。

▼ 法定費用概算：計 ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}
※お車の状態により変動する場合があります。

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧
{{maintenanceInfoUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 3, true),

  ('shaken_90days', 'LINE', null,
'【車検3ヶ月前】最終ご案内

{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）の車検満了まで残り{{daysLeft}}日となりました。
ご都合の良い日程でご予約をお願いいたします。

▼ お見積合計（概算）: {{grandTotal}}
有効期限: {{validUntil}}
詳細: {{quoteUrl}}

▼ 法定費用概算：計 ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}
※お車の状態により変動する場合があります。

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧（画像）
{{maintenanceInfoUrl}}

【満了日】{{expireDate}}
【現在走行距離（推定）】{{mileage}} km', 3, true),

  ('shaken_90days', 'MAIL', '【車検3ヶ月前】最終ご案内',
'{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）の車検満了日まで残り{{daysLeft}}日となりました。
お早めのご予約をおすすめします。

▼ お見積合計（概算）: {{grandTotal}}
有効期限: {{validUntil}}
詳細: {{quoteUrl}}

▼ 法定費用概算：計 ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}
※お車の状態により変動する場合があります。

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧
{{maintenanceInfoUrl}}

■ 満了日: {{expireDate}}
■ 走行距離（推定）: {{mileage}} km

------------------------------
配信停止: {{unsubscribeUrl}}', 3, true),

  ('oil_4000km', 'LINE', null,
'【オイル交換のお知らせ】

{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）が、前回オイル交換からの目安距離（{{oilIntervalKm}} km）に近づいています。

【推定走行距離】{{mileage}} km
【次回交換目安】{{nextOilTargetKm}} km

▼ 参考：直近のお見積合計 {{grandTotal}}（有効 {{validUntil}}）
{{quoteUrl}}

オイルの種類・エレメント交換の費用一覧は、以下のページからご確認いただけます。

▶ オイル交換 費用一覧（画像）
{{oilInfoUrl}}

ご来店ご希望の日時をご返信ください。', 3, true),

  ('oil_4000km', 'MAIL', '【オイル交換のご案内】交換目安に近づいています',
'{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）が、前回オイル交換からの目安距離（{{oilIntervalKm}} km）に近づいています。

■ 推定走行距離: {{mileage}} km
■ 次回交換目安: {{nextOilTargetKm}} km

▼ 参考：直近のお見積合計 {{grandTotal}}（有効 {{validUntil}}）
{{quoteUrl}}

オイルの種類・エレメント交換の費用一覧は、以下のページからご確認いただけます。

▶ オイル交換 費用一覧
{{oilInfoUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}', 3, true)
on conflict (template_key, channel, version) do nothing;
