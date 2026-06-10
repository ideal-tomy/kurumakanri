-- 車検系通知: 顧客向け主リンクを portalUrl のみに統一（quoteUrl はポータル内の印刷用）。
-- quote_notify: 見積画面からの手動 LINE 送信用。

update public.template_versions
   set active = false
 where active = true
   and template_key in ('shaken_180days', 'shaken_90days', 'shaken_30days', 'shaken_overdue', 'quote_notify')
   and channel in ('LINE', 'MAIL');

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_180days', 'LINE', null,
$LINE180$【車検6ヶ月前】概算費用のお知らせ

{{name}} 様

いつもありがとうございます。
お車（{{plate}}）の車検満了まで残り約{{daysLeft}}日となりました。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}} ／ {{vehicleName}}

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧（画像）
{{maintenanceInfoUrl}}

早めのご予約で割引になるプランもございます。ぜひご検討ください。
※お車の状態により法定費用も変動する場合があります。
$LINE180$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_180days' and t.channel = 'LINE'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_180days', 'MAIL', '【車検6ヶ月前】概算費用のお知らせ',
$MAIL180${{name}} 様

ご愛用の{{carName}}（{{plate}}）の車検満了日が約半年後の{{expireDate}}となりました。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}} ／ {{vehicleName}}

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧
{{maintenanceInfoUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}
$MAIL180$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_180days' and t.channel = 'MAIL'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_90days', 'LINE', null,
$LINE90$【車検3ヶ月前】最終ご案内

{{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）の車検満了まで残り{{daysLeft}}日となりました。
ご都合の良い日程でご予約をお願いいたします。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}}

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧（画像）
{{maintenanceInfoUrl}}

【満了日】{{expireDate}}
【現在走行距離（推定）】{{mileage}} km
※お車の状態により法定費用も変動する場合があります。
$LINE90$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_90days' and t.channel = 'LINE'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_90days', 'MAIL', '【車検3ヶ月前】最終ご案内',
$MAIL90${{name}} 様

ご愛用の{{vehicleName}}（{{plate}}）の車検満了日まで残り{{daysLeft}}日となりました。
お早めのご予約をおすすめします。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}}

▼ その他発生する可能性がある費用
部品交換や点検整備の概算は、以下のページの「整備費用一覧」をご確認ください。

▶ 整備費用一覧
{{maintenanceInfoUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}
$MAIL90$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_90days' and t.channel = 'MAIL'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_30days', 'LINE', null,
$LINE30$【車検1ヶ月前】ご予約のお願い

{{name}} 様

お車（{{plate}}）の車検満了まで残り{{daysLeft}}日です。お早めにご予約ください。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}} ／ {{vehicleName}}

【満了日】{{expireDate}}
※お車の状態により法定費用も変動する場合があります。
$LINE30$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_30days' and t.channel = 'LINE'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_30days', 'MAIL', '【車検1ヶ月前】ご予約のお願い',
$MAIL30${{name}} 様

お車（{{plate}}）の車検満了まで残り{{daysLeft}}日です。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}} ／ {{vehicleName}}

------------------------------
配信停止: {{unsubscribeUrl}}
$MAIL30$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_30days' and t.channel = 'MAIL'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_overdue', 'LINE', null,
$LINEOD$【車検期限超過】至急ご連絡ください

{{name}} 様

お車（{{plate}}）の車検期限を過ぎています（{{daysLeft}}日）。至急ご連絡ください。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}

【満了日】{{expireDate}}
$LINEOD$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_overdue' and t.channel = 'LINE'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'shaken_overdue', 'MAIL', '【車検期限超過】至急ご連絡ください',
$MAILOD${{name}} 様

お車（{{plate}}）の車検期限を過ぎています。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}

------------------------------
配信停止: {{unsubscribeUrl}}
$MAILOD$,
  (select coalesce(max(version), 0) + 1 from public.template_versions t where t.template_key = 'shaken_overdue' and t.channel = 'MAIL'),
  true;

insert into public.template_versions (template_key, channel, subject, content, version, active)
select 'quote_notify', 'LINE', null,
$LINEQN$【車検お見積】ご案内

{{name}} 様

車検のお見積をご案内します。

▼ ご案内する概算（法定費用・手数料のみ）: ¥{{legalFeesTotal}}
{{legalFeesBreakdown}}

▼ お見積の詳細（法定費用・整備費用の内訳）
{{portalUrl}}
有効期限: {{validUntil}} ／ {{vehicleName}}
$LINEQN$,
  coalesce((select max(version) from public.template_versions t where t.template_key = 'quote_notify' and t.channel = 'LINE'), 0) + 1,
  true;
