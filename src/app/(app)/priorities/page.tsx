import { NextActions } from '@/components/next-actions';
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
      <NextActions
        items={[
          { href: '/customers', label: '顧客一覧' },
          { href: '/customers/new', label: '+ 顧客を追加', primary: true },
          { href: '/lists/shaken-90', label: '車検3か月前リスト' },
          { href: '/lists/shaken-180', label: '車検半年前リスト' },
          { href: '/lists/oil', label: 'オイル交換目安' },
          { href: '/line/unmatched', label: 'LINE未マッチ' },
          { href: '/notifications/logs', label: '配信履歴' },
        ]}
      />
    </>
  );
}
