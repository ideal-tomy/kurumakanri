import { TopNav } from '@/components/top-nav';
import { TopTabs } from '@/components/top-tabs';
import { Sidebar } from '@/components/sidebar';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getCounts() {
  const supabase = getServerSupabase();
  const [s180, s90, oil, priorities, lineUnmatched] = await Promise.all([
    supabase.from('v_targets_shaken_180').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_90').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_oil').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_priority_queue').select('queue_id', { count: 'exact', head: true }).in('status', ['OPEN', 'IN_PROGRESS']),
    supabase.from('v_line_unmatched').select('line_user_id', { count: 'exact', head: true }),
  ]);
  return [
    { href: '/priorities', count: priorities.count ?? 0 },
    { href: '/lists/shaken-180', count: s180.count ?? 0 },
    { href: '/lists/shaken-90', count: s90.count ?? 0 },
    { href: '/lists/oil', count: oil.count ?? 0 },
    { href: '/line/unmatched', count: lineUnmatched.count ?? 0 },
  ];
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStaff();
  const counts = await getCounts();
  return (
    <>
      <TopNav userName={ctx.profile?.name ?? ctx.email} role={ctx.profile?.role} />
      <TopTabs counts={counts} />
      <div className="app-shell">
        <Sidebar counts={counts} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
