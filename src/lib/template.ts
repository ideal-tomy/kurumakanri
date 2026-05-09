/**
 * DB に "\\n" として保存されている改行を実改行へ（LINE などの表示ずれ対策）。
 */
export function normalizeMessageNewlines(text: string): string {
  return text.replace(/\\n/g, '\n');
}

/**
 * Mustache 風の超軽量テンプレ。
 * `{{name}}` のような変数を辞書から差し替える。未定義はそのまま空文字。
 */
export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  const raw = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
  return normalizeMessageNewlines(raw);
}
