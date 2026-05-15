import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { Badge, priorityVariant } from '@/components/badge';
import { NextActions } from '@/components/next-actions';
import { formatDate, priorityLabel } from '@/lib/format';
import type {
  CustomerOverviewRow,
  NotificationLogRow,
} from '@/lib/supabase/types';
import { getUrgencyLevel } from '@/lib/urgency';

export const dynamic = 'force-dynamic';

async function loadKpis() {
  const supabase = getServerSupabase();
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);
  const [vehicles, w90, w180, quotes, weeklyCandidates, failedWeekly] = await Promise.all([
    supabase.from('vehicles').select('id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_90').select('customer_id', { count: 'exact', head: true }),
    supabase.from('v_targets_shaken_180').select('customer_id', { count: 'exact', head: true }),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .gte('issued_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase
      .from('v_priority_queue')
      .select('queue_id', { count: 'exact', head: true })
      .eq('source_type', 'AUTO')
      .in('status', ['OPEN', 'IN_PROGRESS']),
    supabase
      .from('notification_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'FAILED')
      .gte('created_at', weekStart.toISOString()),
  ]);
  return {
    vehicles: vehicles.count ?? 0,
    within90: w90.count ?? 0,
    within180: w180.count ?? 0,
    quotesThisMonth: quotes.count ?? 0,
    weeklyCandidates: weeklyCandidates.count ?? 0,
    failedWeekly: failedWeekly.count ?? 0,
  };
}

async function loadUpcoming(): Promise<CustomerOverviewRow[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('v_customer_overview')
    .select('*')
    .not('vehicle_id', 'is', null)
    .gte('days_until_inspection', 0)
    .order('days_until_inspection', { ascending: true })
    .limit(8);
  return (data ?? []) as CustomerOverviewRow[];
}

async function loadRecentLogs() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('notification_logs')
    .select('id, result, sent_at, provider, error_message, job_id')
    .order('sent_at', { ascending: false })
    .limit(8);
  return (data ?? []) as Pick<NotificationLogRow, 'id' | 'result' | 'sent_at' | 'provider' | 'error_message' | 'job_id'>[];
}

export default async function DashboardPage() {
  const managerContact = process.env.NEXT_PUBLIC_OPS_MANAGER_CONTACT ?? '管理者';
  const [kpis, upcoming, logs] = await Promise.all([
    loadKpis(),
    loadUpcoming(),
    loadRecentLogs(),
  ]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <div className="page-sub">
            車検期限と通知運用の状況を一覧できます
          </div>
          <div className="page-sub">週次運用: 担当1名 + バックアップ1名 / 障害時連絡先: {managerContact}</div>
        </div>
        <div className="page-actions">
          <Link href="/" className="btn">
            優先を開く
          </Link>
          <Link href="/customers/new" className="btn btn-primary">
            + 顧客を追加
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label="登録車両数" value={kpis.vehicles} unit="台" />
        <Kpi label="90日以内" value={kpis.within90} unit="件" trend="warn" />
        <Kpi label="180日以内" value={kpis.within180} unit="件" />
        <Kpi label="今月の見積発行" value={kpis.quotesThisMonth} unit="件" />
        <Kpi label="今週送信候補" value={kpis.weeklyCandidates} unit="件" trend="warn" />
        <Kpi label="今週FAILED" value={kpis.failedWeekly} unit="件" trend={kpis.failedWeekly > 0 ? 'warn' : undefined} />
      </div>

      <div className="content-grid">
        <section className="panel">
          <header className="panel-header">
            <div className="panel-title">期限が近い顧客</div>
            <Link href="/customers" className="panel-link">
              顧客一覧へ →
            </Link>
          </header>
          {/* PC: テーブル */}
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>顧客</th>
                  <th>車両</th>
                  <th>満了日</th>
                  <th>残日数</th>
                  <th>優先度</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">表示できる顧客がありません</div>
                    </td>
                  </tr>
                ) : (
                  upcoming.map((row) => (
                    <tr key={`${row.customer_id}-${row.vehicle_id}`}>
                      <td>
                        <div className="cust-name">{row.name}</div>
                        <div className="cust-meta">{row.phone ?? '-'}</div>
                      </td>
                      <td>
                        <div>
                          {row.maker} {row.model}
                        </div>
                        <span className="plate">{row.plate}</span>
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
                      <td>
                        <Badge variant={priorityVariant(row.days_until_inspection)}>
                          {priorityVariant(row.days_until_inspection) === 'danger'
                            ? '緊急'
                            : priorityVariant(row.days_until_inspection) === 'warn'
                            ? '近接'
                            : '余裕'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* モバイル: カード */}
          <ul className="list-card-list mobile-only">
            {upcoming.length === 0 ? (
              <li className="empty" style={{ padding: 16 }}>
                表示できる顧客がありません
              </li>
            ) : (
              upcoming.map((row) => {
                const urgency = getUrgencyLevel(row.days_until_inspection ?? null);
                return (
                  <li
                    key={`${row.customer_id}-${row.vehicle_id}`}
                    className={`list-card ${urgency}`}
                  >
                    <div className="list-card-row">
                      <div className="list-card-main">
                        <Link href={`/customers/${row.customer_id}`} className="list-card-name">
                          {row.name}
                        </Link>
                        <div className="list-card-meta">{row.phone ?? '電話番号未登録'}</div>
                        <div className="list-card-vehicle">
                          <span>
                            {row.maker} {row.model}
                          </span>
                          {row.plate && <span className="plate">{row.plate}</span>}
                        </div>
                      </div>
                      <div className="list-card-side">
                        <div className={`list-card-days ${urgency}`}>
                          {priorityLabel(row.days_until_inspection)}
                        </div>
                        <div className="list-card-days-sub">
                          {formatDate(row.inspection_expire_date) || '満了日未設定'}
                        </div>
                      </div>
                    </div>
                    <div className="list-card-actions">
                      <Badge variant={priorityVariant(row.days_until_inspection)}>
                        {priorityVariant(row.days_until_inspection) === 'danger'
                          ? '緊急'
                          : priorityVariant(row.days_until_inspection) === 'warn'
                            ? '近接'
                            : '余裕'}
                      </Badge>
                      <Link
                        className="btn btn-sm list-card-cta"
                        href={`/customers/${row.customer_id}`}
                      >
                        詳細
                      </Link>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div className="panel-title">直近の配信履歴</div>
            <Link href="/history" className="panel-link">
              すべて見る →
            </Link>
          </header>
          {/* PC: テーブル */}
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>日時</th>
                  <th>結果</th>
                  <th>チャネル</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty">まだ送信履歴がありません</div>
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td>{formatDate(l.sent_at)}</td>
                      <td>
                        <Badge
                          variant={
                            l.result === 'SUCCESS'
                              ? 'success'
                              : l.result === 'BOUNCED' || l.result === 'COMPLAINED'
                              ? 'warn'
                              : 'danger'
                          }
                        >
                          {l.result}
                        </Badge>
                      </td>
                      <td>{l.provider}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* モバイル: カード */}
          <ul className="list-card-list mobile-only">
            {logs.length === 0 ? (
              <li className="empty" style={{ padding: 16 }}>
                まだ送信履歴がありません
              </li>
            ) : (
              logs.map((l) => (
                <li key={l.id} className="list-card">
                  <div className="list-card-row">
                    <div className="list-card-main">
                      <div className="list-card-name" style={{ fontSize: 14 }}>
                        {formatDate(l.sent_at) || '送信日時不明'}
                      </div>
                      <div className="list-card-meta">{l.provider}</div>
                    </div>
                    <div className="list-card-side">
                      <Badge
                        variant={
                          l.result === 'SUCCESS'
                            ? 'success'
                            : l.result === 'BOUNCED' || l.result === 'COMPLAINED'
                              ? 'warn'
                              : 'danger'
                        }
                      >
                        {l.result}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <NextActions
        items={[
          { href: '/', label: 'ホーム（通知リスト）', primary: true },
          { href: '/customers', label: '顧客一覧' },
          { href: '/customers/new', label: '+ 顧客を追加' },
          { href: '/line/unmatched', label: 'LINE未マッチ' },
          { href: '/history', label: '送付履歴' },
        ]}
      />
    </>
  );
}

function Kpi({
  label,
  value,
  unit,
  trend,
}: {
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'warn';
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div>
        <span className="kpi-value">{value.toLocaleString('ja-JP')}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {trend && (
        <div className={`kpi-trend ${trend}`}>
          {trend === 'up' ? '↑ 増加傾向' : '注意'}
        </div>
      )}
    </div>
  );
}
