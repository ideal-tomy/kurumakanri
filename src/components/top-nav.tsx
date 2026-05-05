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
      <Link href="/dashboard" className="brand">
        <div className="brand-mark">S</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="brand-name">Shaken Notify</span>
          <span className="brand-sub">v1.0</span>
        </div>
      </Link>

      <div className="top-nav-right">
        {userName && (
          <span className="user-info">
            {userName}
            {role && ` (${role})`}
          </span>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
