'use client';

import { formatYen } from '@/lib/format';
import type { EditableLine } from '@/lib/quote-editor-utils';

function lineCategoryLabel(row: EditableLine): string {
  if (row.category === 'discount') return '値引き';
  if (row.category === 'legal') return '法定';
  return '作業';
}

export function QuoteLineListMobile({
  which,
  lines,
  editable,
  onLineTap,
  onAddLine,
  onAddDiscount,
}: {
  which: 'legal' | 'service';
  lines: EditableLine[];
  editable: boolean;
  onLineTap: (line: EditableLine) => void;
  onAddLine: () => void;
  onAddDiscount?: () => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="quote-line-list-mobile">
        <div className="empty" style={{ padding: 12 }}>
          行がありません
        </div>
        {editable ? (
          <div className="quote-line-list-actions">
            <button type="button" className="btn btn-sm" onClick={onAddLine}>
              + 行を追加
            </button>
            {which === 'service' && onAddDiscount ? (
              <button type="button" className="btn btn-sm" onClick={onAddDiscount}>
                + 値引き行
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="quote-line-list-mobile">
      {lines.map((row) => {
        const amount = Math.round(row.quantity * row.unit_price);
        const sub = `${row.quantity} × ${formatYen(row.unit_price)} · ${lineCategoryLabel(row)}`;
        return (
          <li key={row.id}>
            {editable ? (
              <button type="button" className="quote-line-card" onClick={() => onLineTap(row)}>
                <div className="quote-line-card-main">
                  <span className="quote-line-card-label">{row.label || '（品目未入力）'}</span>
                  <span className="quote-line-card-sub">{sub}</span>
                </div>
                <span className="quote-line-card-amount">{formatYen(amount)}</span>
              </button>
            ) : (
              <div className="quote-line-card quote-line-card-readonly">
                <div className="quote-line-card-main">
                  <span className="quote-line-card-label">{row.label}</span>
                  <span className="quote-line-card-sub">{sub}</span>
                </div>
                <span className="quote-line-card-amount">{formatYen(amount)}</span>
              </div>
            )}
          </li>
        );
      })}
      {editable ? (
        <li className="quote-line-list-actions">
          <button type="button" className="btn btn-sm" onClick={onAddLine}>
            + 行を追加
          </button>
          {which === 'service' && onAddDiscount ? (
            <button type="button" className="btn btn-sm" onClick={onAddDiscount}>
              + 値引き行
            </button>
          ) : null}
        </li>
      ) : null}
    </ul>
  );
}
