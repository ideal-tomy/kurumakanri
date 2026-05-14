'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/badge';
import { formatDate, formatYen } from '@/lib/format';
import {
  quoteTotalsForDisplay,
  rowsFromStoredJson,
  type QuoteLineItem,
} from '@/lib/quote';
import type { QuoteRow } from '@/lib/supabase/types';
import { QuoteStaffActions } from './quote-staff-actions';

type EditableLine = {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
  tax_treatment: 'NON_TAXABLE' | 'TAXABLE_10';
  category: 'legal' | 'service' | 'discount';
};

function toEditable(json: unknown, prefix: string): EditableLine[] {
  const rows = rowsFromStoredJson(json);
  return rows.map((r, i) => ({
    id: `${prefix}-${i}-${r.label}`,
    label: r.label,
    quantity: r.quantity,
    unit_price: r.unit_price,
    tax_treatment: r.tax_treatment,
    category:
      r.category === 'discount'
        ? 'discount'
        : r.category === 'legal' || r.tax_treatment === 'NON_TAXABLE'
          ? 'legal'
          : 'service',
  }));
}

function toPayload(lines: EditableLine[]): QuoteLineItem[] {
  return lines.map((l) => {
    const amount = Math.round(l.quantity * l.unit_price);
    return {
      label: l.label,
      quantity: l.quantity,
      unit_price: l.unit_price,
      amount,
      tax_treatment: l.tax_treatment,
      category: l.category,
    };
  });
}

function newLine(category: 'legal' | 'service' | 'discount'): EditableLine {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random()}`;
  if (category === 'legal') {
    return { id, label: '', quantity: 1, unit_price: 0, tax_treatment: 'NON_TAXABLE', category: 'legal' };
  }
  if (category === 'discount') {
    return { id, label: '値引き', quantity: 1, unit_price: -1000, tax_treatment: 'TAXABLE_10', category: 'discount' };
  }
  return { id, label: '', quantity: 1, unit_price: 0, tax_treatment: 'TAXABLE_10', category: 'service' };
}

export function QuoteEditorCard({
  quote: initialQuote,
  vehicleId,
  customerId,
  shareUrl,
  lineNotifyEligible,
}: {
  quote: QuoteRow;
  vehicleId: string;
  customerId: string;
  shareUrl: string | null;
  lineNotifyEligible: boolean;
}) {
  const router = useRouter();
  const editable = initialQuote.status === 'DRAFT' || initialQuote.status === 'ISSUED';

  const [legalLines, setLegalLines] = useState<EditableLine[]>(() => toEditable(initialQuote.legal_items, 'leg'));
  const [serviceLines, setServiceLines] = useState<EditableLine[]>(() =>
    toEditable(initialQuote.service_items, 'svc'),
  );
  const [notes, setNotes] = useState(initialQuote.notes ?? '');
  const [status, setStatus] = useState(initialQuote.status);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const disp = useMemo(() => {
    const legal = toPayload(legalLines);
    const service = toPayload(serviceLines);
    return quoteTotalsForDisplay({
      legal_items: legal,
      service_items: service,
      taxable_subtotal_ex_tax: null,
      tax_amount_10: null,
      non_taxable_subtotal: null,
      grand_total: null,
      total_amount: 0,
    });
  }, [legalLines, serviceLines]);

  const patchLine = useCallback(
    (which: 'legal' | 'service', id: string, patch: Partial<EditableLine>) => {
      const set = which === 'legal' ? setLegalLines : setServiceLines;
      set((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const next = { ...row, ...patch };
          return next;
        }),
      );
    },
    [],
  );

  const removeLine = useCallback((which: 'legal' | 'service', id: string) => {
    const set = which === 'legal' ? setLegalLines : setServiceLines;
    set((prev) => prev.filter((r) => r.id !== id));
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const legal = toPayload(legalLines).map((l) => ({
        ...l,
        category: 'legal' as const,
        tax_treatment: 'NON_TAXABLE' as const,
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
        setMsg(json.error ?? `保存に失敗しました (${res.status})`);
        return;
      }
      setMsg('保存しました');
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function renderTable(
    which: 'legal' | 'service',
    lines: EditableLine[],
    title: string,
  ) {
    return (
      <>
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
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setServiceLines((p) => [...p, newLine('discount')])}
              >
                + 値引き行
              </button>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <section className="panel" style={{ marginBottom: 24 }}>
      <header className="panel-header">
        <div>
          <div className="panel-title">{initialQuote.quote_no ?? '-'}</div>
          <div className="cust-meta">発行 {formatDate(initialQuote.issued_at)} / 有効 {formatDate(initialQuote.valid_until)}</div>
        </div>
        <Badge variant="info">{status}</Badge>
      </header>
      <div style={{ padding: 20 }}>
        {editable ? (
          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="form-label">ステータス</label>
            <select className="select" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value as QuoteRow['status'])}>
              <option value="DRAFT">下書き</option>
              <option value="ISSUED">発行済み</option>
            </select>
          </div>
        ) : null}

        {renderTable('legal', legalLines, '車検法定費用・手数料（対象外）')}
        {renderTable('service', serviceLines, '作業工賃（税込み表示）・値引き')}

        <div style={{ marginTop: 16, fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <table style={{ width: '100%', maxWidth: 400, marginLeft: 'auto' }}>
            <tbody>
              <tr>
                <td>対象外小計（法定）</td>
                <td style={{ textAlign: 'right' }}>{formatYen(disp.non_taxable_subtotal)}</td>
              </tr>
              <tr>
                <td>10%対象・税込累計（作業等）</td>
                <td style={{ textAlign: 'right' }}>{formatYen(disp.taxable_tax_included)}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 12, color: 'var(--ink-2)' }}>内・税抜相当</td>
                <td style={{ textAlign: 'right', color: 'var(--ink-2)' }}>
                  {formatYen(disp.taxable_subtotal_ex_tax)}
                </td>
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
        </div>

        <div className="form-field" style={{ marginTop: 16 }}>
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
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? '保存中…' : '明細を保存'}
            </button>
            {msg ? <span className="cust-meta">{msg}</span> : null}
          </div>
        ) : (
          <p className="cust-meta" style={{ marginTop: 12 }}>
            この見積は編集できません。複製発行でコピーしてから編集してください。
          </p>
        )}

        {notes && !editable ? (
          <div className="quote-notes" style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {notes}
          </div>
        ) : null}

        <QuoteStaffActions
          quoteId={initialQuote.id}
          vehicleId={vehicleId}
          shareUrl={shareUrl}
          lineNotifyEligible={lineNotifyEligible && Boolean(shareUrl)}
        />

        <p className="cust-meta" style={{ marginTop: 12 }}>
          自動車区分・エコ減税の設定は{' '}
          <Link className="panel-link" href={`/customers/${customerId}`}>
            顧客詳細（車両）
          </Link>
          で編集してください。
        </p>
      </div>
    </section>
  );
}
