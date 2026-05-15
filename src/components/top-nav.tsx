import Link from 'next/link';
import { LogoutButton } from './logout-button';

export function TopNav({
  userName,
  role,
}: {
  userName?: string | null;
  role?: string | null;
}) {
  return (
    <header className="top-nav">
      <Link href="/" className="brand">
        <div className="brand-mark">S</div>
        <div className="brand-text-full">
          <span className="brand-name">Shaken Notify</span>
          <span className="brand-sub">v1.0</span>
        </div>
      </Link>

      <div className="top-nav-right desktop-only">
        {userName && (
          <span className="user-info">
            {userName}
            {role && ` (${role})`}
          </span>
        )}
        <LogoutButton />
      </div>
      <div className="top-nav-right mobile-only">
        <LogoutButton className="btn btn-sm btn-nav-compact" />
      </div>
    </header>
  );
}
