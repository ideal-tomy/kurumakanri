/** 車検残日数から通知テンプレートキーを推定（見積画面からの手動送信など） */
export function resolveShakenTemplateKeyFromDays(days: number | null | undefined): string {
  if (days == null) return 'quote_notify';
  if (days < 0) return 'shaken_overdue';
  if (days <= 30) return 'shaken_30days';
  if (days <= 90) return 'shaken_90days';
  if (days <= 210) return 'shaken_180days';
  return 'quote_notify';
}
