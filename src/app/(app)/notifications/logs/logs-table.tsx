'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/badge';
import { useToast } from '@/components/toast';
import { formatDateTime } from '@/lib/format';
import type { NotificationJobRow, NotificationLogRow } from '@/lib/supabase/types';

type RowItem = NotificationJobRow & {
  customers: { name: string; email: string | null; line_user_id: string | null };
  logs: Pick<NotificationLogRow, 'id' | 'result' | 'sent_at' | 'provider_message_id' | 'error_message'>[];
  /** 同種の後続 SENT があり、要対応ではない過去失敗 */
  failureResolved?: boolean;
};

function retryHint(rawError: string | null | undefined): string {
  const e = (rawError ?? '').toUpperCase();
  if (!e) return '-';
  if (e.includes('NO_LINE_USER_ID') || e.includes('LINE USERID') || e.includes('友だち追加')) {
    return 'LINE未紐付。顧客に友だち追加/紐付け依頼後に再送';
  }
  if (e.includes('MISSING_LINE_ACCESS_TOKEN')) return '環境変数不足。管理者へ連絡';
  if (e.includes('HTTP_401') || e.includes('HTTP_403') || e.includes('AUTHENTICATION FAILED')) {
    return '認証/権限エラー。管理者へ連絡してトークン再設定';
  }
  if (e.includes('HTTP_429')) return 'レート制限。時間を空けて再送';
  if (e.includes('NETWORK')) return '一時通信エラー。5分後に再送';
  return '再送で改善しない場合は管理者へ連絡';
}

function logsListHref(
  basePath: string,
  p: { status?: string; channel?: string; unresolved?: string },
): string {
  const sp = new URLSearchParams();
  if (p.status) sp.set('status', p.status);
  if (p.channel) sp.set('channel', p.channel);
  if (p.unresolved) sp.set('unresolved', p.unresolved);
  const q = sp.toString();
  return q ? `${basePath}?${q}` : basePath;
}

function latestLog(logs: RowItem['logs']) {
  if (logs.length === 0) return undefined;
  return [...logs].sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at))[0];
}

export function LogsTable({
  rows,
  initial,
  basePath = '/history',
  homeHref = '/',
}: {
  rows: RowItem[];
  initial: { status?: string; channel?: string; q?: string; unresolved?: string };
  /** 一覧・フィルタのベースURL（旧 /notifications/logs） */
  basePath?: string;
  /** モバイル「新規送付」導線 */
  homeHref?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initial.status ?? '');
  const [channel, setChannel] = useState(initial.channel ?? '');
  const [q, setQ] = useState(initial.q ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(initial.status ?? '');
    setChannel(initial.channel ?? '');
    setQ(initial.q ?? '');
  }, [initial.status, initial.channel, initial.q]);

  function applyFilter() {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (channel) sp.set('channel', channel);
    if (q) sp.set('q', q);
    if (initial.unresolved === '1' && status === 'FAILED') sp.set('unresolved', '1');
    router.push(`${basePath}?${sp.toString()}`);
  }

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.customers.name.toLowerCase().includes(needle) ||
        (r.customers.email ?? '').toLowerCase().includes(needle) ||
        r.template_key.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function retryJobs(jobIds: string[], channelOverride?: 'LINE' | 'MAIL') {
    if (jobIds.length === 0) return;
    if (!window.confirm(`${jobIds.length}件を再送します。よろしいですか？`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/notifications/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_ids: jobIds,
          channel_override: channelOverride,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as {
        results?: { status: string }[];
      };
      const results = json.results ?? [];
      const sent = results.filter((r) => r.status === 'SENT').length;
      const failed = results.filter((r) => r.status === 'FAILED').length;
      if (sent > 0 && failed === 0) {
        toast.show(`再送成功 ${sent}件（過去の失敗履歴は残ります）`);
      } else if (sent > 0) {
        toast.show(`再送: 成功 ${sent}件 / 失敗 ${failed}件`);
      } else {
        toast.show(failed > 0 ? `再送失敗 ${failed}件` : '再送をリクエストしました');
      }
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.show(`再送失敗: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function retry(channelOverride?: 'LINE' | 'MAIL') {
    void retryJobs(Array.from(selected), channelOverride);
  }

  function retryOne(id: string, channelOverride?: 'LINE' | 'MAIL') {
    void retryJobs([id], channelOverride);
  }

  const unresolvedFilterActive = initial.unresolved === '1';

  return (
    <section className="panel">
      <div className="filter-bar desktop-only">
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">すべての状態</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select className="select" style={{ maxWidth: 140 }} value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">すべてのチャネル</option>
          <option value="LINE">LINE</option>
          <option value="MAIL">MAIL</option>
        </select>
        <input className="input" style={{ maxWidth: 240 }} placeholder="顧客名・テンプレ" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn" onClick={applyFilter}>
          適用
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="btn" disabled={busy || selected.size === 0} onClick={() => retry()}>
            選択を再送
          </button>
          <button type="button" className="btn" disabled={busy || selected.size === 0} onClick={() => retry('LINE')}>
            LINEで再送
          </button>
          <button type="button" className="btn" disabled={busy || selected.size === 0} onClick={() => retry('MAIL')}>
            メールで再送
          </button>
        </div>
      </div>

      <div className="logs-mobile-intro mobile-only">
        <p className="logs-mobile-intro-text">
          未解消の失敗だけ要対応です。過去の失敗履歴は残ります。新規の案内は
          <Link href={homeHref} className="logs-mobile-home-link">
            ホーム
          </Link>
          から。
        </p>
        <div className="logs-mobile-filter-chips">
          <a className={`logs-chip ${!initial.status && !unresolvedFilterActive ? 'active' : ''}`} href={basePath}>
            すべて
          </a>
          <a
            className={`logs-chip ${unresolvedFilterActive ? 'active' : ''}`}
            href={logsListHref(basePath, { status: 'FAILED', unresolved: '1' })}
          >
            要対応の失敗
          </a>
          <a
            className={`logs-chip ${initial.status === 'FAILED' && !unresolvedFilterActive ? 'active' : ''}`}
            href={logsListHref(basePath, { status: 'FAILED' })}
          >
            失敗履歴
          </a>
          <a
            className={`logs-chip ${!initial.channel ? 'active' : ''}`}
            href={logsListHref(basePath, {
              status: initial.status,
              unresolved: unresolvedFilterActive ? '1' : undefined,
            })}
          >
            全チャネル
          </a>
          <a
            className={`logs-chip ${initial.channel === 'LINE' ? 'active' : ''}`}
            href={logsListHref(basePath, {
              status: initial.status,
              channel: 'LINE',
              unresolved: unresolvedFilterActive ? '1' : undefined,
            })}
          >
            LINE
          </a>
          <a
            className={`logs-chip ${initial.channel === 'MAIL' ? 'active' : ''}`}
            href={logsListHref(basePath, {
              status: initial.status,
              channel: 'MAIL',
              unresolved: unresolvedFilterActive ? '1' : undefined,
            })}
          >
            メール
          </a>
        </div>
      </div>

      <div className="table-wrap desktop-only">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>送信日時</th>
              <th>顧客</th>
              <th>チャネル</th>
              <th>テンプレ</th>
              <th>状態</th>
              <th>結果</th>
              <th>エラー</th>
              <th>運用ガイド</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty">該当ジョブがありません</div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const lastLog = latestLog(r.logs);
                const resolved = Boolean(r.failureResolved && r.status === 'FAILED');
                const err =
                  r.status === 'SENT'
                    ? null
                    : resolved
                      ? r.last_error ?? lastLog?.error_message ?? null
                      : r.last_error ?? lastLog?.error_message ?? null;
                const resultLabel =
                  r.status === 'SENT'
                    ? (lastLog?.result === 'SUCCESS' || !lastLog?.result ? 'SUCCESS' : lastLog.result)
                    : resolved
                      ? '解消済'
                      : (lastLog?.result ?? '-');
                return (
                  <tr key={r.id} className={resolved ? 'logs-row-resolved' : undefined}>
                    <td>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td>{r.customers.name}</td>
                    <td>
                      <Badge variant={r.channel === 'LINE' ? 'info' : 'neutral'}>{r.channel}</Badge>
                    </td>
                    <td>{r.template_key}</td>
                    <td>
                      <Badge
                        variant={
                          r.status === 'SENT'
                            ? 'success'
                            : resolved
                              ? 'neutral'
                              : r.status === 'FAILED'
                                ? 'danger'
                                : r.status === 'CANCELLED'
                                  ? 'warn'
                                  : 'neutral'
                        }
                      >
                        {resolved ? 'FAILED（解消済）' : r.status}
                      </Badge>
                    </td>
                    <td>{resultLabel}</td>
                    <td style={{ maxWidth: 280 }}>
                      {resolved ? (
                        <span className="logs-resolved-note">
                          過去の失敗（その後の再送で成功）
                          {err ? <span className="logs-resolved-detail"> — {err}</span> : null}
                        </span>
                      ) : r.status === 'SENT' ? (
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>-</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{err ?? '-'}</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {resolved ? '要対応ではありません' : retryHint(err)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ul className="logs-mobile-list mobile-only">
        {filtered.length === 0 ? (
          <li className="empty" style={{ padding: 20 }}>
            該当がありません
          </li>
        ) : (
          filtered.map((r) => {
            const lastLog = latestLog(r.logs);
            const resolved = Boolean(r.failureResolved && r.status === 'FAILED');
            const err =
              r.status === 'SENT'
                ? null
                : r.last_error ?? lastLog?.error_message ?? null;
            const canRetry = r.status === 'FAILED' && !resolved;
            const resultLabel =
              r.status === 'SENT'
                ? (lastLog?.result === 'SUCCESS' || !lastLog?.result ? 'SUCCESS' : lastLog.result)
                : resolved
                  ? '解消済'
                  : (lastLog?.result ?? '—');
            return (
              <li
                key={r.id}
                className={`logs-mobile-card${resolved ? ' logs-mobile-card-resolved' : ''}`}
              >
                <label className="logs-mobile-card-head">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="logs-mobile-check" />
                  <span className="logs-mobile-name">{r.customers.name}</span>
                </label>
                <div className="logs-mobile-meta">
                  <span>{formatDateTime(r.created_at)}</span>
                  <Badge variant={r.channel === 'LINE' ? 'info' : 'neutral'}>{r.channel}</Badge>
                  <Badge
                    variant={
                      r.status === 'SENT'
                        ? 'success'
                        : resolved
                          ? 'neutral'
                          : r.status === 'FAILED'
                            ? 'danger'
                            : r.status === 'CANCELLED'
                              ? 'warn'
                              : 'neutral'
                    }
                  >
                    {resolved ? 'FAILED（解消済）' : r.status}
                  </Badge>
                  <span className="logs-mobile-result">{resultLabel}</span>
                </div>
                <div className="logs-mobile-template">{r.template_key}</div>
                {resolved ? (
                  <div className="logs-mobile-resolved">
                    <span className="logs-mobile-resolved-label">過去の失敗</span>
                    その後の再送で成功しています（要対応ではありません）
                    {err ? <div className="logs-mobile-resolved-detail">{err}</div> : null}
                  </div>
                ) : r.status === 'FAILED' || err ? (
                  <div className="logs-mobile-error">
                    <span className="logs-mobile-error-label">エラー</span>
                    {err ?? '—'}
                  </div>
                ) : null}
                {canRetry ? <div className="logs-mobile-hint">{retryHint(err)}</div> : null}
                {canRetry && (
                  <div className="logs-mobile-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => retryOne(r.id, r.channel === 'MAIL' ? 'MAIL' : 'LINE')}
                    >
                      この件を再送
                    </button>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>

      {selected.size > 0 ? (
        <div className="logs-mobile-selection-bar mobile-only">
          <span className="logs-mobile-selection-count">{selected.size}件選択中</span>
          <div className="logs-mobile-selection-btns">
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => retry()}>
              再送
            </button>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => retry('LINE')}>
              LINE
            </button>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => retry('MAIL')}>
              メール
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
