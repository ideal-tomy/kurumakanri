/**
 * 車検基本費用テキスト整形:
 * LINE / メールテンプレに差し込む `{{legalFeesTotal}}` / `{{legalFeesBreakdown}}` を組み立てる。
 * （変数名は後方互換のため legalFees のまま。中身は legal_items = 車検基本費用 全行）
 *
 * - `total` は 4桁区切り整数（「24,600」）
 * - `breakdown` は「・ラベル：¥金額」を改行で連結した文字列
 */

import {
  FIXED_BASIC_ITEMS,
  LEGAL_ITEMS_FALLBACK,
  normalizeQuoteSections,
  rowsFromStoredJson,
  type QuoteLineItem,
} from '@/lib/quote';

export interface LegalFeesText {
  total: number;
  totalFormatted: string;
  breakdown: string;
  lines: { label: string; amount: number }[];
}

function formatYenComma(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

/**
 * `QuoteLineItem[]`（= 車検基本費用行）からサマリーテキストを生成する。
 */
export function buildLegalFeesTextFromItems(items: QuoteLineItem[]): LegalFeesText {
  const lines = items.map((i) => ({ label: i.label, amount: i.amount }));
  const total = lines.reduce((acc, l) => acc + l.amount, 0);
  const breakdown = lines
    .map((l) => `・${l.label}：¥${formatYenComma(l.amount)}`)
    .join('\n');
  return {
    total,
    totalFormatted: formatYenComma(total),
    breakdown,
    lines,
  };
}

/**
 * 見積の `legal_items` / `service_items` から車検基本費用テキストを組み立てる。
 * 旧データ（24点検が service 側）も normalize して含める。
 */
export function buildLegalFeesTextFromQuote(
  legalItemsJson: unknown,
  serviceItemsJson?: unknown,
): LegalFeesText {
  const serviceRaw = serviceItemsJson != null ? rowsFromStoredJson(serviceItemsJson) : [];
  const { legal_items } = normalizeQuoteSections(rowsFromStoredJson(legalItemsJson), serviceRaw);
  if (legal_items.length === 0) {
    return buildLegalFeesTextFromItems([...LEGAL_ITEMS_FALLBACK, ...FIXED_BASIC_ITEMS]);
  }
  return buildLegalFeesTextFromItems(legal_items);
}

/** 見積行が無い場合のフォールバック単体取り出し（テスト・dispatcher で利用）。 */
export function buildLegalFeesTextFallback(): LegalFeesText {
  return buildLegalFeesTextFromItems([...LEGAL_ITEMS_FALLBACK, ...FIXED_BASIC_ITEMS]);
}
