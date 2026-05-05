import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { Badge, priorityVariant } from '@/components/badge';
import { formatDate, formatKm, priorityLabel } from '@/lib/format';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  filter?: string;
}

async function loadCustomers(params: SearchParams): Promise<CustomerOverviewRow[]> {
  const supabase = getServerSupabase();
  let query = supabase
    .from('v_customer_overview')
    .select('*')
    .order('days_until_inspection', { ascending: true, nullsFirst: false });

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,plate.ilike.%${params.q}%,phone.ilike.%${params.q}%`);
  }
  if (params.filter === '90') {
    query = query.gte('days_until_inspection', 0).lte('days_until_inspection', 90);
  }
  if (params.filter === '180') {
    query = query.gte('days_until_inspection', 0).lte('days_until_inspection', 180);
  }
  if (params.filter === 'expired') {
    query = query.lt('days_until_inspection', 0);
  }

  const { data } = await query;
  return (data ?? []) as CustomerOverviewRow[];
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const customers = await loadCustomers(searchParams);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">顧客一覧</h1>
          <div className="page-sub">登録顧客と車両の一覧</div>
        </div>
        <div className="page-actions">
          <Link href="/customers/new" className="btn btn-primary">
            + 顧客を追加
          </Link>
        </div>
      </div>

      <section className="panel">
        <form method="GET" className="filter-bar">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            type="search"
            name="q"
            placeholder="氏名・ナンバー・電話番号"
            defaultValue={searchParams.q ?? ''}
          />
          <select className="select" style={{ maxWidth: 200 }} name="filter" defaultValue={searchParams.filter ?? ''}>
            <option value="">すべて</option>
            <option value="90">90日以内</option>
            <option value="180">180日以内</option>
            <option value="expired">期限切れ</option>
          </select>
          <button className="btn" type="submit">
            検索
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>顧客</th>
                <th>車両</th>
                <th>満了日</th>
                <th>残日数</th>
                <th>推定走行</th>
                <th>優先度</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">該当する顧客がありません</div>
                  </td>
                </tr>
              ) : (
                customers.map((row) => (
                  <tr key={`${row.customer_id}-${row.vehicle_id ?? 'none'}`}>
                    <td>
                      <div className="cust-name">{row.name}</div>
                      <div className="cust-meta">{row.phone ?? '-'}</div>
                    </td>
                    <td>
                      {row.vehicle_id ? (
                        <>
                          <div>
                            {row.maker} {row.model}
                          </div>
                          <span className="plate">{row.plate}</span>
                        </>
                      ) : (
                        <span className="cust-meta">未登録</span>
                      )}
                    </td>
                    <td>{formatDate(row.inspection_expire_date)}</td>
                    <td>
                      <span
                        className={`days-left ${
                          (row.days_until_inspection ?? 999) <= 30
                            ? 'urgent'
                            : (row.days_until_inspection ?? 999) <= 90
                            ? 'warn'
                            : 'ok'
                        }`}
                      >
                        {priorityLabel(row.days_until_inspection)}
                      </span>
                    </td>
                    <td>{formatKm(row.estimated_mileage)}</td>
                    <td>
                      <Badge variant={priorityVariant(row.days_until_inspection)}>
                        {priorityVariant(row.days_until_inspection) === 'danger'
                          ? '緊急'
                          : priorityVariant(row.days_until_inspection) === 'warn'
                          ? '近接'
                          : '余裕'}
                      </Badge>
                    </td>
                    <td>
                      <Link className="btn btn-sm" href={`/customers/${row.customer_id}`}>
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
