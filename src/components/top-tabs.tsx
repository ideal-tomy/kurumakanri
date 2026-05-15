'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavCount {
  href: string;
  count?: number;
}

const TABS: Array<{ href: string; label: string }> = [
  { href: '/', label: 'ホーム' },
  { href: '/customers', label: '顧客' },
  { href: '/line/unmatched', label: 'LINE未マッチ' },
  { href: '/history', label: '送付履歴' },
];

export function TopTabs({ counts }: { counts?: NavCount[] }) {
  const pathname = usePathname();

  function countFor(href: string) {
    return counts?.find((c) => c.href === href)?.count;
  }

  return (
    <nav className="top-tabs" aria-label="主要メニュー">
      <div className="top-tabs-inner">
        {TABS.map((t) => {
          const active =
            t.href === '/'
              ? pathname === '/' || pathname === ''
              : pathname === t.href || pathname?.startsWith(`${t.href}/`);
          const count = countFor(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              className={`top-tab ${active ? 'active' : ''}`}
            >
              {t.label}
              {typeof count === 'number' && count > 0 && (
                <span className="top-tab-count">{count}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
