'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, priorityVariant } from '@/components/badge';
import { useToast } from '@/components/toast';
import { formatDate, formatKm, priorityLabel } from '@/lib/format';
import type { RuleKey, RuleTarget } from '@/lib/rules';

type Channel = 'LINE' | 'MAIL' | 'BOTH';

export function TargetList({
  rule,
  targets,
}: {
  rule: RuleKey;
  targets: RuleTarget[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<Channel>('LINE');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return targets;
    const q = filter.toLowerCase();
    return targets.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.plate?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q),
    );
  }, [targets, filter]);

  const allChecked = filtered.length > 0 && filtered.every((t) => selected.has(t.customer_id));

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((t) => t.customer_id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send(target: 'one' | 'batch', customerId?: string) {
    const ids = target === 'one' && customerId ? [customerId] : Array.from(selected);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `${ids.length}件に「${channelLabel(channel)}」で送信します。よろしいですか？`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule, channel, customer_ids: ids }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'send failed');
      }
      const json = (await res.json()) as { queued: number; sent: number; failed: number };
      toast.show(
        `${json.queued}件を投入 / 送信成功 ${json.sent} 失敗 ${json.failed}`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.show(`送信に失敗しました: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="filter-bar">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="氏名・ナンバー・電話"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="select"
          style={{ maxWidth: 200 }}
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel)}
        >
          <option value="LINE">LINE のみ</option>
          <option value="MAIL">メール のみ</option>
          <option value="BOTH">両方</option>
        </select>
        <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>
          選択中: {selected.size} / {filtered.length}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            disabled={busy || selected.size === 0}
            onClick={() => send('batch')}
          >
            選択を一括送信
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th>顧客</th>
              <th>車両</th>
              <th>満了日 / 残日数</th>
              <th>推定走行</th>
              {rule === 'oil_4000km' && <th>オイル目安</th>}
              <th>連絡可</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={rule === 'oil_4000km' ? 8 : 7}>
                  <div className="empty">対象がありません</div>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.customer_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(t.customer_id)}
                      onChange={() => toggle(t.customer_id)}
                    />
                  </td>
                  <td>
                    <div className="cust-name">
                      <Link href={`/customers/${t.customer_id}`}>{t.name}</Link>
                    </div>
                    <div className="cust-meta">{t.phone ?? '-'}</div>
                  </td>
                  <td>
                    {t.maker} {t.model}
                    <div>
                      <span className="plate">{t.plate}</span>
                    </div>
                  </td>
                  <td>
                    <div>{formatDate(t.inspection_expire_date)}</div>
                    <div
                      className={`days-left ${
                        (t.days_until_inspection ?? 999) <= 30
                          ? 'urgent'
                          : (t.days_until_inspection ?? 999) <= 90
                          ? 'warn'
                          : 'ok'
                      }`}
                    >
                      {priorityLabel(t.days_until_inspection)}
                    </div>
                  </td>
                  <td>{formatKm(t.estimated_mileage)}</td>
                  {rule === 'oil_4000km' && (
                    <td>
                      <div>{formatKm(t.next_oil_target_km)}</div>
                      <div className="cust-meta">
                        超過 {formatKm(t.oil_overage_km)}
                      </div>
                    </td>
                  )}
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Badge variant={t.line_user_id ? 'success' : 'neutral'}>LINE</Badge>
                      <Badge variant={t.email ? 'success' : 'neutral'}>MAIL</Badge>
                      <Badge variant={priorityVariant(t.days_until_inspection)}>
                        {priorityVariant(t.days_until_inspection)}
                      </Badge>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => send('one', t.customer_id)}
                    >
                      送信
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function channelLabel(c: Channel) {
  return c === 'LINE' ? 'LINE' : c === 'MAIL' ? 'メール' : 'LINE+メール';
}
