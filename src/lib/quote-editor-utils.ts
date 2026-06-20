import { rowsFromStoredJson, normalizeQuoteSections, type QuoteLineItem } from '@/lib/quote';

export type EditableLine = {
  id: string;
  label: string;
  quantity: number;
  unit_price: number;
  tax_treatment: 'NON_TAXABLE' | 'TAXABLE_10';
  category: 'legal' | 'service' | 'discount';
};

export function toEditable(json: unknown, prefix: string): EditableLine[] {
  const rows = rowsFromStoredJson(json);
  return rows.map((r, i) => editableLineFromItem(r, `${prefix}-${i}-${r.label}`));
}

function editableLineFromItem(r: QuoteLineItem, id: string): EditableLine {
  return {
    id,
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
  };
}

/** 旧データ互換の正規化込みで編集用行を生成 */
export function initEditableSections(legalJson: unknown, serviceJson: unknown) {
  const { legal_items, service_items } = normalizeQuoteSections(
    rowsFromStoredJson(legalJson),
    rowsFromStoredJson(serviceJson),
  );
  return {
    legalLines: legal_items.map((r, i) => editableLineFromItem(r, `leg-${i}-${r.label}`)),
    serviceLines: service_items.map((r, i) => editableLineFromItem(r, `svc-${i}-${r.label}`)),
  };
}

export function toPayload(lines: EditableLine[]): QuoteLineItem[] {
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

export function newLine(category: 'legal' | 'service' | 'discount'): EditableLine {
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

export function serializeEditorState(
  legalLines: EditableLine[],
  serviceLines: EditableLine[],
  notes: string,
  status: string,
): string {
  return JSON.stringify({
    legal: toPayload(legalLines),
    service: toPayload(serviceLines),
    notes,
    status,
  });
}
