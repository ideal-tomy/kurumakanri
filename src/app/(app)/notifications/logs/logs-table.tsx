'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/badge';
import { useToast } from '@/components/toast';
import { formatDateTime } from '@/lib/format';
import type { NotificationJobRow, NotificationLogRow } from '@/lib/supabase/types';

type RowItem = NotificationJobRow & {
  customers: { name: string; email: string | null; line_user_id: string | null };
  logs: Pick<NotificationLogRow, 'id' | 'result' | 'sent_at' | 'provider_message_id' | 'error_message'>[];
};

function retryHint(rawError: string | null | undefined): string {
  const e = (rawError ?? '').toUpperCase();
  if (!e) return '-';
  if (e.includes('NO_LINE_USER_ID')) return 'LINE未紐付。顧客に友だち追加/紐付け依頼後に再送';
  if (e.includes('MISSING_LINE_ACCESS_TOKEN')) return '環境変数不足。管理者へ連絡';
  if (e.includes('HTTP_401') || e.includes('HTTP_403')) return '認証/権限エラー。管理者へ連絡してトークン再設定';
  if (e.includes('HTTP_429')) return 'レート制限。時間を空けて再送';
  if (e.includes('NETWORK')) return '一時通信エラー。5分後に再送';
  return '再送で改善しない場合は管理者へ連絡';
}

export function LogsTable({
  rows,
  initial,
}: {
  rows: RowItem[];
  initial: { status?: string; channel?: string; q?: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initial.status ?? '');
  const [channel, setChannel] = useState(initial.channel ?? '');
  const [q, setQ] = useState(initial.q ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function applyFilter() {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (channel) sp.set('channel', channel);
    if (q) sp.set('q', q);
    router.push(`/notifications/logs?${sp.toString()}`);
  }

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
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

  async function retry(channelOverride?: 'LINE' | 'MAIL') {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size}件を再送します。よろしいですか？`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/notifications/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_ids: Array.from(selected),
          channel_override: channelOverride,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.show('再送をリクエストしました');
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.show(`再送失敗: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="filter-bar">
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
        <button className="btn" onClick={applyFilter}>適用</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" disabled={busy || selected.size === 0} onClick={() => retry()}>
            選択を再送
          </button>
          <button className="btn" disabled={busy || selected.size === 0} onClick={() => retry('LINE')}>
            LINEで再送
          </button>
          <button className="btn" disabled={busy || selected.size === 0} onClick={() => retry('MAIL')}>
            メールで再送
          </button>
        </div>
      </div>

      <div className="table-wrap">
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
                const lastLog = r.logs[0];
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
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
                            : r.status === 'FAILED'
                            ? 'danger'
                            : r.status === 'CANCELLED'
                            ? 'warn'
                            : 'neutral'
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td>{lastLog?.result ?? '-'}</td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {r.last_error ?? lastLog?.error_message ?? '-'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {retryHint(r.last_error ?? lastLog?.error_message)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
