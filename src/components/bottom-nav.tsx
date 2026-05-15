'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface NavCount {
  href: string;
  count?: number;
}

const TABS: Array<{ href: string; label: string; shortLabel: string }> = [
  { href: '/customers', label: '顧客一覧', shortLabel: '顧客' },
  { href: '/', label: 'ホーム', shortLabel: 'ホーム' },
  { href: '/history', label: '送付履歴', shortLabel: '履歴' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/customers') {
    return pathname === '/customers' || pathname.startsWith('/customers/');
  }
  if (href === '/') {
    return pathname === '/' || pathname === '';
  }
  if (href === '/history') {
    return pathname === '/history' || pathname.startsWith('/history/');
  }
  return pathname === href;
}

export function BottomNav({ counts: _counts }: { counts?: NavCount[] }) {
  const pathname = usePathname() ?? '';
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const nav = (
    <nav className="bottom-nav mobile-only" aria-label="主要メニュー">
      <div className="bottom-nav-inner">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch={false}
              className={`bottom-nav-tab ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="bottom-nav-icon" aria-hidden>
                {t.href === '/customers' ? <IconUsers /> : t.href === '/' ? <IconHome /> : <IconHistory />}
              </span>
              <span className="bottom-nav-label">{t.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) return null;
  return createPortal(nav, document.body);
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
