import { CustomerPortalView } from '@/components/customer-portal-view';
import { loadCustomerPortalData } from '@/lib/customer-portal-data';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { cid?: string };
}

export default async function CustomerSelfView({ searchParams }: PageProps) {
  if (!searchParams.cid) {
    return (
      <div className="customer-view" style={{ padding: 32 }}>
        <h1 className="page-title">お客様用ページ</h1>
        <div className="page-sub" style={{ marginTop: 8 }}>
          通知メッセージのリンクからアクセスしてください。
        </div>
      </div>
    );
  }

  const data = await loadCustomerPortalData(searchParams.cid);
  if (!data) {
    return (
      <div className="customer-view" style={{ padding: 32 }}>
        お客様情報が見つかりません。
      </div>
    );
  }

  return <CustomerPortalView data={data} />;
}
