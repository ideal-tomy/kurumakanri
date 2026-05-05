import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

interface ResendEvent {
  type: string;
  created_at: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    bounce?: { type?: string };
  };
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !signature) return process.env.NODE_ENV !== 'production';
  const hmac = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('resend-signature') ?? req.headers.get('x-webhook-signature');
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as ResendEvent;
  const supabase = getServiceSupabase();
  const messageId = event.data?.email_id;

  let result: 'BOUNCED' | 'COMPLAINED' | 'SUCCESS' | null = null;
  if (event.type === 'email.bounced') result = 'BOUNCED';
  else if (event.type === 'email.complained') result = 'COMPLAINED';
  else if (event.type === 'email.delivered') result = 'SUCCESS';

  if (result && messageId) {
    const { data: log } = await supabase
      .from('notification_logs')
      .select('id, job_id')
      .eq('provider_message_id', messageId)
      .maybeSingle();
    if (log) {
      await supabase.from('notification_logs').insert({
        job_id: log.job_id,
        provider: 'mail',
        provider_message_id: messageId,
        result,
        error_code: event.data?.bounce?.type ?? null,
        payload: event.data ?? null,
      });
    }
  }

  // bounce/complaint は対象アドレスを MAIL オプトアウトに
  const to = Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to;
  if ((result === 'BOUNCED' || result === 'COMPLAINED') && to) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', to)
      .maybeSingle();
    if (customer) {
      await supabase.from('consents').upsert(
        {
          customer_id: customer.id,
          channel: 'MAIL',
          opt_in: false,
          opt_out_at: new Date().toISOString(),
          source: result.toLowerCase(),
        },
        { onConflict: 'customer_id,channel' },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
