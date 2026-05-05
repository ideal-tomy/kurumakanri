'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';

function formatAuthError(
  message: string,
  err?: { code?: string; message: string },
): string {
  const code = err?.code?.toLowerCase() ?? '';
  const lower = message.toLowerCase();
  if (
    code === 'invalid_credentials' ||
    lower.includes('invalid login credentials')
  ) {
    return [
      'ログインできませんでした。まず Authentication -> Users にこのメールのユーザーがあるか確認してください。',
      '次に、パスワードが設定済みかを確認してください（招待だけでは未設定のことがあります）。',
      'Confirm email が ON の場合は、確認メールのリンクを開いてから再ログインしてください。',
    ].join('\n');
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return [
      'メール確認が未完了です。まず確認メールのリンクを開いてください。',
      '届かない場合は Authentication -> Users から再送し、Auth設定のメール制限ログも確認してください。',
    ].join('\n');
  }
  if (
    message === 'Failed to fetch' ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return [
      'サーバーに接続できませんでした。',
      '1) .env の NEXT_PUBLIC_SUPABASE_URL は「https://（project-ref）.supabase.co」だけです。ダッシュの「API Keys」に URL が無いときは、アドレスバーの .../project/（ID）/... の ID を使って https://（ID）.supabase.co を組み立ててください。',
      '2) ローカル（127.0.0.1:54321）の場合はターミナルで supabase start を実行してから再度お試しください。',
    ].join('\n');
  }
  return message;
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setError(formatAuthError(error.message, error));
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="form-grid">
      <div className="form-field">
        <label className="form-label">メールアドレス</label>
        <input
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label className="form-label">パスワード</label>
        <input
          className="input"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div
          className="badge badge-danger"
          style={{ padding: 8, whiteSpace: 'pre-line', textAlign: 'left' }}
        >
          {error}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  );
}
