import { PageBack } from '@/components/page-back';
import { CustomerWizard } from './customer-wizard';

export const dynamic = 'force-dynamic';

interface NewCustomerPageProps {
  searchParams?: { line_user_id?: string };
}

export default function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const initialLineUserId = searchParams?.line_user_id ?? '';
  const backHref = initialLineUserId ? '/line/unmatched' : '/customers';
  const backLabel = initialLineUserId ? 'LINE未マッチへ戻る' : '顧客一覧へ戻る';
  return (
    <>
      <PageBack href={backHref} label={backLabel} />
      <div className="page-header">
        <div>
          <h1 className="page-title">顧客を追加</h1>
          <div className="page-sub">3ステップで登録。途中まででも保存できます</div>
        </div>
      </div>
      <CustomerWizard initialLineUserId={initialLineUserId} />
    </>
  );
}
