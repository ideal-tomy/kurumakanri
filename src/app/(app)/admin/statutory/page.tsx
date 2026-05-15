import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import type { StatutoryFeeRateRow } from '@/lib/supabase/types';
import { StatutoryAdminClient } from './statutory-client';

export const dynamic = 'force-dynamic';

export default async function StatutoryAdminPage() {
  const ctx = await requireStaff();
  const isAdmin = ctx.profile?.role === 'ADMIN';
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('statutory_fee_rates')
    .select('*')
    .order('effective_from', { ascending: false })
    .order('vehicle_class', { ascending: true });
  const rows = (data ?? []) as StatutoryFeeRateRow[];

  return (
    <>
      <PageBack href="/" label="ホームへ戻る" />
      <div className="page-header">
        <div>
          <h1 className="page-title">法定費用マスタ</h1>
          <div className="page-sub">車検法定費用の概算マスタ（ADMIN が編集）</div>
        </div>
      </div>

      <section className="panel" style={{ padding: 16 }}>
        <StatutoryAdminClient rows={rows} isAdmin={Boolean(isAdmin)} />
      </section>

      <NextActions
        items={[
          { href: '/templates', label: 'テンプレート', primary: true },
          { href: '/', label: 'ホーム' },
        ]}
      />
    </>
  );
}
