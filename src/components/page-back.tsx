import Link from 'next/link';

interface PageBackProps {
  href: string;
  label: string;
}

/**
 * ページ上部に置く「戻る」リンク。
 * - スマホでも視認できるよう page-header の上に配置する想定。
 * - 簡潔な見た目（背景なし）で、hover 時のみ強調する。
 */
export function PageBack({ href, label }: PageBackProps) {
  return (
    <Link href={href} className="page-back">
      <span className="page-back-arrow" aria-hidden>
        ←
      </span>
      <span>{label}</span>
    </Link>
  );
}
