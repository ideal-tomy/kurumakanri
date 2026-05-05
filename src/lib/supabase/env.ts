/**
 * Supabase CLI のデフォルト JWT シークレットに対応するローカル用キー。
 * @see https://supabase.com/docs/guides/cli/local-development
 */
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export interface SupabasePublicCredentials {
  url: string;
  anonKey: string;
}

/**
 * .env でよくある「ref のみ」「.supabase.co までだが https が無い」を直す。
 */
function normalizeSupabaseProjectUrl(raw: string): string {
  let u = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!u) return u;

  // .env で「KEY=KEY=https://...」のように変数名を値に重ねてしまった場合（先頭の KEY= を繰り返し除去）
  let strippedDupKey = false;
  while (/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*/i.test(u)) {
    strippedDupKey = true;
    u = u.replace(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*/i, '').trim();
  }
  if (strippedDupKey && process.env.NODE_ENV === 'development') {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL の値が不正だったため補正しました。現在の値: ${u}`,
    );
  }

  if (!u) return u;
  u = u.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[a-z0-9.-]+\.supabase\.co$/i.test(u)) {
    return `https://${u}`;
  }
  // 英数字とハイフンのみ（ドットなし）→ クラウドの project ref とみなす
  if (/^[a-z0-9-]+$/i.test(u) && !u.includes('.')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[supabase] NEXT_PUBLIC_SUPABASE_URL が「${raw.trim()}」のみだったため https://${u}.supabase.co に補正しました。`,
      );
    }
    return `https://${u}.supabase.co`;
  }
  if (/^(127\.0\.0\.1|localhost)(:\d+)?(\/.*)?$/i.test(u)) {
    return `http://${u}`;
  }
  return u;
}

function warnIfSuspiciousSupabaseUrl(url: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL が URL として解釈できません。現在の値: ${url} / 期待値: https://<project-ref>.supabase.co または http://127.0.0.1:54321`,
    );
    return;
  }
  const host = parsed.hostname;
  if (
    host === 'supabase.com' ||
    host === 'www.supabase.com' ||
    host === 'app.supabase.com' ||
    url.includes('/dashboard/')
  ) {
    console.warn(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL にダッシュボードURLが入っています。現在の値: ${url} / 正しい値: https://<project-ref>.supabase.co`,
    );
  }
}

/**
 * 公開 URL / anon key を返す。
 * - 本番で未設定のときは null（ミドルウェアでログインへ寄せる等に使う）。
 * - development で未設定のときはローカル CLI の既定値にフォールバック。
 */
export function getSupabasePublicCredentials(): SupabasePublicCredentials | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (rawUrl && anonKey) {
    const url = normalizeSupabaseProjectUrl(rawUrl);
    warnIfSuspiciousSupabaseUrl(url);
    if (process.env.NODE_ENV === 'development' && rawUrl !== url) {
      console.warn(`[supabase] NEXT_PUBLIC_SUPABASE_URL を補正して使用します: ${url}`);
    }
    return { url, anonKey };
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。ローカル既定値(http://127.0.0.1:54321)で起動します。クラウド環境を使う場合は .env の2項目を必ず設定してください。',
    );
    return { url: LOCAL_SUPABASE_URL, anonKey: LOCAL_SUPABASE_ANON_KEY };
  }

  return null;
}

/** Server Component / Route Handler 等で必須。本番未設定時は明示的にエラーにする。 */
export function requireSupabasePublicCredentials(): SupabasePublicCredentials {
  const creds = getSupabasePublicCredentials();
  if (!creds) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。',
    );
  }
  return creds;
}

/** service_role。development で未設定時はローカル既定キーにフォールバック。 */
export function requireSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (key) return key;

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY が未設定のため、ローカル service_role 既定キーを使います。',
    );
    return LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  }

  throw new Error('SUPABASE_SERVICE_ROLE_KEY を設定してください。');
}
