import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="login-shell">
      <div className="login-card">
        <div style={{ marginBottom: 24 }}>
          <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 20 }}>
            S
          </div>
          <h1
            className="brand-name"
            style={{ fontSize: 24, marginTop: 12 }}
          >
            Shaken Notify
          </h1>
          <div className="page-sub" style={{ marginTop: 4 }}>
            管理者・スタッフ ログイン
          </div>
        </div>

        {searchParams.error === 'no-profile' && (
          <div
            className="badge badge-warn"
            style={{ marginBottom: 12, padding: 8, display: 'block' }}
          >
            プロフィール未登録、もしくは無効化されたアカウントです。管理者にお問い合わせください。
          </div>
        )}
        {searchParams.error === 'insufficient-role' && (
          <div
            className="badge badge-warn"
            style={{ marginBottom: 12, padding: 8, display: 'block' }}
          >
            このページへのアクセス権限がありません。
          </div>
        )}
        {searchParams.error === 'supabase_config' && (
          <div
            className="badge badge-warn"
            style={{ marginBottom: 12, padding: 8, display: 'block', whiteSpace: 'pre-line' }}
          >
            {'Supabase設定が未完了です。\nまず .env の NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。'}
          </div>
        )}

        <LoginForm next={searchParams.next ?? '/'} />
      </div>
    </div>
  );
}
