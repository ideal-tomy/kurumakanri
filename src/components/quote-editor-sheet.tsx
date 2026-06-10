'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import type { QuoteRow } from '@/lib/supabase/types';
import { QuoteQuotesList } from '@/app/(app)/quotes/[vehicleId]/quote-quotes-list';

type EditorPayload = {
  vehicle: {
    id: string;
    customer_id: string;
    maker: string | null;
    model: string | null;
    plate: string | null;
    inspection_expire_date: string | null;
  };
  quotes: QuoteRow[];
  shareUrlsByQuoteId: Record<string, string | null>;
  lineNotifyEligible: boolean;
};

export function QuoteEditorSheet({
  open,
  onClose,
  vehicleId,
  vehicleLabel,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vehicleId: string | null;
  vehicleLabel?: string | null;
  onSaved?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<EditorPayload | null>(null);

  useModalDialog(dialogRef, open, onClose);

  useEffect(() => {
    if (!open || !vehicleId) {
      setPayload(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/quotes/vehicle/${vehicleId}`);
        const json = (await res.json()) as EditorPayload & { error?: string };
        if (!res.ok) throw new Error(json.error ?? '見積の読み込みに失敗しました');
        if (!cancelled) setPayload(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, vehicleId]);

  const title =
    vehicleLabel ??
    (payload?.vehicle
      ? `${payload.vehicle.maker ?? ''} ${payload.vehicle.model ?? ''}`.trim()
      : '見積を編集');

  return (
    <dialog
      ref={dialogRef}
      className="preview-sheet-root quote-editor-sheet-root"
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {open ? (
        <div className="preview-sheet-panel quote-editor-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <div className="quote-editor-sheet-head">
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
              {payload?.vehicle ? (
                <div className="cust-meta" style={{ marginTop: 4 }}>
                  {payload.vehicle.plate} · 満了 {formatDate(payload.vehicle.inspection_expire_date)}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="quote-editor-sheet-close"
              onClick={() => dialogRef.current?.close()}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          {loading && <div className="empty" style={{ padding: 24 }}>読み込み中…</div>}
          {error && (
            <div className="badge badge-danger" style={{ display: 'block', marginTop: 12, padding: 10 }}>
              {error}
            </div>
          )}

          {!loading && payload && payload.quotes.length === 0 && (
            <div className="empty" style={{ padding: 24 }}>
              見積がありません。車両ページで自動見積を生成してください。
            </div>
          )}

          {!loading && payload && payload.quotes.length > 0 && (
            <div className="quote-editor-sheet-body">
              <QuoteQuotesList
                quotes={payload.quotes}
                vehicleId={payload.vehicle.id}
                customerId={payload.vehicle.customer_id}
                shareUrlsByQuoteId={payload.shareUrlsByQuoteId}
                lineNotifyEligible={payload.lineNotifyEligible}
                embedded
                onQuoteSaved={onSaved}
              />
            </div>
          )}

          <button
            type="button"
            className="preview-sheet-cancel"
            style={{ marginTop: 12 }}
            onClick={() => dialogRef.current?.close()}
          >
            閉じる
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
