'use client';

import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button className="btn btn-sm" onClick={handleLogout}>
      ログアウト
    </button>
  );
}
