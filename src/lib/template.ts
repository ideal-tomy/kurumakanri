/**
 * Mustache 風の超軽量テンプレ。
 * `{{name}}` のような変数を辞書から差し替える。未定義はそのまま空文字。
 */
export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
}
