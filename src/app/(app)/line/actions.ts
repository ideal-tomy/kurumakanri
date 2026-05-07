'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';

const linkSchema = z.object({
  customer_id: z.string().uuid('顧客IDの形式が不正です'),
  line_user_id: z
    .string()
    .regex(
      /^U[0-9a-f]{32,}$/i,
      'LINE userId は U で始まる ID を指定してください',
    ),
});

export async function linkLineUserAction(formData: FormData) {
  const ctx = await requireStaff();
  const supabase = getServerSupabase();

  const { customer_id: customerId, line_user_id: lineUserId } = linkSchema.parse({
    customer_id: formData.get('customer_id') ?? '',
    line_user_id: formData.get('line_user_id') ?? '',
  });

  // 他顧客に既に紐付いていないか事前チェック
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name')
    .eq('line_user_id', lineUserId)
    .maybeSingle();
  if (existing && existing.id !== customerId) {
    throw new Error(
      `この LINE userId は既に「${existing.name}」さんに紐付けられています`,
    );
  }

  const { error: updateError } = await supabase
    .from('customers')
    .update({ line_user_id: lineUserId })
    .eq('id', customerId);
  if (updateError) {
    if ((updateError as { code?: string }).code === '23505') {
      throw new Error('この LINE userId は既に他の顧客に登録されています');
    }
    throw new Error(updateError.message);
  }

  // LINE 配信同意を ON で upsert
  await supabase.from('consents').upsert(
    {
      customer_id: customerId,
      channel: 'LINE',
      opt_in: true,
      opt_out_at: null,
      source: 'line_match_manual',
    },
    { onConflict: 'customer_id,channel' },
  );

  await writeAudit({
    userId: ctx.userId,
    action: 'line.match_manual',
    resource: 'customers',
    resourceId: customerId,
    payload: { lineUserId },
  });

  revalidatePath('/line/unmatched');
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/customers');
}
