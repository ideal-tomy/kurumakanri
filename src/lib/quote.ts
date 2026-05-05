/**
 * 自動見積ロジック。
 * - 法定費用は固定値
 * - 標準整備項目は車種カテゴリ別の単価
 * - 備考は固定テンプレ（実車確認後に追加整備の可能性がある旨）
 */

export interface QuoteLineItem {
  label: string;
  amount: number;
  category?: 'legal' | 'service';
}

export interface QuoteEstimate {
  legal_items: QuoteLineItem[];
  service_items: QuoteLineItem[];
  total_amount: number;
  notes: string;
}

export const LEGAL_ITEMS_DEFAULT: QuoteLineItem[] = [
  { label: '自賠責保険料（24ヶ月）', amount: 17650, category: 'legal' },
  { label: '重量税（エコカー減税適用）', amount: 15000, category: 'legal' },
  { label: '印紙代', amount: 1800, category: 'legal' },
];

export const SERVICE_ITEMS_DEFAULT: QuoteLineItem[] = [
  { label: '24ヶ月点検基本料', amount: 28000, category: 'service' },
  { label: 'ブレーキフルード交換', amount: 4500, category: 'service' },
  { label: 'エンジンオイル交換', amount: 6200, category: 'service' },
];

export const DEFAULT_NOTES =
  '※ 足回り・タイヤ等の状態によっては、実車確認後に追加整備が必要となる場合があります。\n※ 表示価格はすべて税込です。';

export function buildAutoQuote(args: {
  includeOilChange?: boolean;
  extraServices?: QuoteLineItem[];
  notesAppend?: string;
}): QuoteEstimate {
  const legal_items = [...LEGAL_ITEMS_DEFAULT];
  const service_items = SERVICE_ITEMS_DEFAULT.filter(
    (i) => args.includeOilChange !== false || i.label !== 'エンジンオイル交換',
  );
  if (args.extraServices?.length) service_items.push(...args.extraServices);
  const total = [...legal_items, ...service_items].reduce(
    (sum, i) => sum + i.amount,
    0,
  );
  const notes = args.notesAppend
    ? `${DEFAULT_NOTES}\n\n${args.notesAppend}`
    : DEFAULT_NOTES;
  return { legal_items, service_items, total_amount: total, notes };
}
