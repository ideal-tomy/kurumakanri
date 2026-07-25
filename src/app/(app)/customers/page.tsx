import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { Badge, priorityVariant } from '@/components/badge';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { formatDate, formatDateTime, formatKm, formatYen, priorityLabel } from '@/lib/format';
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
  if (params.filter === 'no_line') {
    query = query.is('line_user_id', null);
  }
  if (params.filter === 'no_quote') {
    query = query.is('latest_quote_id', null);
  }
  if (params.filter === 'stale_line') {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    const iso = d.toISOString();
    query = query.or(`last_line_sent_at.is.null,last_line_sent_at.lt.${iso}`);
  }

  const { data } = await query;
  return (data ?? []) as CustomerOverviewRow[];
}

async function loadMonthlyNotifyStats(): Promise<{ sent: number; failed: number }> {
  const supabase = getServerSupabase();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const iso = monthStart.toISOString();
  const [ok, bad] = await Promise.all([
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('result', 'SUCCESS')
      .gte('sent_at', iso),
    supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .in('result', ['FAILED', 'BOUNCED', 'COMPLAINED'])
      .gte('sent_at', iso),
  ]);
  return { sent: ok.count ?? 0, failed: bad.count ?? 0 };
}

function firstChar(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  return name.trim().slice(0, 1);
}

function contactPill(row: CustomerOverviewRow): { text: string; level: 'critical' | 'warning' | 'normal' } {
  const days = row.days_until_inspection;
  const rule = row.next_notification_rule ?? '次回連絡';
  const due = row.next_notification_due_at ?? row.inspection_expire_date;
  const datePart = due ? formatDate(due) : '';
  const text = `${rule}${datePart ? ` ${datePart}` : ''}`.trim();
  if (days != null && days < 0) return { text: '期限切れフォロー', level: 'critical' };
  if (days != null && days <= 30) return { text: text || '緊急', level: 'critical' };
  if (days != null && days <= 90) return { text: text || '近接', level: 'warning' };
  return { text: text || '—', level: 'normal' };
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [customers, stats] = await Promise.all([loadCustomers(searchParams), loadMonthlyNotifyStats()]);

  return (
    <>
      <div className="desktop-only">
        <PageBack href="/" label="ホームへ戻る" />
      </div>

      <div className="page-header mobile-page-header-hide">
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

      <div className="customers-mobile-stats mobile-only">
        <Link href="/dashboard" className="customers-stats-chip">
          今月送付 {stats.sent}件 / 失敗 {stats.failed}件 · 経営サマリ →
        </Link>
      </div>

      <div className="mobile-only" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>顧客 {customers.length} 件</div>
      </div>

      <nav className="customers-filter-chips mobile-only" aria-label="表示の絞り込み">
        {[
          { filter: '', label: 'すべて' },
          { filter: '90', label: '90日以内' },
          { filter: '180', label: '180日以内' },
          { filter: 'expired', label: '期限切れ' },
          { filter: 'no_line', label: 'LINE未連携' },
          { filter: 'stale_line', label: 'LINE久々' },
          { filter: 'no_quote', label: '見積なし' },
        ].map((c) => {
          const href = (() => {
            const sp = new URLSearchParams();
            if (searchParams.q) sp.set('q', searchParams.q);
            if (c.filter) sp.set('filter', c.filter);
            const q = sp.toString();
            return q ? `/customers?${q}` : '/customers';
          })();
          const active =
            c.filter === ''
              ? !searchParams.filter
              : searchParams.filter === c.filter;
          return (
            <Link key={c.filter || 'all'} href={href} className={`customers-filter-chip ${active ? 'active' : ''}`}>
              {c.label}
            </Link>
          );
        })}
      </nav>

      <section className="panel">
        <form method="GET" className="filter-bar desktop-only">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            type="search"
            name="q"
            placeholder="氏名・ナンバー・電話番号"
            defaultValue={searchParams.q ?? ''}
          />
          <select className="select" style={{ maxWidth: 220 }} name="filter" defaultValue={searchParams.filter ?? ''}>
            <option value="">すべて</option>
            <option value="90">90日以内</option>
            <option value="180">180日以内</option>
            <option value="expired">期限切れ</option>
            <option value="no_line">LINE未連携</option>
            <option value="stale_line">3か月以上LINE未送信</option>
            <option value="no_quote">見積未作成</option>
          </select>
          <button className="btn" type="submit">
            検索
          </button>
        </form>

        <div className="table-wrap desktop-only">
          <table>
            <thead>
              <tr>
                <th>顧客</th>
                <th>車両</th>
                <th>満了日</th>
                <th>残日数</th>
                <th>次の連絡</th>
                <th>最終LINE</th>
                <th>見積</th>
                <th>推定走行</th>
                <th>優先度</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={10}>
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
                    <td className="cust-meta" style={{ fontSize: 12, maxWidth: 200 }}>
                      {row.next_notification_rule ? (
                        <>
                          {row.next_notification_rule}
                          <br />
                          {formatDate(row.next_notification_due_at ?? row.inspection_expire_date)}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="cust-meta" style={{ fontSize: 12 }}>
                      {row.last_line_sent_at ? formatDateTime(row.last_line_sent_at) : '—'}
                    </td>
                    <td className="cust-meta" style={{ fontSize: 12 }}>
                      {row.latest_quote_grand_total != null ? formatYen(row.latest_quote_grand_total) : '—'}
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

        <ul className="customers-compact-list mobile-only">
          {customers.length === 0 ? (
            <li className="empty" style={{ padding: 16 }}>
              該当する顧客がありません
            </li>
          ) : (
            customers.map((row) => {
              const pill = contactPill(row);
              const plate = row.plate?.trim() || null;
              const vehicleLabel = row.vehicle_id
                ? `${row.maker ?? ''} ${row.model ?? ''}`.trim() || '車種不明'
                : '車両未登録';
              const hasLine = Boolean(row.line_user_id);
              return (
                <li key={`${row.customer_id}-${row.vehicle_id ?? 'none'}`} style={{ listStyle: 'none' }}>
                  <Link href={`/customers/${row.customer_id}`} className="customers-compact-row">
                    <div className="customers-compact-avatar">{firstChar(row.name)}</div>
                    <div className="customers-compact-main">
                      <div className="customers-compact-name">{row.name ?? '（無名）'} 様</div>
                      {plate ? (
                        <div className="customers-compact-plate">{plate}</div>
                      ) : (
                        <div className="customers-compact-plate customers-compact-plate-empty">ナンバー未登録</div>
                      )}
                      <div className="customers-compact-sub">
                        <span className={`customers-compact-line ${hasLine ? 'ok' : 'none'}`}>
                          {hasLine ? 'LINE済' : 'LINEなし'}
                        </span>
                        <span className="customers-compact-vehicle">{vehicleLabel}</span>
                      </div>
                    </div>
                    <div className={`customers-compact-pill ${pill.level}`}>{pill.text}</div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <Link href="/customers/new" className="customers-fab mobile-only" aria-label="顧客を追加" title="顧客を追加">
        +
      </Link>

      <div className="desktop-only">
        <NextActions
          items={[
            { href: '/customers/new', label: '+ 顧客を追加', primary: true },
            { href: '/', label: 'ホーム' },
            { href: '/line/unmatched', label: 'LINE未マッチ' },
          ]}
        />
      </div>
    </>
  );
}
