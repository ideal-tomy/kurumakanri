import { getServerSupabase } from '@/lib/supabase/server';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { TemplatesEditor } from './templates-editor';
import type { TemplateVersionRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('template_versions')
    .select('*')
    .order('template_key', { ascending: true })
    .order('channel', { ascending: true })
    .order('version', { ascending: false });
  const rows = (data ?? []) as TemplateVersionRow[];

  return (
    <>
      <PageBack href="/" label="ホームへ戻る" />
      <div className="page-header">
        <div>
          <h1 className="page-title">テンプレート</h1>
          <div className="page-sub">通知文面のテンプレ一覧（画面から編集可）</div>
        </div>
      </div>

      <section className="panel">
        <TemplatesEditor rows={rows} />
        <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-3)' }}>
          差し込み変数: <code>{'{{name}}'}</code> <code>{'{{carName}}'}</code>{' '}
          <code>{'{{plate}}'}</code> <code>{'{{expireDate}}'}</code>{' '}
          <code>{'{{daysLeft}}'}</code> <code>{'{{mileage}}'}</code>{' '}
          <code>{'{{nextOilTargetKm}}'}</code> <code>{'{{quoteUrl}}'}</code>{' '}
          <code>{'{{grandTotal}}'}</code> <code>{'{{validUntil}}'}</code> <code>{'{{vehicleName}}'}</code>{' '}
          <code>{'{{legalFeesTotal}}'}</code> <code>{'{{legalFeesBreakdown}}'}</code>{' '}
          <code>{'{{maintenanceInfoUrl}}'}</code> <code>{'{{oilInfoUrl}}'}</code> <code>{'{{oilIntervalKm}}'}</code>{' '}
          <code>{'{{bookingUrl}}'}</code> <code>{'{{unsubscribeUrl}}'}</code>
        </div>
        <div style={{ padding: '0 16px 16px', fontSize: 12, color: 'var(--ink-2)' }}>
          車検系（shaken_*）の既定文面は、顧客向けの<strong>主たる金額を法定概算（{'{{legalFeesTotal}}'}）</strong>にし、税込一式（{'{{grandTotal}}'}）は本文先頭に載せません。一式は{' '}
          <code>{'{{quoteUrl}}'}</code> の見積ページで確認してもらう方針です（DB migration 0014 以降）。
        </div>
      </section>

      <NextActions
        items={[
          { href: '/history', label: '送付履歴', primary: true },
          { href: '/', label: 'ホーム' },
        ]}
      />
    </>
  );
}
