import { verifyOptOutToken } from '@/lib/optout';
import { getServiceSupabase } from '@/lib/supabase/server';
import type { CustomerRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { token: string };
  searchParams: { confirm?: string };
}

async function loadCustomer(customerId: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('customers')
    .select('id, name')
    .eq('id', customerId)
    .maybeSingle<Pick<CustomerRow, 'id' | 'name'>>();
  return data;
}

async function applyOptOut(customerId: string, channel: string) {
  const supabase = getServiceSupabase();
  await supabase.from('consents').upsert(
    {
      customer_id: customerId,
      channel,
      opt_in: false,
      opt_out_at: new Date().toISOString(),
      source: 'public_link',
    },
    { onConflict: 'customer_id,channel' },
  );
  await supabase.from('audit_logs').insert({
    action: 'consent.public_optout',
    resource: 'consents',
    resource_id: customerId,
    payload: { channel },
  });
}

export default async function OptOutPage({ params, searchParams }: PageProps) {
  const decoded = verifyOptOutToken(params.token);
  if (!decoded) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="brand-name">配信停止リンクが無効です</h1>
          <p className="page-sub" style={{ marginTop: 12 }}>
            URL の有効期限が切れているか、不正なリンクです。お手数ですが運営までご連絡ください。
          </p>
        </div>
      </div>
    );
  }

  const customer = await loadCustomer(decoded.customerId);

  if (searchParams.confirm === '1') {
    await applyOptOut(decoded.customerId, decoded.channel);
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="brand-name">配信を停止しました</h1>
          <p className="page-sub" style={{ marginTop: 12 }}>
            {customer?.name ?? 'お客様'} 様の {decoded.channel} 通知を停止しました。
            <br />
            再開をご希望の場合は、お電話で店舗までご連絡ください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="brand-name">配信停止</h1>
        <p style={{ marginTop: 12 }}>
          {customer?.name ?? 'お客様'} 様の {decoded.channel} 通知を停止します。
          <br />
          下のボタンを押すと配信が停止されます。
        </p>
        <form method="GET" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <input type="hidden" name="confirm" value="1" />
          <button className="btn btn-danger" type="submit">
            配信を停止する
          </button>
          <a href="/" className="btn">
            キャンセル
          </a>
        </form>
      </div>
    </div>
  );
}
