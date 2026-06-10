'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { formatYen } from '@/lib/format';

export function QuoteSaveBar({
  legalSubtotal,
  grandTotal,
  saving,
  disabled,
  quoteLabel,
  onSave,
}: {
  legalSubtotal: number;
  grandTotal: number;
  saving: boolean;
  disabled?: boolean;
  /** 例: QT-2026-xxx（どの見積を保存するか） */
  quoteLabel?: string | null;
  onSave: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="quote-save-bar mobile-only" role="region" aria-label="見積保存">
      <div className="quote-save-bar-inner">
        <div className="quote-save-bar-totals">
          {quoteLabel ? (
            <div className="quote-save-bar-editing-label">編集中: {quoteLabel}</div>
          ) : null}
          <div className="quote-save-bar-line">
            <span className="quote-save-bar-label">法定</span>
            <span className="quote-save-bar-value-sm">{formatYen(legalSubtotal)}</span>
          </div>
          <div className="quote-save-bar-line quote-save-bar-line-main">
            <span className="quote-save-bar-label">合計</span>
            <span className="quote-save-bar-value">{formatYen(grandTotal)}</span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary quote-save-bar-btn"
          disabled={saving || disabled}
          onClick={onSave}
        >
          {saving ? '保存中…' : '明細を保存'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
