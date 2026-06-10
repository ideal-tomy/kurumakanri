'use client';

import { useEffect, useRef, useState } from 'react';
import { formatYen } from '@/lib/format';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import type { EditableLine } from '@/lib/quote-editor-utils';

export function QuoteLineEditSheet({
  open,
  onClose,
  line,
  which,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  line: EditableLine | null;
  which: 'legal' | 'service';
  onSave: (patch: Partial<EditableLine>) => void;
  onDelete?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<EditableLine | null>(line);

  useModalDialog(dialogRef, open, onClose);

  useEffect(() => {
    if (open && line) {
      setDraft({ ...line });
    } else if (!open) {
      setDraft(null);
    }
  }, [open, line]);

  const amount = draft ? Math.round(draft.quantity * draft.unit_price) : 0;

  function handleDone() {
    if (!draft) return;
    onSave(draft);
    dialogRef.current?.close();
  }

  function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm('この行を削除しますか？')) return;
    onDelete();
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="preview-sheet-root"
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {open && draft ? (
        <div className="preview-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <div className="preview-sheet-handle" aria-hidden />
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>明細を編集</div>

          <div className="form-field">
            <label className="form-label">品目</label>
            <input
              className="input"
              value={draft.label}
              onChange={(e) => setDraft((d) => (d ? { ...d, label: e.target.value } : d))}
            />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-field">
              <label className="form-label">数量</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={1}
                value={draft.quantity}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, quantity: Math.max(1, Number(e.target.value) || 1) } : d))
                }
              />
            </div>
            <div className="form-field">
              <label className="form-label">単価</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={draft.unit_price}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, unit_price: Number(e.target.value) || 0 } : d))
                }
              />
            </div>
          </div>

          {which === 'legal' ? (
            <div className="form-field">
              <label className="form-label">税</label>
              <select
                className="select"
                value={draft.tax_treatment}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, tax_treatment: e.target.value as EditableLine['tax_treatment'] } : d,
                  )
                }
              >
                <option value="NON_TAXABLE">非課税</option>
                <option value="TAXABLE_10">10%込</option>
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label className="form-label">種別</label>
              <div className="quote-line-type-segments">
                <button
                  type="button"
                  className={`quote-line-type-seg ${draft.category !== 'discount' ? 'active' : ''}`}
                  onClick={() =>
                    setDraft((d) => (d ? { ...d, category: 'service', tax_treatment: 'TAXABLE_10' } : d))
                  }
                >
                  作業
                </button>
                <button
                  type="button"
                  className={`quote-line-type-seg ${draft.category === 'discount' ? 'active' : ''}`}
                  onClick={() =>
                    setDraft((d) => (d ? { ...d, category: 'discount', tax_treatment: 'TAXABLE_10' } : d))
                  }
                >
                  値引き
                </button>
              </div>
              <p className="cust-meta" style={{ marginTop: 6 }}>
                税込10%で計算されます
              </p>
            </div>
          )}

          <div className="quote-line-sheet-preview">
            <span>金額</span>
            <strong>{formatYen(amount)}</strong>
          </div>

          <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleDone}>
            完了
          </button>
          {onDelete ? (
            <button type="button" className="btn" style={{ width: '100%', marginTop: 8 }} onClick={handleDelete}>
              この行を削除
            </button>
          ) : null}
          <button type="button" className="preview-sheet-cancel" onClick={() => dialogRef.current?.close()}>
            キャンセル
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
