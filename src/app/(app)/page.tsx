import Link from 'next/link';
import { getListHubCounts } from '@/lib/app-nav-counts';

export const dynamic = 'force-dynamic';

export default async function HomeHubPage() {
  const c = await getListHubCounts();

  const tiles: Array<{ href: string; label: string; count: number; sub: string }> = [
    { href: '/lists/shaken-180', label: '車検半年前', count: c.shaken180, sub: '満了日まで約180日' },
    { href: '/lists/shaken-90', label: '車検3か月前', count: c.shaken90, sub: '満了日まで約90日' },
    { href: '/lists/shaken-30', label: '車検1か月前', count: c.shaken30, sub: '満了日まで約30日' },
    { href: '/lists/shaken-overdue', label: '車検満了後', count: c.shakenOverdue, sub: '期限切れフォロー' },
    { href: '/lists/oil', label: 'オイル交換目安', count: c.oil, sub: '約4,000km 走行あたり' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">通知リスト</h1>
          <div className="page-sub home-hub-page-sub">送付する相手を選んで、送付確認へ進みます</div>
        </div>
      </div>
      <section className="panel home-hub-panel">
        <ul className="home-hub-tiles">
          {tiles.map((t) => {
            const disabled = t.count === 0;
            return (
              <li key={t.href}>
                {disabled ? (
                  <div className="home-hub-tile home-hub-tile-disabled" aria-disabled>
                    <div className="home-hub-tile-top">
                      <span className="home-hub-tile-label">{t.label}</span>
                      <span className="home-hub-tile-count">0 件</span>
                    </div>
                    <div className="home-hub-tile-sub">{t.sub}</div>
                  </div>
                ) : (
                  <Link href={t.href} className="home-hub-tile">
                    <div className="home-hub-tile-top">
                      <span className="home-hub-tile-label">{t.label}</span>
                      <span className="home-hub-tile-count">{t.count} 件</span>
                    </div>
                    <div className="home-hub-tile-sub">{t.sub}</div>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
