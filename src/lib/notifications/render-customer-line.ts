import { buildMessageVariables, loadActiveTemplate } from '@/lib/dispatcher';
import { renderTemplate } from '@/lib/template';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

export async function renderLineNotificationForCustomer(
  overview: CustomerOverviewRow,
  templateKey: string,
): Promise<string | null> {
  const template = await loadActiveTemplate(templateKey, 'LINE');
  if (!template) return null;
  const vars = await buildMessageVariables(overview, { channel: 'LINE' });
  return renderTemplate(template.content, vars);
}
