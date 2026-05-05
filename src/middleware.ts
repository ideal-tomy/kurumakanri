import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabasePublicCredentials } from '@/lib/supabase/env';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/customers',
  '/lists',
  '/notifications',
  '/templates',
];

const PUBLIC_PREFIXES = ['/login', '/u/', '/me', '/api/webhooks', '/api/public'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const path = req.nextUrl.pathname;

  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return res;
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (!needsAuth) return res;

  const creds = getSupabasePublicCredentials();
  if (!creds) {
    console.warn(
      '[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。ダッシュボード等へのアクセスはログインへリダイレクトします。',
    );
    const redirect = req.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('next', path);
    redirect.searchParams.set('error', 'supabase_config');
    return NextResponse.redirect(redirect);
  }

  const supabase = createServerClient(creds.url, creds.anonKey, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirect = req.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('next', path);
    return NextResponse.redirect(redirect);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
