'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CustomerPortalPreviewFrame } from '@/components/customer-portal-preview-frame';
import { QuoteEditorSheet } from '@/components/quote-editor-sheet';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import { formatYen } from '@/lib/format';
import {
  fetchSendPreview,
  getCachedSendPreview,
  invalidateSendPreviewCache,
  sendPreviewCacheKey,
  type SendPreviewChannel,
  type SendPreviewItem,
} from '@/lib/notifications/send-preview-cache';
import type { PresetNotificationRule } from '@/lib/notifications/send-review-session';

type Channel = SendPreviewChannel;
type ReviewItem = SendPreviewItem;

export interface SendNotificationSheetProps {
  open: boolean;
  onClose: () => void;
  customerIds: string[];
  rule: PresetNotificationRule;
  channel: Channel;
  onSent: () => void;
}

export function SendNotificationSheet({
  open,
  onClose,
  customerIds,
  rule,
  channel,
  onSent,
}: SendNotificationSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState(false);
  const [sending, setSending] = useState(false);
  const [lineBody, setLineBody] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [portalPreviewOpen, setPortalPreviewOpen] = useState(false);

  const bulk = customerIds.length > 1;
  const wantLine = channel === 'LINE' || channel === 'BOTH';
  const wantMail = channel === 'MAIL' || channel === 'BOTH';
  const editDisabled = channel === 'BOTH';

  const handleSheetClose = useCallback(() => {
    if (!quoteEditorOpen) onClose();
  }, [onClose, quoteEditorOpen]);

  const sheetDialogOpen = open && !quoteEditorOpen;
  useModalDialog(dialogRef, sheetDialogOpen, handleSheetClose);

  useEffect(() => {
    if (!open) {
      setItem(null);
      setError(null);
      setBreakdown(false);
      setPortalPreviewOpen(false);
      setLineBody('');
      setMailBody('');
      return;
    }

    const cacheKey = sendPreviewCacheKey(customerIds, rule, channel);
    if (previewNonce > 0) {
      invalidateSendPreviewCache(customerIds, rule, channel);
    }

    const cached = previewNonce === 0 ? getCachedSendPreview(cacheKey) : undefined;
    if (cached) {
      setItem(cached.item);
      setLineBody(cached.lineBody);
      setMailBody(cached.mailBody);
      setLoading(false);
      setError(null);
      setBreakdown(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBreakdown(false);
    (async () => {
      try {
        const payload = await fetchSendPreview(customerIds, rule, channel);
        if (cancelled) return;
        setItem(payload.item);
        setLineBody(payload.lineBody);
        setMailBody(payload.mailBody);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerIds.join(','), rule, channel, previewNonce]);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule,
          channel,
          customer_ids: customerIds,
          line_body: wantLine && !editDisabled ? lineBody : undefined,
          mail_body: wantMail && !editDisabled ? mailBody : undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; failed?: number };
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : '送信に失敗しました');
      if ((json.failed ?? 0) > 0) throw new Error('送信が一部失敗しました');
      onClose();
      onSent();
      setLineBody('');
      setMailBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const basicTotal = item?.quote?.tax_summary.basic_fees_subtotal;
  const grandTotal = item?.quote?.tax_summary.grand_total;
  const isOilRule = rule === 'oil_4000km';
  const canSend =
    channel === 'BOTH' ||
    (channel === 'LINE' && lineBody.trim().length > 0) ||
    (channel === 'MAIL' && mailBody.trim().length > 0);

  const editQuoteHref = item?.vehicle_id ? `/quotes/${item.vehicle_id}?notify=1` : null;

  if (!open && !quoteEditorOpen) return null;

  return (
    <>
    <dialog
      ref={dialogRef}
      className="preview-sheet-root"
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {open ? (
      <div className="preview-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="preview-sheet-handle" aria-hidden />
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>
          {bulk ? `${customerIds.length} 名に送付` : `${item?.name ?? '名前未設定'} 様`}
        </div>
        {bulk && (
          <div className="action-card-meta" style={{ marginTop: 6 }}>
            編集した本文は全員に同じ内容で送ります（LINE+メール同時の場合は編集できません）。見積・プレビューは先頭1名分です。
          </div>
        )}

        {loading && (
          <div className="empty" style={{ padding: 24 }}>見積の確認とプレビュー取得中…</div>
        )}
        {error && (
          <div
            className="badge badge-danger"
            style={{ display: 'block', marginTop: 12, padding: 10, whiteSpace: 'pre-wrap' }}
          >
            {error}
          </div>
        )}

        {!loading && item && (
          <>
            {item.warnings.length > 0 && (
              <div
                className="badge badge-warn"
                style={{ display: 'block', marginTop: 10, padding: 10, fontSize: 13 }}
              >
                {item.warnings.join(' / ')}
              </div>
            )}

            <div className="preview-sheet-section-title">見積サマリ</div>
            {!isOilRule && item.quote ? (
              <>
                <div className="preview-summary-row">
                  <span>車検基本費用合計</span>
                  <span style={{ fontWeight: 600 }}>{formatYen(basicTotal ?? 0)}</span>
                </div>
                <div className="preview-summary-row">
                  <span>税込総額</span>
                  <span style={{ fontWeight: 600 }}>{formatYen(grandTotal ?? 0)}</span>
                </div>
                <button
                  type="button"
                  className="preview-sheet-breakdown-toggle"
                  onClick={() => setBreakdown((v) => !v)}
                  aria-expanded={breakdown}
                >
                  {breakdown ? '▲ 内訳を閉じる' : '▼ 内訳を見る'}
                </button>
                {breakdown && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>車検基本費用</div>
                    {item.quote.legal_lines.map((l, i) => (
                      <div key={`${l.label}-${i}`} className="preview-summary-row" style={{ fontSize: 13 }}>
                        <span>{l.label}</span>
                        <span>{formatYen(l.amount)}</span>
                      </div>
                    ))}
                    <div style={{ fontWeight: 600, margin: '10px 0 6px' }}>追加整備</div>
                    {item.quote.service_lines.map((l, i) => (
                      <div key={`${l.label}-${i}`} className="preview-summary-row" style={{ fontSize: 13 }}>
                        <span>{l.label}</span>
                        <span>{formatYen(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : !isOilRule ? (
              <div className="cust-meta" style={{ marginBottom: 8 }}>
                見積がまだありません。車両登録を確認してください。
              </div>
            ) : item.quote ? (
              <>
                <div className="preview-summary-row">
                  <span>車検基本費用合計</span>
                  <span style={{ fontWeight: 600 }}>{formatYen(basicTotal ?? 0)}</span>
                </div>
                <div className="preview-summary-row">
                  <span>税込総額</span>
                  <span style={{ fontWeight: 600 }}>{formatYen(grandTotal ?? 0)}</span>
                </div>
              </>
            ) : (
              <div className="cust-meta" style={{ marginBottom: 8 }}>
                オイル目安通知のため、金額はプレビュー本文をご確認ください。
              </div>
            )}

            <details
              className="accordion-details"
              style={{ marginTop: 12 }}
              open={portalPreviewOpen}
              onToggle={(e) => setPortalPreviewOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="accordion-summary preview-sheet-breakdown-toggle" style={{ listStyle: 'none' }}>
                <span className="accordion-summary-title">顧客が見る画面（プレビュー）</span>
              </summary>
              <div style={{ paddingTop: 12 }}>
                <CustomerPortalPreviewFrame
                  data={item.portal_preview}
                  portalUrl={item.portal_link_preview}
                />
              </div>
            </details>

            <div className="send-sheet-quote-actions">
              {item.portal_link_preview ? (
                <a
                  href={item.portal_link_preview}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ justifyContent: 'center', textDecoration: 'none' }}
                >
                  顧客ポータルを別タブで開く
                </a>
              ) : null}
              {editQuoteHref ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary-lg"
                  style={{ justifyContent: 'center' }}
                  onClick={() => setQuoteEditorOpen(true)}
                >
                  見積の明細を編集する
                </button>
              ) : item.customer_id ? (
                <Link
                  href={`/customers/${item.customer_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-secondary-lg"
                  style={{ justifyContent: 'center' }}
                >
                  車両未登録のため顧客を開く
                </Link>
              ) : null}
              <button
                type="button"
                className="preview-sheet-cancel"
                style={{ textAlign: 'center', padding: '10px 8px' }}
                disabled={loading}
                onClick={() => setPreviewNonce((n) => n + 1)}
              >
                見積を編集したので、金額・本文を再取得
              </button>
            </div>

            {wantLine && (
              <>
                <div className="preview-sheet-section-title">LINE 本文</div>
                <textarea
                  className="input textarea"
                  style={{ width: '100%', minHeight: 120, fontSize: 14, lineHeight: 1.45 }}
                  value={lineBody}
                  onChange={(e) => setLineBody(e.target.value)}
                  disabled={editDisabled}
                  readOnly={editDisabled}
                />
              </>
            )}
            {wantMail && (
              <>
                <div className="preview-sheet-section-title">メール本文</div>
                <textarea
                  className="input textarea"
                  style={{ width: '100%', minHeight: 120, fontSize: 14, lineHeight: 1.45 }}
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  disabled={editDisabled}
                  readOnly={editDisabled}
                />
              </>
            )}
            {editDisabled && (
              <p className="cust-meta" style={{ marginTop: 8 }}>
                LINE とメールを同時送信する場合はテンプレートの文面のまま送ります。編集が必要なときは「LINE
                のみ」または「メール のみ」で送ってください。
              </p>
            )}
            {!loading && item && !canSend && channel === 'LINE' && (
              <div
                className="badge badge-warn"
                style={{ display: 'block', marginTop: 10, padding: 10, fontSize: 13 }}
              >
                LINE 本文が空のため送信できません。テンプレート（migration 0016 適用済みか）を確認するか、「金額・本文を再取得」を押してください。
              </div>
            )}
            {!loading && item && !canSend && channel === 'MAIL' && (
              <div
                className="badge badge-warn"
                style={{ display: 'block', marginTop: 10, padding: 10, fontSize: 13 }}
              >
                メール本文が空のため送信できません。テンプレートを確認するか、「金額・本文を再取得」を押してください。
              </div>
            )}

            <button
              type="button"
              className="btn-line-send-lg"
              disabled={sending || !canSend}
              onClick={() => void handleSend()}
            >
              {sending ? '送信中…' : channel === 'LINE' ? 'LINE で送付する ▶' : channel === 'MAIL' ? 'メールで送付する ▶' : 'LINE+メール で送付する ▶'}
            </button>
            <Link href="/templates" className="preview-sheet-cancel" style={{ display: 'block', marginTop: 8 }}>
              テンプレートの定型文を編集する →
            </Link>
            <button type="button" className="preview-sheet-cancel" onClick={() => dialogRef.current?.close()}>
              キャンセル
            </button>
          </>
        )}
      </div>
      ) : null}
    </dialog>

      <QuoteEditorSheet
        open={quoteEditorOpen}
        onClose={() => setQuoteEditorOpen(false)}
        vehicleId={item?.vehicle_id ?? null}
        vehicleLabel={item?.name ? `${item.name} 様` : null}
        onSaved={() => {
          setQuoteEditorOpen(false);
          setPreviewNonce((n) => n + 1);
        }}
      />
    </>
  );
}
