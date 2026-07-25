import Link from 'next/link';
import { getListHubCounts } from '@/lib/app-nav-counts';

export const dynamic = 'force-dynamic';

type Urgency = 'critical' | 'warning' | 'normal';

export default async function HomeHubPage() {
  const c = await getListHubCounts();

  const tiles: Array<{
    href: string;
    label: string;
    count: number;
    sub: string;
    urgency: Urgency;
  }> = [
    {
      href: '/lists/shaken-overdue',
      label: '車検満了後',
      count: c.shakenOverdue,
      sub: '期限切れフォロー',
      urgency: 'critical',
    },
    {
      href: '/lists/shaken-30',
      label: '車検1か月前',
      count: c.shaken30,
      sub: '満了まで約30日',
      urgency: 'warning',
    },
    {
      href: '/lists/shaken-90',
      label: '車検3か月前',
      count: c.shaken90,
      sub: '満了まで約90日',
      urgency: 'warning',
    },
    {
      href: '/lists/shaken-180',
      label: '車検半年前',
      count: c.shaken180,
      sub: '満了まで約180日',
      urgency: 'normal',
    },
    {
      href: '/lists/oil',
      label: 'オイル交換目安',
      count: c.oil,
      sub: '約4,000kmごと',
      urgency: 'normal',
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">今週の案内</h1>
          <div className="page-sub home-hub-page-sub">送る相手を選んで確認します</div>
        </div>
      </div>

      <section className="panel home-hub-panel home-hub-action-panel">
        <div className="home-hub-section-label">要対応</div>
        <ul className="home-hub-action-list">
          <li>
            <Link
              href="/line/unmatched"
              className={`home-hub-action-row${c.lineUnmatched > 0 ? ' home-hub-action-row-alert' : ' home-hub-action-row-muted'}`}
            >
              <span className="home-hub-action-label">友だち追加済み・未登録</span>
              <span className="home-hub-action-count">{c.lineUnmatched} 件</span>
            </Link>
          </li>
          {c.failedJobs > 0 ? (
            <li>
              <Link
                href="/history?status=FAILED&unresolved=1"
                className="home-hub-action-row home-hub-action-row-alert"
              >
                <span className="home-hub-action-label">送信失敗（要対応）</span>
                <span className="home-hub-action-count">{c.failedJobs} 件</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="panel home-hub-panel">
        <div className="home-hub-section-label">案内候補</div>
        <ul className="home-hub-rows">
          {tiles.map((t) => {
            const disabled = t.count === 0;
            const className = `home-hub-row home-hub-row-${t.urgency}${disabled ? ' home-hub-row-disabled' : ''}`;
            const inner = (
              <>
                <span className="home-hub-row-label">{t.label}</span>
                <span className="home-hub-row-count">{t.count} 件</span>
                <span className="home-hub-row-sub">{t.sub}</span>
              </>
            );
            return (
              <li key={t.href}>
                {disabled ? (
                  <div className={className} aria-disabled>
                    {inner}
                  </div>
                ) : (
                  <Link href={t.href} className={className}>
                    {inner}
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
