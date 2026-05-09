import type { RuleKey } from '@/lib/rules';

/** /api/notifications/send と共通のテンプレキー解決 */
export const ruleToNotificationTemplateKey: Record<RuleKey, string> = {
  shaken_180days: 'shaken_180days',
  shaken_90days: 'shaken_90days',
  oil_4000km: 'oil_4000km',
};

/** send / review で共有 */
export function resolveNotificationTemplateKey(
  rule: string,
  explicitKey?: string | null,
): string {
  if (explicitKey && explicitKey.trim() !== '') return explicitKey.trim();
  if (rule === 'custom') return 'custom';
  if (rule in ruleToNotificationTemplateKey) {
    return ruleToNotificationTemplateKey[rule as RuleKey];
  }
  return rule;
}
