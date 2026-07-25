import { getServerSupabase } from '@/lib/supabase/server';
import {
  countUnresolvedFailures,
  type JobResolutionInput,
} from '@/lib/notification-failure-resolution';

export type ListHubCounts = {
  shaken180: number;
  shaken90: number;
  shaken30: number;
  shakenOverdue: number;
  oil: number;
  lineUnmatched: number;
  /** 要対応の送信失敗件数（再送成功で解消済みの履歴は除く） */
  failedJobs: number;
};

/** ホームの候補件数・要対応件数・サイドバーバッジ用 */
export async function getListHubCounts(): Promise<ListHubCounts> {
  const supabase = getServerSupabase();
  const [s180, s90, s30, overdue, oil, lineUnmatched, failedRows] = await Promise.all([
    supabase.from('v_targets_shaken_180').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_90').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_30').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_overdue').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_oil').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_line_unmatched').select('line_user_id', { count: 'exact', head: true }),
    supabase
      .from('notification_jobs')
      .select('id, customer_id, channel, template_key, status, created_at')
      .eq('status', 'FAILED'),
  ]);

  const failed = (failedRows.data ?? []) as JobResolutionInput[];
  let failedJobs = failed.length;
  if (failed.length > 0) {
    const customerIds = [...new Set(failed.map((f) => f.customer_id))];
    const { data: sentRows } = await supabase
      .from('notification_jobs')
      .select('id, customer_id, channel, template_key, status, created_at')
      .eq('status', 'SENT')
      .in('customer_id', customerIds)
      .limit(1000);
    failedJobs = countUnresolvedFailures([
      ...failed,
      ...((sentRows ?? []) as JobResolutionInput[]),
    ]);
  }

  return {
    shaken180: s180.count ?? 0,
    shaken90: s90.count ?? 0,
    shaken30: s30.count ?? 0,
    shakenOverdue: overdue.count ?? 0,
    oil: oil.count ?? 0,
    lineUnmatched: lineUnmatched.count ?? 0,
    failedJobs,
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
