import Link from 'next/link';
import type { ReactNode } from 'react';

export interface NextActionItem {
  href: string;
  label: string;
  primary?: boolean;
  icon?: ReactNode;
}

interface NextActionsProps {
  title?: string;
  items: NextActionItem[];
}

/**
 * ページ末尾に置く「次のアクション」導線。
 * - 主要ページ間の遷移誘導用。スマホでもタップしやすいよう min-height 44px のボタンを並べる。
 */
export function NextActions({ title = '次にできること', items }: NextActionsProps) {
  if (items.length === 0) return null;
  return (
    <section className="next-actions" aria-label={title}>
      <div className="next-actions-label">{title}</div>
      <div className="next-actions-list">
        {items.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`btn ${item.primary ? 'btn-primary' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
