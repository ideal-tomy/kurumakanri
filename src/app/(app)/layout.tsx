import { TopNav } from '@/components/top-nav';
import { TopTabs } from '@/components/top-tabs';
import { BottomNav } from '@/components/bottom-nav';
import { Sidebar } from '@/components/sidebar';
import { requireStaff } from '@/lib/auth';
import { getNavCountEntries } from '@/lib/app-nav-counts';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStaff();
  const counts = await getNavCountEntries();
  return (
    <>
      <TopNav userName={ctx.profile?.name ?? ctx.email} role={ctx.profile?.role} />
      <div className="desktop-only">
        <TopTabs counts={counts} />
      </div>
      <div className="app-shell">
        <Sidebar counts={counts} />
        <main className="main">{children}</main>
      </div>
      <BottomNav counts={counts} />
    </>
  );
}
