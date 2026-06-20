'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/badge';
import { QuoteLineEditSheet } from '@/components/quote-line-edit-sheet';
import { QuoteLineListMobile } from '@/components/quote-line-list-mobile';
import { QuoteMobileSummary } from '@/components/quote-mobile-summary';
import { QuoteSaveBar } from '@/components/quote-save-bar';
import { useToast } from '@/components/toast';
import { formatDate, formatYen } from '@/lib/format';
import {
  type EditableLine,
  initEditableSections,
  newLine,
  serializeEditorState,
  toPayload,
} from '@/lib/quote-editor-utils';
import { QUOTE_SECTION_LABEL, quoteTotalsFromLinePayloads, sumLineItemsAmount } from '@/lib/quote';
import type { QuoteRow } from '@/lib/supabase/types';
import { QuoteStaffActions } from './quote-staff-actions';

export function QuoteEditorCard({
  quote: initialQuote,
  vehicleId,
  customerId,
  shareUrl,
  lineNotifyEligible,
  showMobileSaveBar = true,
  onDirtyChange,
  onSaved,
  embedded = false,
}: {
  quote: QuoteRow;
  vehicleId: string;
  customerId: string;
  shareUrl: string | null;
  lineNotifyEligible: boolean;
  /** 複数見積時、固定保存バーを出すカードだけ true */
  showMobileSaveBar?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  /** 保存成功時（シート内編集など） */
  onSaved?: () => void;
  /** true のとき router.refresh しない（親がデータ再取得） */
  embedded?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const editable = initialQuote.status === 'DRAFT' || initialQuote.status === 'ISSUED';

  const initialSections = initEditableSections(initialQuote.legal_items, initialQuote.service_items);
  const [legalLines, setLegalLines] = useState<EditableLine[]>(() => initialSections.legalLines);
  const [serviceLines, setServiceLines] = useState<EditableLine[]>(() => initialSections.serviceLines);
  const [notes, setNotes] = useState(initialQuote.notes ?? '');
  const [status, setStatus] = useState(initialQuote.status);
  const [saving, setSaving] = useState(false);

  const [editingLine, setEditingLine] = useState<{ which: 'legal' | 'service'; line: EditableLine } | null>(null);
  const closeLineEdit = useCallback(() => setEditingLine(null), []);

  const savedSnapshot = useRef(
    serializeEditorState(initialSections.legalLines, initialSections.serviceLines, initialQuote.notes ?? '', initialQuote.status),
  );

  const disp = useMemo(() => {
    const legal = toPayload(legalLines).map((l) => ({
      ...l,
      category: 'legal' as const,
      tax_treatment: l.tax_treatment,
    }));
    const service = toPayload(serviceLines).map((l) => ({
      ...l,
      category: (l.category === 'discount' ? 'discount' : 'service') as 'service' | 'discount',
      tax_treatment: 'TAXABLE_10' as const,
    }));
    return quoteTotalsFromLinePayloads(legal, service);
  }, [legalLines, serviceLines]);

  const isDirty = useMemo(() => {
    if (!editable) return false;
    return (
      serializeEditorState(legalLines, serviceLines, notes, status) !== savedSnapshot.current
    );
  }, [editable, legalLines, serviceLines, notes, status]);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty || !editable) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, editable]);

  const patchLine = useCallback(
    (which: 'legal' | 'service', id: string, patch: Partial<EditableLine>) => {
      const set = which === 'legal' ? setLegalLines : setServiceLines;
      set((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [],
  );

  const removeLine = useCallback((which: 'legal' | 'service', id: string) => {
    const set = which === 'legal' ? setLegalLines : setServiceLines;
    set((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const legal = toPayload(legalLines).map((l) => ({
        ...l,
        category: 'legal' as const,
        tax_treatment: l.tax_treatment,
      }));
      const service = toPayload(serviceLines).map((l) => ({
        ...l,
        category: (l.category === 'discount' ? 'discount' : 'service') as 'service' | 'discount',
        tax_treatment: 'TAXABLE_10' as const,
      }));
      const res = await fetch(`/api/quotes/${initialQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_items: legal,
          service_items: service,
          notes: notes || null,
          status,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.show(json.error ?? `保存に失敗しました (${res.status})`);
        return;
      }
      savedSnapshot.current = serializeEditorState(legalLines, serviceLines, notes, status);
      toast.show('保存しました');
      onSaved?.();
      if (!embedded) router.refresh();
    } catch (e) {
      toast.show((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [initialQuote.id, legalLines, serviceLines, notes, status, router, toast, onSaved, embedded]);

  function renderDesktopTable(which: 'legal' | 'service', lines: EditableLine[], title: string) {
    return (
      <div className="desktop-only">
        <h3 className="quote-section-label" style={{ marginTop: which === 'service' ? 16 : 0 }}>
          {title}
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>品目</th>
              {editable ? (
                <>
                  <th style={{ width: 56 }}>数量</th>
                  <th style={{ width: 100 }}>単価</th>
                  <th style={{ width: 90 }}>税</th>
                  {which === 'service' ? <th style={{ width: 100 }}>種別</th> : null}
                  <th style={{ width: 44 }} />
                </>
              ) : null}
              <th style={{ textAlign: 'right', borderBottom: '1px solid var(--border)', width: '22%' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => {
              const amount = Math.round(row.quantity * row.unit_price);
              return (
                <tr key={row.id}>
                  <td style={{ padding: '6px 0' }}>
                    {editable ? (
                      <input
                        className="input"
                        style={{ fontSize: 13 }}
                        value={row.label}
                        onChange={(e) => patchLine(which, row.id, { label: e.target.value })}
                      />
                    ) : (
                      row.label
                    )}
                  </td>
                  {editable ? (
                    <>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          style={{ fontSize: 13, width: '100%' }}
                          value={row.quantity}
                          onChange={(e) =>
                            patchLine(which, row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          style={{ fontSize: 13, width: '100%' }}
                          value={row.unit_price}
                          onChange={(e) => patchLine(which, row.id, { unit_price: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <select
                          className="select"
                          style={{ fontSize: 12 }}
                          value={row.tax_treatment}
                          onChange={(e) =>
                            patchLine(which, row.id, {
                              tax_treatment: e.target.value as 'NON_TAXABLE' | 'TAXABLE_10',
                            })
                          }
                        >
                          <option value="NON_TAXABLE">非課税</option>
                          <option value="TAXABLE_10">10%込</option>
                        </select>
                      </td>
                      {which === 'service' ? (
                        <td>
                          <select
                            className="select"
                            style={{ fontSize: 12 }}
                            value={row.category === 'discount' ? 'discount' : 'service'}
                            onChange={(e) =>
                              patchLine(which, row.id, {
                                category: e.target.value as 'service' | 'discount',
                                tax_treatment: 'TAXABLE_10',
                              })
                            }
                          >
                            <option value="service">作業</option>
                            <option value="discount">値引き</option>
                          </select>
                        </td>
                      ) : null}
                      <td>
                        <button type="button" className="btn btn-sm" onClick={() => removeLine(which, row.id)}>
                          削除
                        </button>
                      </td>
                    </>
                  ) : null}
                  <td style={{ textAlign: 'right' }}>{formatYen(amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable ? (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const add = newLine(which === 'legal' ? 'legal' : 'service');
                if (which === 'legal') setLegalLines((p) => [...p, add]);
                else setServiceLines((p) => [...p, add]);
              }}
            >
              + 行を追加
            </button>
            {which === 'service' ? (
              <button type="button" className="btn btn-sm" onClick={() => setServiceLines((p) => [...p, newLine('discount')])}>
                + 値引き行
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderMobileLineSection(which: 'legal' | 'service', lines: EditableLine[], title: string, defaultOpen: boolean) {
    const count = lines.length;
    return (
      <details className="panel accordion-details mobile-only" open={defaultOpen}>
        <summary className="accordion-summary">
          <span className="accordion-summary-title">
            {title}（{count}）
          </span>
        </summary>
        <div style={{ padding: '0 12px 16px' }}>
          <QuoteLineListMobile
            which={which}
            lines={lines}
            editable={editable}
            onLineTap={(line) => setEditingLine({ which, line })}
            onAddLine={() => {
              const add = newLine(which === 'legal' ? 'legal' : 'service');
              if (which === 'legal') setLegalLines((p) => [...p, add]);
              else setServiceLines((p) => [...p, add]);
            }}
            onAddDiscount={
              which === 'service' ? () => setServiceLines((p) => [...p, newLine('discount')]) : undefined
            }
          />
        </div>
      </details>
    );
  }

  function renderTaxBreakdown(className?: string) {
    return (
      <table className={className} style={{ width: '100%', maxWidth: 400, marginLeft: className ? undefined : 'auto', fontSize: 13 }}>
        <tbody>
          <tr>
            <td>対象外小計（法令費用等）</td>
            <td style={{ textAlign: 'right' }}>{formatYen(disp.non_taxable_subtotal)}</td>
          </tr>
          <tr>
            <td>10%対象・税込累計</td>
            <td style={{ textAlign: 'right' }}>{formatYen(disp.taxable_tax_included)}</td>
          </tr>
          <tr>
            <td style={{ paddingLeft: 12, color: 'var(--ink-2)' }}>内・税抜相当</td>
            <td style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{formatYen(disp.taxable_subtotal_ex_tax)}</td>
          </tr>
          <tr>
            <td>消費税（10%）</td>
            <td style={{ textAlign: 'right' }}>{formatYen(disp.tax_amount_10)}</td>
          </tr>
          <tr style={{ fontWeight: 700, fontSize: 15 }}>
            <td>合計（税込）</td>
            <td style={{ textAlign: 'right' }}>{formatYen(disp.grand_total)}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  const statusField = editable ? (
    <div className="form-field">
      <label className="form-label">ステータス</label>
      <select
        className="select"
        style={{ maxWidth: 200 }}
        value={status}
        onChange={(e) => setStatus(e.target.value as QuoteRow['status'])}
      >
        <option value="DRAFT">下書き</option>
        <option value="ISSUED">発行済み</option>
      </select>
    </div>
  ) : null;

  return (
    <section
      className={`panel quote-editor-card${showMobileSaveBar ? ' quote-editor-card-active' : ''}`}
      style={{ marginBottom: 24 }}
    >
      <QuoteMobileSummary
        quoteNo={initialQuote.quote_no}
        status={status}
        basicFeesSubtotal={sumLineItemsAmount(disp.legal)}
        additionalSubtotal={sumLineItemsAmount(disp.service)}
        grandTotal={disp.grand_total}
        isDirty={isDirty}
      />

      <header className="panel-header quote-editor-header-desktop">
        <div>
          <div className="panel-title">{initialQuote.quote_no ?? '-'}</div>
          <div className="cust-meta desktop-only">
            発行 {formatDate(initialQuote.issued_at)} / 有効 {formatDate(initialQuote.valid_until)}
          </div>
        </div>
        <span className="desktop-only">
          <Badge variant="info">{status}</Badge>
        </span>
      </header>

      <div className="quote-editor-body" style={{ padding: 20 }}>
        {editable ? (
          <>
            <div className="desktop-only" style={{ marginBottom: 16 }}>
              {statusField}
            </div>
            <details className="accordion-details mobile-only" style={{ marginBottom: 10 }}>
              <summary className="accordion-summary">
                <span className="accordion-summary-title">見積設定</span>
              </summary>
              <div style={{ padding: '12px 16px 16px' }}>{statusField}</div>
            </details>
          </>
        ) : null}

        {renderDesktopTable('legal', legalLines, `${QUOTE_SECTION_LABEL.basic}（法令費用は対象外）`)}
        {renderDesktopTable('service', serviceLines, `${QUOTE_SECTION_LABEL.additional}（税込）`)}

        {renderMobileLineSection('legal', legalLines, QUOTE_SECTION_LABEL.basic, false)}
        {renderMobileLineSection('service', serviceLines, QUOTE_SECTION_LABEL.additional, true)}

        <div className="desktop-only" style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {renderTaxBreakdown()}
        </div>

        <details className="accordion-details mobile-only" style={{ marginTop: 10 }}>
          <summary className="accordion-summary">
            <span className="accordion-summary-title">税の内訳</span>
          </summary>
          <div style={{ padding: '12px 16px 16px' }}>{renderTaxBreakdown('quote-tax-table-mobile')}</div>
        </details>

        <details className="accordion-details mobile-only" style={{ marginTop: 10 }}>
          <summary className="accordion-summary">
            <span className="accordion-summary-title">備考</span>
          </summary>
          <div style={{ padding: '12px 16px 16px' }}>
            <textarea
              className="textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!editable}
            />
          </div>
        </details>

        <div className="form-field desktop-only" style={{ marginTop: 16 }}>
          <label className="form-label">備考</label>
          <textarea
            className="textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!editable}
          />
        </div>

        {editable ? (
          <div className="desktop-only" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? '保存中…' : '明細を保存'}
            </button>
          </div>
        ) : (
          <p className="cust-meta desktop-only" style={{ marginTop: 12 }}>
            この見積は編集できません。複製発行でコピーしてから編集してください。
          </p>
        )}

        {notes && !editable ? (
          <div className="quote-notes desktop-only" style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {notes}
          </div>
        ) : null}

        <div className="desktop-only">
          <QuoteStaffActions
            quoteId={initialQuote.id}
            vehicleId={vehicleId}
            shareUrl={shareUrl}
            lineNotifyEligible={lineNotifyEligible}
            variant="inline"
          />
        </div>

        <details className="accordion-details mobile-only" style={{ marginTop: 10 }}>
          <summary className="accordion-summary">
            <span className="accordion-summary-title">送付・その他</span>
          </summary>
          <div style={{ padding: '12px 16px 16px' }}>
            <QuoteStaffActions
              quoteId={initialQuote.id}
              vehicleId={vehicleId}
              shareUrl={shareUrl}
              lineNotifyEligible={lineNotifyEligible}
              variant="stacked"
            />
            <p className="cust-meta" style={{ marginTop: 12 }}>
              自動車区分・エコ減税は{' '}
              <Link className="panel-link" href={`/customers/${customerId}`}>
                顧客詳細（車両）
              </Link>
              で編集
            </p>
          </div>
        </details>

        <p className="cust-meta desktop-only" style={{ marginTop: 12 }}>
          自動車区分・エコ減税の設定は{' '}
          <Link className="panel-link" href={`/customers/${customerId}`}>
            顧客詳細（車両）
          </Link>
          で編集してください。
        </p>
      </div>

      {editable && showMobileSaveBar ? (
        <QuoteSaveBar
          basicFeesSubtotal={sumLineItemsAmount(disp.legal)}
          grandTotal={disp.grand_total}
          saving={saving}
          quoteLabel={initialQuote.quote_no}
          onSave={() => void save()}
        />
      ) : null}

      <QuoteLineEditSheet
        open={editingLine !== null}
        onClose={closeLineEdit}
        line={editingLine?.line ?? null}
        which={editingLine?.which ?? 'legal'}
        onSave={(patch) => {
          if (!editingLine) return;
          patchLine(editingLine.which, editingLine.line.id, patch);
        }}
        onDelete={
          editingLine && editable
            ? () => removeLine(editingLine.which, editingLine.line.id)
            : undefined
        }
      />
    </section>
  );
}
