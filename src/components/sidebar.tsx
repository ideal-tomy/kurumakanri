'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavCount {
  href: string;
  count?: number;
}

const items: Array<{
  href: string;
  label: string;
  icon: 'dashboard' | 'users' | 'list' | 'bell' | 'doc' | 'tmpl' | 'megaphone';
  group: 'main' | 'lists' | 'settings';
}> = [
  { href: '/dashboard', label: 'ダッシュボード', icon: 'dashboard', group: 'main' },
  { href: '/priorities', label: '優先', icon: 'bell', group: 'main' },
  { href: '/customers', label: '顧客一覧', icon: 'users', group: 'main' },
  { href: '/campaigns/new', label: 'キャンペーン', icon: 'megaphone', group: 'main' },
  { href: '/line/unmatched', label: 'LINE未マッチ', icon: 'users', group: 'main' },
  { href: '/lists/shaken-180', label: '車検半年前', icon: 'list', group: 'lists' },
  { href: '/lists/shaken-90', label: '車検3か月前', icon: 'list', group: 'lists' },
  { href: '/lists/shaken-30', label: '車検1ヶ月前', icon: 'list', group: 'lists' },
  { href: '/lists/shaken-overdue', label: '車検満了後', icon: 'list', group: 'lists' },
  { href: '/lists/oil', label: 'オイル交換目安', icon: 'list', group: 'lists' },
  { href: '/notifications/logs', label: '配信履歴', icon: 'doc', group: 'main' },
  { href: '/templates', label: 'テンプレート', icon: 'tmpl', group: 'settings' },
  { href: '/admin/statutory', label: '法定費用マスタ', icon: 'doc', group: 'settings' },
];

export function Sidebar({ counts }: { counts?: NavCount[] }) {
  const pathname = usePathname();

  function countFor(href: string) {
    return counts?.find((c) => c.href === href)?.count;
  }

  const groups = [
    { id: 'main', label: 'メイン' },
    { id: 'lists', label: '通知対象リスト' },
    { id: 'settings', label: '設定' },
  ] as const;

  return (
    <aside className="sidebar">
      {groups.map((g) => (
        <div className="sidebar-section" key={g.id}>
          <div className="sidebar-label">{g.label}</div>
          {items
            .filter((it) => it.group === g.id)
            .map((it) => (
              <Link key={it.href} href={it.href} prefetch={false}>
                <button
                  className={`nav-item ${pathname === it.href ? 'active' : ''}`}
                >
                  <Icon name={it.icon} />
                  {it.label}
                  {countFor(it.href) != null && (
                    <span className="nav-count">{countFor(it.href)}</span>
                  )}
                </button>
              </Link>
            ))}
        </div>
      ))}
    </aside>
  );
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      );
    case 'list':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'doc':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case 'tmpl':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z" />
          <path d="M16 8a5 5 0 0 1 0 8" />
          <path d="M19 5a9 9 0 0 1 0 14" />
        </svg>
      );
    default:
      return null;
  }
}
