/**
 * 法定費用テキスト整形:
 * LINE / メールテンプレに差し込む `{{legalFeesTotal}}` / `{{legalFeesBreakdown}}` を組み立てる。
 *
 * - `total` は 4桁区切り整数（「24,600」）
 * - `breakdown` は「・ラベル：¥金額」を改行で連結した文字列
 */

import { LEGAL_ITEMS_FALLBACK, rowsFromStoredJson, type QuoteLineItem } from '@/lib/quote';

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
 * `QuoteLineItem[]` から法定費用のサマリーテキストを生成する。
 * `service_items` 等のサービス行が混ざっていても、非課税（NON_TAXABLE）行のみを対象にする。
 */
export function buildLegalFeesTextFromItems(items: QuoteLineItem[]): LegalFeesText {
  const legal = items.filter((i) => i.tax_treatment === 'NON_TAXABLE');
  const lines = legal.map((i) => ({ label: i.label, amount: i.amount }));
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
 * 見積の `legal_items`（DB の JSON 列）からテキストを組み立てる。
 * 見積が無い／空のときは `LEGAL_ITEMS_FALLBACK` から組み立てる。
 */
export function buildLegalFeesTextFromQuote(legalItemsJson: unknown): LegalFeesText {
  const items = rowsFromStoredJson(legalItemsJson);
  if (items.length === 0) {
    return buildLegalFeesTextFromItems(LEGAL_ITEMS_FALLBACK);
  }
  return buildLegalFeesTextFromItems(items);
}

/** 見積行が無い場合のフォールバック単体取り出し（テスト・dispatcher で利用）。 */
export function buildLegalFeesTextFallback(): LegalFeesText {
  return buildLegalFeesTextFromItems(LEGAL_ITEMS_FALLBACK);
}
