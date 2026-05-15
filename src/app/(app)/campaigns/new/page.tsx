import { getServerSupabase } from '@/lib/supabase/server';
import { PageBack } from '@/components/page-back';
import type { CustomerOverviewRow } from '@/lib/supabase/types';
import { CampaignClient } from './campaign-client';

export const dynamic = 'force-dynamic';

export default async function CampaignNewPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase.from('v_customer_overview').select('*').order('name', { ascending: true });
  const raw = (data ?? []) as CustomerOverviewRow[];
  const seen = new Set<string>();
  const rows = raw.filter((r) => {
    if (seen.has(r.customer_id)) return false;
    seen.add(r.customer_id);
    return true;
  });

  return (
    <>
      <PageBack href="/" label="ホームへ戻る" />
      <CampaignClient rows={rows} />
    </>
  );
}
