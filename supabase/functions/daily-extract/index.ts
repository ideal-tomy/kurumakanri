// =====================================================================
// Edge Function: daily-extract
//
// 用途:
//   - 毎日 1 回（推奨: 朝 8:00 JST）に通知ルールに合致する顧客を抽出して
//     `notification_jobs` に投入する。
//   - 納品時は **OFF 状態** で配置されている（Cron は登録しない）。
//   - 自動送信機能を有効化したい場合は、運用合意の上で
//     `pg_cron` あるいは Supabase の Scheduled Functions 機能で
//     このエンドポイントを毎日呼び出す設定を追加する。
//
// セーフガード:
//   - 環境変数 AUTO_SEND_ENABLED が "true" でない場合は dry-run のみ。
//   - 冪等キーを必ず付与し、二重投入を防ぐ。
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface OverviewRow {
  customer_id: string;
  vehicle_id: string | null;
  inspection_expire_date: string | null;
  days_until_inspection: number | null;
  estimated_mileage: number | null;
  initial_mileage: number | null;
  last_oil_change_mileage: number | null;
  oil_interval_km: number | null;
}

const RULES = [
  { rule_key: 'shaken_180days', view: 'v_targets_shaken_180' },
  { rule_key: 'shaken_90days', view: 'v_targets_shaken_90' },
  { rule_key: 'oil_4000km', view: 'v_targets_oil' },
];

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

async function buildKey(customerId: string, ruleKey: string, channel: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const hash = await sha1Hex(`${today}:${customerId}:${ruleKey}:${channel}`);
  return `${today}-${ruleKey}-${channel}-${hash}`;
}

Deno.serve(async (_req: Request) => {
  const enabled = (Deno.env.get('AUTO_SEND_ENABLED') ?? 'false').toLowerCase() === 'true';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const summary: Record<string, { found: number; queued: number }> = {};

  for (const r of RULES) {
    const { data, error } = await supabase.from(r.view).select('*');
    if (error) {
      summary[r.rule_key] = { found: 0, queued: 0 };
      continue;
    }
    const rows = (data ?? []) as OverviewRow[];
    summary[r.rule_key] = { found: rows.length, queued: 0 };

    if (!enabled) continue;

    for (const row of rows) {
      if (!row.vehicle_id) continue;
      for (const channel of ['LINE', 'MAIL'] as const) {
        const key = await buildKey(row.customer_id, r.rule_key, channel);
        const { error: insertErr } = await supabase
          .from('notification_jobs')
          .insert({
            customer_id: row.customer_id,
            vehicle_id: row.vehicle_id,
            channel,
            template_key: r.rule_key,
            scheduled_at: new Date().toISOString(),
            status: 'PENDING',
            idempotency_key: key,
            payload: { auto: true, ruleKey: r.rule_key },
          });
        if (!insertErr) summary[r.rule_key].queued += 1;
      }
    }
  }

  await supabase.from('audit_logs').insert({
    action: 'edge.daily_extract',
    resource: 'notification_jobs',
    payload: { enabled, summary },
  });

  return new Response(JSON.stringify({ ok: true, enabled, summary }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
