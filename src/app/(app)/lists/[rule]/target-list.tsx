'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SendNotificationSheet } from '@/components/send-notification-sheet';
import { useSendPreviewPrefetch } from '@/hooks/use-send-preview-prefetch';
import { Badge, priorityVariant } from '@/components/badge';
import { useToast } from '@/components/toast';
import { formatDate, formatKm, formatYen, priorityLabel } from '@/lib/format';
import type { RuleKey, RuleTarget } from '@/lib/rules';
import { getUrgencyLevel } from '@/lib/urgency';
import type { PresetNotificationRule } from '@/lib/notifications/send-review-session';

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
  const [filter, setFilter] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCustomerIds, setSheetCustomerIds] = useState<string[]>([]);

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

  function openSendSheet(ids: string[]) {
    if (ids.length === 0) return;
    setSheetCustomerIds(ids);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSheetCustomerIds([]);
  }

  function onSent() {
    toast.show('送信しました');
    setSelected(new Set());
    closeSheet();
    router.refresh();
  }

  const rulePreset = rule as PresetNotificationRule;
  const prefetchIds = useMemo(() => [...selected], [selected]);
  useSendPreviewPrefetch(prefetchIds, rulePreset, channel, {
    enabled: prefetchIds.length > 0,
  });

  return (
    <>
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
          <button
            type="button"
            className="btn btn-sm"
            onClick={toggleAll}
            disabled={filtered.length === 0}
            aria-pressed={allChecked}
          >
            {allChecked ? '選択解除' : '全選択'}
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={selected.size === 0}
              onClick={() => openSendSheet(Array.from(selected))}
            >
              選択を送付確認
            </button>
          </div>
        </div>

        <p className="cust-meta desktop-only" style={{ padding: '0 4px 12px' }}>
          個別の「送付確認」は下のテーブル各行から。選択してまとめる場合はチェックを付けて「選択を送付確認」。
        </p>

        <div className="table-wrap desktop-only">
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
                <th>見積</th>
                {rule === 'oil_4000km' && <th>オイル目安</th>}
                <th>連絡可</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={rule === 'oil_4000km' ? 9 : 8}>
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
                    <td>
                      {!t.vehicle_id ? (
                        <span className="cust-meta">車両なし</span>
                      ) : t.latest_quote_total_amount != null ? (
                        <span>{formatYen(t.latest_quote_total_amount)}</span>
                      ) : (
                        <span className="cust-meta" style={{ color: 'var(--warn)' }}>
                          未作成
                        </span>
                      )}
                    </td>
                    {rule === 'oil_4000km' && (
                      <td>
                        <div>{formatKm(t.next_oil_target_km)}</div>
                        <div className="cust-meta">超過 {formatKm(t.oil_overage_km)}</div>
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
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => openSendSheet([t.customer_id])}
                      >
                        送付確認
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ul className="list-card-list mobile-only">
          {filtered.length === 0 ? (
            <li className="empty" style={{ padding: 16 }}>
              対象がありません
            </li>
          ) : (
            filtered.map((t) => {
              const urgency = getUrgencyLevel(t.days_until_inspection ?? null);
              const checked = selected.has(t.customer_id);
              const ctaLabel =
                channel === 'LINE'
                  ? 'LINE で送付 ▶'
                  : channel === 'MAIL'
                    ? 'メールで送付 ▶'
                    : '送付確認 ▶';
              return (
                <li key={t.customer_id} className={`list-card ${urgency}`}>
                  <div className="list-card-row">
                    <input
                      type="checkbox"
                      className="list-card-checkbox"
                      checked={checked}
                      onChange={() => toggle(t.customer_id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${t.name}を選択`}
                    />
                    <button
                      type="button"
                      className="list-card-hit"
                      onClick={() => openSendSheet([t.customer_id])}
                      aria-label={`${t.name}の送付確認を開く`}
                    >
                    <div className="list-card-hit-top">
                    <div className="list-card-main">
                      <div className="list-card-name">
                        {t.name}
                      </div>
                      {(t.maker || t.model) && (
                        <div className="list-card-vehicle">
                          <span>
                            {t.maker} {t.model}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="list-card-side">
                      <div className={`list-card-days ${urgency}`}>
                        {priorityLabel(t.days_until_inspection)}
                      </div>
                      <div className="list-card-days-sub">
                        {formatDate(t.inspection_expire_date) || '満了日未設定'}
                      </div>
                    </div>
                    </div>
                    <div className="list-card-hit-bottom">
                      <div className="list-card-hit-meta">
                        <span>推定走行 {formatKm(t.estimated_mileage)}</span>
                        {!t.vehicle_id ? (
                          <span>見積: 車両なし</span>
                        ) : t.latest_quote_total_amount != null ? (
                          <span>見積 {formatYen(t.latest_quote_total_amount)}</span>
                        ) : (
                          <span className="list-card-warn">見積未作成</span>
                        )}
                        {rule === 'oil_4000km' && (
                          <span>
                            オイル目安 {formatKm(t.next_oil_target_km)}（超過{' '}
                            {formatKm(t.oil_overage_km)}）
                          </span>
                        )}
                      </div>
                      <span className="list-card-cta-hint">{ctaLabel}</span>
                    </div>
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {selected.size > 0 && (
        <div className="list-target-bulk-bar mobile-only">
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: 48 }}
            onClick={() => openSendSheet(Array.from(selected))}
          >
            選択 {selected.size} 件を送付確認
          </button>
        </div>
      )}

      <SendNotificationSheet
        open={sheetOpen}
        onClose={closeSheet}
        customerIds={sheetCustomerIds}
        rule={rulePreset}
        channel={channel}
        onSent={onSent}
      />
    </>
  );
}
