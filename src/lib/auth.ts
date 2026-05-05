import { redirect } from 'next/navigation';
import { getSupabasePublicCredentials } from './supabase/env';
import { getServerSupabase, getServiceSupabase } from './supabase/server';
import type { StaffProfileRow, UserRole } from './supabase/types';

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: StaffProfileRow | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const creds = getSupabasePublicCredentials();
  if (!creds) return null;

  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<StaffProfileRow>();

  if (profile) {
    return { userId: user.id, email: user.email ?? null, profile };
  }

  // RLS / セッション伝播の揺らぎで profile が取れない環境向けのフォールバック。
  // user.id は認証済みセッション由来のため、特定ユーザーの行のみを安全に再取得する。
  if (profileError) {
    console.warn(
      `[auth] staff_profiles を通常クライアントで取得できませんでした: ${profileError.message}`,
    );
  }
  const service = getServiceSupabase();
  const { data: serviceProfile, error: serviceProfileError } = await service
    .from('staff_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<StaffProfileRow>();
  if (serviceProfileError) {
    console.warn(
      `[auth] staff_profiles フォールバック取得にも失敗しました: ${serviceProfileError.message}`,
    );
  }

  return { userId: user.id, email: user.email ?? null, profile: serviceProfile ?? null };
}

export async function requireStaff(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (!ctx.profile || !ctx.profile.active) {
    redirect('/login?error=no-profile');
  }
  return ctx;
}

export async function requireRole(...roles: UserRole[]): Promise<AuthContext> {
  const ctx = await requireStaff();
  if (!ctx.profile || !roles.includes(ctx.profile.role)) {
    redirect('/login?error=insufficient-role');
  }
  return ctx;
}
