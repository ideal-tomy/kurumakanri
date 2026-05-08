import { PrioritiesClient } from './priorities-client';

export const dynamic = 'force-dynamic';

export default function PrioritiesPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">今日の連絡</h1>
          <div className="page-sub">
            車検・オイル交換のタイミングでLINE/電話する顧客一覧
          </div>
        </div>
      </div>
      <PrioritiesClient />
    </>
  );
}
