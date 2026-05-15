import { getServerSupabase } from '@/lib/supabase/server';

export type ListHubCounts = {
  shaken180: number;
  shaken90: number;
  shaken30: number;
  shakenOverdue: number;
  oil: number;
  lineUnmatched: number;
};

/** ホームの5タイル・サイドバーバッジ用 */
export async function getListHubCounts(): Promise<ListHubCounts> {
  const supabase = getServerSupabase();
  const [s180, s90, s30, overdue, oil, lineUnmatched] = await Promise.all([
    supabase.from('v_targets_shaken_180').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_90').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_30').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_overdue').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_oil').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_line_unmatched').select('line_user_id', { count: 'exact', head: true }),
  ]);
  return {
    shaken180: s180.count ?? 0,
    shaken90: s90.count ?? 0,
    shaken30: s30.count ?? 0,
    shakenOverdue: overdue.count ?? 0,
    oil: oil.count ?? 0,
    lineUnmatched: lineUnmatched.count ?? 0,
  };
}

/** BottomNav / Sidebar 互換: { href, count }[] */
export async function getNavCountEntries() {
  const c = await getListHubCounts();
  return [
    { href: '/lists/shaken-180', count: c.shaken180 },
    { href: '/lists/shaken-90', count: c.shaken90 },
    { href: '/lists/shaken-30', count: c.shaken30 },
    { href: '/lists/shaken-overdue', count: c.shakenOverdue },
    { href: '/lists/oil', count: c.oil },
    { href: '/line/unmatched', count: c.lineUnmatched },
  ];
}
