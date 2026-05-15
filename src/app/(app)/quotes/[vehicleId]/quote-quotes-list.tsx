'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDate, formatYen } from '@/lib/format';
import { quoteTotalsForDisplay, rowsFromStoredJson } from '@/lib/quote';
import type { QuoteRow } from '@/lib/supabase/types';
import { QuoteEditorCard } from './quote-editor-card';

function quoteGrandTotal(q: QuoteRow): number {
  const legal = rowsFromStoredJson(q.legal_items);
  const service = rowsFromStoredJson(q.service_items);
  return quoteTotalsForDisplay({
    legal_items: legal,
    service_items: service,
    taxable_subtotal_ex_tax: null,
    tax_amount_10: null,
    non_taxable_subtotal: null,
    grand_total: null,
    total_amount: 0,
  }).grand_total;
}

export function QuoteQuotesList({
  quotes,
  vehicleId,
  customerId,
  shareUrlsByQuoteId,
  lineNotifyEligible,
  onDirtyChange,
  embedded = false,
  onQuoteSaved,
}: {
  quotes: QuoteRow[];
  vehicleId: string;
  customerId: string;
  shareUrlsByQuoteId: Record<string, string | null>;
  lineNotifyEligible: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  embedded?: boolean;
  onQuoteSaved?: () => void;
}) {
  const [activeSaveQuoteId, setActiveSaveQuoteId] = useState(quotes[0]?.id ?? '');
  const [openArchiveId, setOpenArchiveId] = useState<string | null>(null);
  const [dirtyByQuote, setDirtyByQuote] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const anyDirty = Object.values(dirtyByQuote).some(Boolean);
    onDirtyChange?.(anyDirty);
  }, [dirtyByQuote, onDirtyChange]);

  const handleDirty = useCallback((quoteId: string, dirty: boolean) => {
    setDirtyByQuote((prev) => ({ ...prev, [quoteId]: dirty }));
  }, []);

  const renderCard = (q: QuoteRow) => (
    <QuoteEditorCard
      key={`${q.id}-${q.updated_at ?? ''}`}
      quote={q}
      vehicleId={vehicleId}
      customerId={customerId}
      shareUrl={shareUrlsByQuoteId[q.id] ?? null}
      lineNotifyEligible={lineNotifyEligible}
      showMobileSaveBar={activeSaveQuoteId === q.id}
      onDirtyChange={(d) => handleDirty(q.id, d)}
      embedded={embedded}
      onSaved={onQuoteSaved}
    />
  );

  return (
    <>
      <div className="desktop-only">
        {quotes.map((q) => renderCard(q))}
      </div>

      <div className="mobile-only quote-quotes-mobile">
        {quotes.map((q, i) => {
          if (i === 0) {
            return renderCard(q);
          }

          const total = quoteGrandTotal(q);

          return (
            <details
              key={`${q.id}-archive`}
              className="quote-archive-details"
              open={openArchiveId === q.id}
              onToggle={(e) => {
                const el = e.currentTarget;
                if (el.open) {
                  setOpenArchiveId(q.id);
                  setActiveSaveQuoteId(q.id);
                } else if (openArchiveId === q.id) {
                  setOpenArchiveId(null);
                  setActiveSaveQuoteId(quotes[0]?.id ?? '');
                }
              }}
            >
              <summary className="quote-archive-summary">
                <span className="quote-archive-summary-main">
                  {q.quote_no ?? '見積'} · {formatYen(total)}
                </span>
                <span className="quote-archive-summary-sub">
                  {q.status} · {formatDate(q.issued_at)}
                </span>
              </summary>
              {renderCard(q)}
            </details>
          );
        })}
      </div>
    </>
  );
}
