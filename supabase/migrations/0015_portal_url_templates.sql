-- 車検系通知テンプレに顧客ポータル URL（{{portalUrl}}）を追加。
-- CUSTOMER_PORTAL_SECRET 未設定時は dispatcher が /me?cid= にフォールバックする。

update public.template_versions
   set content = E'お客様専用ページ（お車の状況・見積概要）\n{{portalUrl}}\n\n' || content
 where active = true
   and template_key in ('shaken_180days', 'shaken_90days', 'shaken_30days', 'shaken_overdue')
   and channel in ('LINE', 'MAIL')
   and content not like '%{{portalUrl}}%';
