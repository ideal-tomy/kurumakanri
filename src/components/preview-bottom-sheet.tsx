'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatYen } from '@/lib/format';
import type { PresetNotificationRule } from '@/lib/notifications/send-review-session';
import { buildNotificationsReviewHref } from '@/lib/notifications/send-review-session';

type PreviewQuote = {
  tax_summary: {
    non_taxable_subtotal: number;
    grand_total: number;
  };
  legal_lines: Array<{ label: string; amount: number }>;
  service_lines: Array<{ label: string; amount: number }>;
};

type PreviewItem = {
  line_preview: string | null;
  rule_label: string;
  warnings: string[];
  quote: PreviewQuote | null;
};

export interface PreviewBottomSheetProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  rule: PresetNotificationRule;
  customerName: string | null;
  vehicleLabel?: string | null;
  plate?: string | null;
  /** 例: 車検 90日前 (満了日 …) */
  contextLine?: string | null;
  onSent: () => void;
}

export function PreviewBottomSheet({
  open,
  onClose,
  customerId,
  rule,
  customerName,
  vehicleLabel,
  plate,
  contextLine,
  onSent,
}: PreviewBottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<PreviewItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onDialogClose = () => {
      onClose();
    };
    el.addEventListener('close', onDialogClose);
    return () => el.removeEventListener('close', onDialogClose);
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setItem(null);
      setError(null);
      setBreakdown(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setBreakdown(false);
      try {
        const res = await fetch('/api/notifications/review-payload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_ids: [customerId],
            rule,
            channel: 'LINE',
          }),
        });
        const json = (await res.json()) as { items?: PreviewItem[]; error?: unknown };
        if (!res.ok) {
          const msg =
            typeof json.error === 'string'
              ? json.error
              : json.error != null
                ? JSON.stringify(json.error)
                : 'プレビューの取得に失敗しました';
          throw new Error(msg);
        }
        const first = json.items?.[0];
        if (!first) throw new Error('プレビューデータがありません');
        if (!cancelled) setItem(first);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId, rule]);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule,
          channel: 'LINE',
          customer_ids: [customerId],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '送信に失敗しました');
      if ((json.failed ?? 0) > 0) throw new Error('送信が一部失敗しました');
      dialogRef.current?.close();
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  function goEdit() {
    dialogRef.current?.close();
    router.push(
      buildNotificationsReviewHref({
        customerIds: [customerId],
        rule,
        channel: 'LINE',
      }),
    );
  }

  const legalTotal = item?.quote?.tax_summary.non_taxable_subtotal;
  const grandTotal = item?.quote?.tax_summary.grand_total;

  return (
    <dialog
      ref={dialogRef}
      className="preview-sheet-root"
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="preview-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="preview-sheet-handle" aria-hidden />
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>
          {customerName ?? '名前未設定'} 様
          {vehicleLabel ? ` / ${vehicleLabel}` : ''}
        </div>
        {(contextLine || plate) && (
          <div className="action-card-meta" style={{ marginTop: 6 }}>
            {contextLine}
            {plate ? ` · ${plate}` : ''}
          </div>
        )}

        {loading && <div className="empty" style={{ padding: 24 }}>読み込み中…</div>}
        {error && (
          <div className="badge badge-danger" style={{ display: 'block', marginTop: 12, padding: 10, whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        )}

        {!loading && item && (
          <>
            {item.warnings.length > 0 && (
              <div className="badge badge-warn" style={{ display: 'block', marginTop: 10, padding: 10, fontSize: 13 }}>
                {item.warnings.join(' / ')}
              </div>
            )}

            <div className="preview-sheet-section-title">LINE本文プレビュー</div>
            <div className="preview-line-bubble">{item.line_preview ?? '（本文なし）'}</div>

            {item.quote && (
              <>
                <div className="preview-sheet-section-title">見積サマリ</div>
                <div className="preview-summary-row">
                  <span>法定費用合計</span>
                  <span style={{ fontWeight: 600 }}>{formatYen(legalTotal ?? 0)}</span>
                </div>
                <div className="preview-summary-row">
                  <span>税込総額</span>
                  <span style={{ fontWeight: 600 }}>{formatYen(grandTotal ?? 0)}</span>
                </div>
                <button
                  type="button"
                  className="preview-sheet-cancel"
                  style={{ marginTop: 4, textAlign: 'left', paddingLeft: 0 }}
                  onClick={() => setBreakdown((v) => !v)}
                >
                  {breakdown ? '▲ 内訳を閉じる' : '▼ 内訳を見る'}
                </button>
                {breakdown && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>法定行</div>
                    {item.quote.legal_lines.map((l) => (
                      <div key={l.label} className="preview-summary-row" style={{ fontSize: 13 }}>
                        <span>{l.label}</span>
                        <span>{formatYen(l.amount)}</span>
                      </div>
                    ))}
                    <div style={{ fontWeight: 600, margin: '10px 0 6px' }}>サービス行</div>
                    {item.quote.service_lines.map((l) => (
                      <div key={l.label} className="preview-summary-row" style={{ fontSize: 13 }}>
                        <span>{l.label}</span>
                        <span>{formatYen(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              className="btn-line-send-lg"
              disabled={sending}
              onClick={() => void handleSend()}
            >
              {sending ? '送信中…' : 'LINE で送付する ▶'}
            </button>
            <button type="button" className="btn-outline-secondary-lg" onClick={goEdit}>
              文面を編集する
            </button>
            <button type="button" className="preview-sheet-cancel" onClick={() => dialogRef.current?.close()}>
              キャンセル
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
