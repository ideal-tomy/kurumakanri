import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

interface LineEvent {
  type: 'follow' | 'unfollow' | 'message' | 'unsend' | 'memberJoined' | 'memberLeft';
  source: { type: string; userId?: string };
  message?: { type: string; text?: string };
  timestamp: number;
  replyToken?: string;
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return process.env.NODE_ENV !== 'production';
  const hmac = createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature');
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = body.events ?? [];
  const supabase = getServiceSupabase();

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    if (event.type === 'follow') {
      // 既存顧客と紐づいていなければ pending として記録（管理画面で照合）
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('line_user_id', userId)
        .maybeSingle();
      if (!existing) {
        await supabase.from('audit_logs').insert({
          action: 'line.follow_unmatched',
          resource: 'customers',
          payload: { lineUserId: userId },
        });
      }
    } else if (event.type === 'unfollow') {
      // フォロー解除 → LINE オプトアウト扱い
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('line_user_id', userId)
        .maybeSingle();
      if (customer) {
        await supabase.from('consents').upsert(
          {
            customer_id: customer.id,
            channel: 'LINE',
            opt_in: false,
            opt_out_at: new Date().toISOString(),
            source: 'line_unfollow',
          },
          { onConflict: 'customer_id,channel' },
        );
      }
    } else if (event.type === 'message') {
      // メッセージ内に「紐付けコード:XXXX」を含む場合は line_user_id を更新する運用
      const text = event.message?.text ?? '';
      const m = text.match(/(?:紐付けコード|code)[:：]?\s*([A-Z0-9-]{4,})/i);
      if (m) {
        const code = m[1].toUpperCase();
        await supabase.from('audit_logs').insert({
          action: 'line.match_attempt',
          resource: 'customers',
          payload: { code, lineUserId: userId },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
