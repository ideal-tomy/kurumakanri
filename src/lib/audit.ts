import { getServerSupabase } from './supabase/server';

export async function writeAudit(args: {
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  const supabase = getServerSupabase();
  await supabase.from('audit_logs').insert({
    user_id: args.userId,
    action: args.action,
    resource: args.resource,
    resource_id: args.resourceId ?? null,
    payload: args.payload ?? null,
  });
}
