import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import {
  getSupabasePublicCredentials,
  requireSupabaseServiceRoleKey,
} from './env';

/**
 * Server Component / Server Action / Route Handler 用クライアント。
 * - Cookie 経由で auth セッションを読み書き。
 * - RLS 適用版（authenticated ロール）として動作する。
 */
export function getServerSupabase() {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。',
    );
  }
  const { url, anonKey } = creds;
  const cookieStore = cookies();
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component から書き込み不可の場合は無視
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // 同上
          }
        },
      },
    },
  );
}

/**
 * service_role を使う管理クライアント。
 * Webhook / Edge Function 相当 / 公開オプトアウト等の RLS バイパス時に使用。
 */
export function getServiceSupabase() {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。',
    );
  }
  const { url } = creds;
  const serviceRoleKey = requireSupabaseServiceRoleKey();
  return createServerClient(
    url,
    serviceRoleKey,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    },
  );
}
