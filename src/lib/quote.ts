/**
 * 自動見積: 車両スペック + 法定費用マスタ → 明細・税計算スナップショット。
 * サービス側の金額は税込として保持し、公開画面で10%本体・税額に分解して表示する。
 */

import type { StatutoryFeeRateRow } from '@/lib/supabase/types';
import { pickStatutoryFeeRow } from '@/lib/statutory';

export type TaxTreatment = 'NON_TAXABLE' | 'TAXABLE_10';

export interface QuoteLineItem {
  label: string;
  /** 税込（TAXABLE_10）または非課税額そのもの */
  amount: number;
  quantity: number;
  unit_price: number;
  tax_treatment: TaxTreatment;
  category?: 'legal' | 'service' | 'discount';
}

export interface VehicleSpecs {
  vehicle_class?: 'LIGHT' | 'STANDARD';
  eco_reduction_eligible?: boolean;
  displacement_cc?: number | null;
  gross_weight_kg?: number | null;
}

export interface QuoteTotals {
  non_taxable_subtotal: number;
  taxable_tax_included: number;
  taxable_subtotal_ex_tax: number;
  tax_amount_10: number;
  grand_total: number;
}

export interface QuoteEstimate extends QuoteTotals {
  legal_items: QuoteLineItem[];
  service_items: QuoteLineItem[];
  /** total_amount と同値（後方互換・集計クエリ向け） */
  total_amount: number;
  notes: string;
}

export const QUOTE_SECTION_LABEL = {
  basic: '車検基本費用',
  additional: '追加整備・部品（実車確認後）',
} as const;

export const DEFAULT_NOTES =
  '※ 足回り・タイヤ等の状態によっては、実車確認後に追加整備が必要となる場合があります。\n' +
  '※ 法令・手続区分により実費が変わることがあります。本書は概算です。\n' +
  '※ エコカー減税・重量税の適用は、登録情報・実車・届出の内容により異なります（お客様の環境で変わることがあります）。店舗にてご確認ください。\n' +
  '※ 車検基本費用のうち法令費用は消費税の対象外、点検基本料等は10%込み、追加整備・部品は10%込みです。';

function lineTaxIncluded(
  label: string,
  unitTaxInc: number,
  qty = 1,
  category?: 'legal' | 'service' | 'discount',
): QuoteLineItem {
  const amount = qty * unitTaxInc;
  return {
    label,
    quantity: qty,
    unit_price: unitTaxInc,
    amount,
    tax_treatment: 'TAXABLE_10',
    category,
  };
}

function lineNonTax(label: string, unit: number, qty = 1, category?: 'legal' | 'service'): QuoteLineItem {
  const amount = qty * unit;
  return {
    label,
    quantity: qty,
    unit_price: unit,
    amount,
    tax_treatment: 'NON_TAXABLE',
    category,
  };
}

/** 開発・マスタ未取得時の法定行（標準自動車・非エコ例） */
export const LEGAL_ITEMS_FALLBACK: QuoteLineItem[] = [
  lineNonTax('自動車重量税', 24600, 1, 'legal'),
  lineNonTax('自賠責保険24ヶ月', 17650, 1, 'legal'),
  lineNonTax('予備検査費用', 2200, 1, 'legal'),
  lineNonTax('検査レーン印紙代', 2300, 1, 'legal'),
  lineNonTax('代書費用', 770, 1, 'legal'),
];

/** 車検基本費用に含める確定整備（法令費用以外・割引対象外想定） */
export const FIXED_BASIC_ITEMS: QuoteLineItem[] = [
  lineTaxIncluded('24ヶ月点検基本料', 28000, 1, 'legal'),
];

export function isBasicFeeServiceLine(label: string): boolean {
  return label.includes('24ヶ月点検') || label.includes('24ヶ月点検基本料');
}

/** 旧見積互換: service 側に残っている基本費用行を legal へ移す */
export function normalizeQuoteSections(
  legal_items: QuoteLineItem[],
  service_items: QuoteLineItem[],
): { legal_items: QuoteLineItem[]; service_items: QuoteLineItem[] } {
  const toMove = service_items.filter((i) => isBasicFeeServiceLine(i.label));
  if (toMove.length === 0) return { legal_items, service_items };
  const remaining = service_items.filter((i) => !isBasicFeeServiceLine(i.label));
  const legalLabels = new Set(legal_items.map((i) => i.label));
  const moved = toMove
    .filter((i) => !legalLabels.has(i.label))
    .map((i) => ({ ...i, category: 'legal' as const }));
  return { legal_items: [...legal_items, ...moved], service_items: remaining };
}

export function sumLineItemsAmount(items: QuoteLineItem[]): number {
  return items.reduce((acc, i) => acc + i.amount, 0);
}

export function LABOR_ITEMS_DEFAULT(includeOilChange: boolean): QuoteLineItem[] {
  const rows: QuoteLineItem[] = [
    lineTaxIncluded('車検代行費用（運搬・代替車含む・概算）', 25000, 1, 'service'),
    lineTaxIncluded('ブレーキフルード交換', 4500, 1, 'service'),
  ];
  if (includeOilChange) {
    rows.push(lineTaxIncluded('エンジンオイル交換', 6200, 1, 'service'));
  }
  return rows;
}

export function computeTotalsFromParts(
  legal_items: QuoteLineItem[],
  service_items: QuoteLineItem[],
): Omit<QuoteTotals, never> {
  let non_taxable_subtotal = 0;
  let taxable_tax_included = 0;
  for (const i of legal_items) {
    if (i.tax_treatment === 'NON_TAXABLE') non_taxable_subtotal += i.amount;
    else taxable_tax_included += i.amount;
  }
  for (const i of service_items) {
    if (i.tax_treatment === 'NON_TAXABLE') non_taxable_subtotal += i.amount;
    else taxable_tax_included += i.amount;
  }
  const taxable_subtotal_ex_tax = Math.round(taxable_tax_included / 1.1);
  const tax_amount_10 = taxable_tax_included - taxable_subtotal_ex_tax;
  const grand_total = non_taxable_subtotal + taxable_tax_included;
  return {
    non_taxable_subtotal,
    taxable_tax_included,
    taxable_subtotal_ex_tax,
    tax_amount_10,
    grand_total,
  };
}

function legalLinesFromStatutory(rate: StatutoryFeeRateRow, eco: boolean): QuoteLineItem[] {
  const wt = eco ? rate.weight_tax_yen_eco : rate.weight_tax_yen_standard;
  return [
    lineNonTax('自動車重量税', wt, 1, 'legal'),
    lineNonTax('自賠責保険24ヶ月', rate.jibaiseki_24mo_yen, 1, 'legal'),
    lineNonTax('予備検査費用', rate.prepaid_inspection_yen, 1, 'legal'),
    lineNonTax('検査レーン印紙代', rate.lane_stamp_yen, 1, 'legal'),
    lineNonTax('代書費用', rate.document_fee_yen, 1, 'legal'),
  ];
}

export function parseVehicleSpecs(raw: unknown): VehicleSpecs {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const vc = o.vehicle_class;
  const vehicle_class = vc === 'LIGHT' || vc === 'STANDARD' ? vc : undefined;
  return {
    vehicle_class,
    eco_reduction_eligible: o.eco_reduction_eligible === true,
    displacement_cc: typeof o.displacement_cc === 'number' ? o.displacement_cc : null,
    gross_weight_kg: typeof o.gross_weight_kg === 'number' ? o.gross_weight_kg : null,
  };
}

export function normalizeQuoteLineItem(raw: unknown): QuoteLineItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label : null;
  if (!label) return null;
  const amount = typeof o.amount === 'number' ? Math.round(o.amount) : NaN;
  if (!Number.isFinite(amount)) return null;
  const quantity =
    typeof o.quantity === 'number' && Number.isFinite(o.quantity) ? Math.round(o.quantity) : 1;
  const unit_price =
    typeof o.unit_price === 'number' && Number.isFinite(o.unit_price)
      ? Math.round(o.unit_price)
      : quantity > 0
        ? Math.round(amount / quantity)
        : amount;
  const tt = o.tax_treatment === 'NON_TAXABLE' || o.tax_treatment === 'TAXABLE_10' ? o.tax_treatment : null;
  const category =
    o.category === 'legal' || o.category === 'service' || o.category === 'discount'
      ? (o.category as 'legal' | 'service' | 'discount')
      : undefined;
  const inferredTax: TaxTreatment =
    tt ??
    (category === 'discount'
      ? 'TAXABLE_10'
      : category === 'service' ||
          String(label).includes('工賃') ||
          String(label).includes('交換') ||
          String(label).includes('点検費')
        ? 'TAXABLE_10'
        : 'NON_TAXABLE');
  return {
    label,
    quantity: quantity > 0 ? quantity : 1,
    unit_price,
    amount,
    tax_treatment: inferredTax,
    category:
      category ??
      (inferredTax === 'NON_TAXABLE'
        ? 'legal'
        : inferredTax === 'TAXABLE_10'
          ? 'service'
          : undefined),
  };
}

export function rowsFromStoredJson(rows: unknown): QuoteLineItem[] {
  if (!Array.isArray(rows)) return [];
  const out: QuoteLineItem[] = [];
  for (const r of rows) {
    const n = normalizeQuoteLineItem(r);
    if (n) out.push(n);
  }
  return out;
}

export function quoteTotalsForDisplay(quote: {
  legal_items: unknown;
  service_items: unknown;
  taxable_subtotal_ex_tax?: number | null;
  tax_amount_10?: number | null;
  non_taxable_subtotal?: number | null;
  grand_total?: number | null;
  total_amount: number;
}) {
  const legalRaw = rowsFromStoredJson(quote.legal_items);
  const serviceRaw = rowsFromStoredJson(quote.service_items);
  const { legal_items: legal, service_items: service } = normalizeQuoteSections(legalRaw, serviceRaw);
  const computed = computeTotalsFromParts(legal, service);
  const totalFromDb =
    quote.total_amount != null && quote.total_amount > 0 ? quote.total_amount : null;
  return {
    legal,
    service,
    non_taxable_subtotal: quote.non_taxable_subtotal ?? computed.non_taxable_subtotal,
    taxable_subtotal_ex_tax: quote.taxable_subtotal_ex_tax ?? computed.taxable_subtotal_ex_tax,
    tax_amount_10: quote.tax_amount_10 ?? computed.tax_amount_10,
    grand_total: quote.grand_total ?? totalFromDb ?? computed.grand_total,
    taxable_tax_included: computed.taxable_tax_included,
  };
}

/** 編集画面: 明細行から常にライブ集計（DB の 0 円スナップショットに引きずられない） */
export function quoteTotalsFromLinePayloads(
  legal_items: QuoteLineItem[],
  service_items: QuoteLineItem[],
) {
  const totals = computeTotalsFromParts(legal_items, service_items);
  return {
    legal: legal_items,
    service: service_items,
    ...totals,
  };
}

export function buildQuoteEstimate(args: {
  legal_items: QuoteLineItem[];
  service_items: QuoteLineItem[];
  notesAppend?: string;
}): QuoteEstimate {
  const t = computeTotalsFromParts(args.legal_items, args.service_items);
  const notes = args.notesAppend ? `${DEFAULT_NOTES}\n\n${args.notesAppend}` : DEFAULT_NOTES;
  return {
    ...t,
    legal_items: args.legal_items,
    service_items: args.service_items,
    total_amount: t.grand_total,
    notes,
  };
}

/**
 * statutoryRates: DB から取得したマスタ一覧（複数適用開始日）。
 * statutoryRates が空なら pick は null でフォールバック行を利用。
 */
export function buildQuoteFromVehicle(args: {
  vehicleSpecs?: unknown;
  statutoryRates?: StatutoryFeeRateRow[];
  statutoryRow?: StatutoryFeeRateRow | null;
  /** YYYY-MM-DD */
  asOfDate: string;
  includeOilChange?: boolean;
  extraServices?: QuoteLineItem[];
  notesAppend?: string;
}): QuoteEstimate {
  const specs = parseVehicleSpecs(args.vehicleSpecs);
  const vclass = specs.vehicle_class ?? 'STANDARD';
  const rate =
    args.statutoryRow !== undefined
      ? args.statutoryRow
      : args.statutoryRates?.length
        ? pickStatutoryFeeRow(args.statutoryRates, vclass, args.asOfDate)
        : null;
  const eco = specs.eco_reduction_eligible === true;

  const statutory = rate ? legalLinesFromStatutory(rate, eco) : [...LEGAL_ITEMS_FALLBACK];
  let legal_items: QuoteLineItem[] = [...statutory, ...FIXED_BASIC_ITEMS];

  let service_items = LABOR_ITEMS_DEFAULT(args.includeOilChange === true);
  if (args.extraServices?.length) service_items = [...service_items, ...args.extraServices];
  return buildQuoteEstimate({
    legal_items,
    service_items,
    notesAppend: args.notesAppend,
  });
}

/** 既存 API との互換: 車両情報なし・マスタ未取得時でも概算を返す */
export function buildAutoQuote(args: {
  includeOilChange?: boolean;
  extraServices?: QuoteLineItem[];
  notesAppend?: string;
}): QuoteEstimate {
  return buildQuoteFromVehicle({
    asOfDate: new Date().toISOString().slice(0, 10),
    includeOilChange: args.includeOilChange,
    extraServices: args.extraServices,
    notesAppend: args.notesAppend,
    statutoryRates: [],
  });
}

export function quoteTotalsForDb(e: QuoteEstimate) {
  return {
    total_amount: e.grand_total,
    grand_total: e.grand_total,
    taxable_subtotal_ex_tax: e.taxable_subtotal_ex_tax,
    tax_amount_10: e.tax_amount_10,
    non_taxable_subtotal: e.non_taxable_subtotal,
  };
}
