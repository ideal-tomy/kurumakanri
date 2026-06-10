import { CustomerPortalView } from '@/components/customer-portal-view';
import { loadCustomerPortalData } from '@/lib/customer-portal-data';
import { verifyCustomerPortalToken } from '@/lib/customer-portal-share';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { token: string };
}

function PortalError({ title, message }: { title: string; message?: string }) {
  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="brand-name">{title}</h1>
        {message ? (
          <p className="page-sub" style={{ marginTop: 12 }}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default async function CustomerPortalPage({ params }: PageProps) {
  const decoded = verifyCustomerPortalToken(params.token);
  if (!decoded) {
    return (
      <PortalError
        title="リンクが無効です"
        message="URL の有効期限が切れているか、不正なリンクです。店舗までお問い合わせください。"
      />
    );
  }

  const data = await loadCustomerPortalData(decoded.customerId);
  if (!data) {
    return <PortalError title="お客様情報が見つかりません" />;
  }

  return <CustomerPortalView data={data} />;
}
