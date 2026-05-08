import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { formatDateTime } from '@/lib/format';
import type { CustomerRow, LineUnmatchedRow } from '@/lib/supabase/types';
import { linkLineUserAction } from '../actions';

export const dynamic = 'force-dynamic';

interface SearchParams {
  match?: string;
  q?: string;
}

interface CandidateRow extends Pick<CustomerRow, 'id' | 'name' | 'furigana' | 'phone' | 'email' | 'line_user_id'> {}

async function loadUnmatched(): Promise<LineUnmatchedRow[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('v_line_unmatched')
    .select('*')
    .order('first_follow_at', { ascending: false });
  return (data ?? []) as LineUnmatchedRow[];
}

async function searchCandidates(q: string): Promise<CandidateRow[]> {
  if (!q.trim()) return [];
  const supabase = getServerSupabase();
  const term = q.trim();
  const { data } = await supabase
    .from('customers')
    .select('id, name, furigana, phone, email, line_user_id')
    .or(`name.ilike.%${term}%,furigana.ilike.%${term}%,phone.ilike.%${term}%`)
    .order('name', { ascending: true })
    .limit(20);
  return (data ?? []) as CandidateRow[];
}

export default async function LineUnmatchedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rows = await loadUnmatched();
  const matchTarget = searchParams.match ?? '';
  const query = searchParams.q ?? '';
  const candidates = matchTarget && query ? await searchCandidates(query) : [];

  return (
    <>
      <PageBack href="/priorities" label="今日の連絡へ戻る" />
      <div className="page-header">
        <div>
          <h1 className="page-title">LINE 未マッチ一覧</h1>
          <div className="page-sub">
            公式LINE で友だち追加されたが顧客と紐付いていない userId 一覧。氏名・電話などのメッセージから顧客を特定し、結びつけてください。
          </div>
        </div>
      </div>

      <section className="panel">
        {rows.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>
            未マッチの LINE userId はありません
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 220 }}>LINE userId</th>
                  <th style={{ width: 160 }}>追加日時</th>
                  <th>最新メッセージ</th>
                  <th style={{ width: 280 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = matchTarget === row.line_user_id;
                  return (
                    <tr key={row.line_user_id}>
                      <td>
                        <code style={{ fontSize: 12, wordBreak: 'break-all' }}>
                          {row.line_user_id}
                        </code>
                      </td>
                      <td>{formatDateTime(row.first_follow_at)}</td>
                      <td>
                        {row.last_text ? (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{row.last_text}</div>
                        ) : (
                          <span className="cust-meta">（メッセージ未受信）</span>
                        )}
                        {row.last_message_at && (
                          <div className="cust-meta">{formatDateTime(row.last_message_at)}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <Link
                            href={`/customers/new?line_user_id=${encodeURIComponent(row.line_user_id)}`}
                            className="btn btn-sm"
                          >
                            新規顧客として登録
                          </Link>
                          <details open={isOpen}>
                            <summary className="btn btn-sm" style={{ cursor: 'pointer' }}>
                              既存顧客と結びつける
                            </summary>
                            <div style={{ marginTop: 8 }}>
                              <form method="GET" className="filter-bar" style={{ padding: 0, marginBottom: 8 }}>
                                <input
                                  type="hidden"
                                  name="match"
                                  value={row.line_user_id}
                                />
                                <input
                                  className="input"
                                  type="search"
                                  name="q"
                                  placeholder="氏名・フリガナ・電話で検索"
                                  defaultValue={isOpen ? query : ''}
                                />
                                <button className="btn btn-sm" type="submit">
                                  検索
                                </button>
                              </form>
                              {isOpen && query && (
                                <CandidateList
                                  candidates={candidates}
                                  lineUserId={row.line_user_id}
                                />
                              )}
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 16, color: 'var(--ink-3)', fontSize: 12 }}>
        ヒント: マッチ後は <code>customers.line_user_id</code> が更新され、本一覧から自動で外れます。
      </section>

      <NextActions
        items={[
          { href: '/customers', label: '顧客一覧' },
          { href: '/customers/new', label: '+ 顧客を追加', primary: true },
          { href: '/priorities', label: '今日の連絡' },
        ]}
      />
    </>
  );
}

function CandidateList({
  candidates,
  lineUserId,
}: {
  candidates: CandidateRow[];
  lineUserId: string;
}) {
  if (candidates.length === 0) {
    return <div className="empty">該当する顧客がいません</div>;
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {candidates.map((c) => (
        <li
          key={c.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
          }}
        >
          <div>
            <div className="cust-name">{c.name}</div>
            <div className="cust-meta">
              {c.furigana ? `${c.furigana} / ` : ''}
              {c.phone ?? '電話未登録'}
              {c.line_user_id ? ' / LINE 紐付け済み' : ''}
            </div>
          </div>
          <form action={linkLineUserAction}>
            <input type="hidden" name="customer_id" value={c.id} />
            <input type="hidden" name="line_user_id" value={lineUserId} />
            <button
              className="btn btn-sm btn-primary"
              type="submit"
              disabled={Boolean(c.line_user_id)}
            >
              結びつける
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
