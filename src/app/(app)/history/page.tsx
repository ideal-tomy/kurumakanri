import { getServerSupabase } from '@/lib/supabase/server';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import {
  countUnresolvedFailures,
  resolvedFailureJobIds,
  type JobResolutionInput,
} from '@/lib/notification-failure-resolution';
import type { NotificationJobRow, NotificationLogRow } from '@/lib/supabase/types';
import { LogsTable } from '../notifications/logs/logs-table';

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string;
  channel?: string;
  q?: string;
  /** 1 のとき未解消の失敗のみ（要対応） */
  unresolved?: string;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = getServerSupabase();
  const unresolvedOnly = searchParams.unresolved === '1';

  let query = supabase
    .from('notification_jobs')
    .select(
      'id, customer_id, channel, template_key, status, attempts, last_error, scheduled_at, created_at, updated_at, idempotency_key',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.channel) query = query.eq('channel', searchParams.channel);

  const { data: jobs } = await query;

  const customerIds = [...new Set((jobs ?? []).map((j) => j.customer_id))];
  const { data: customers } =
    customerIds.length > 0
      ? await supabase
          .from('customers')
          .select('id, name, email, line_user_id')
          .in('id', customerIds)
      : { data: [] as { id: string; name: string; email: string | null; line_user_id: string | null }[] };

  const customerMap = new Map(
    (customers ?? []).map((c) => [
      c.id,
      { name: c.name, email: c.email, line_user_id: c.line_user_id },
    ]),
  );

  // status=FAILED のみのときも、解消判定用に同顧客の SENT を取得
  let sentForResolution: JobResolutionInput[] = [];
  if (customerIds.length > 0) {
    const { data: sentRows } = await supabase
      .from('notification_jobs')
      .select('id, customer_id, channel, template_key, status, created_at')
      .eq('status', 'SENT')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .limit(500);
    sentForResolution = (sentRows ?? []) as JobResolutionInput[];
  }

  const resolutionJobs: JobResolutionInput[] = [
    ...((jobs ?? []) as JobResolutionInput[]),
    ...sentForResolution,
  ];
  const resolvedIds = resolvedFailureJobIds(resolutionJobs);
  const unresolvedFailedCount = countUnresolvedFailures(resolutionJobs);

  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: logs } = await supabase
    .from('notification_logs')
    .select('id, job_id, result, sent_at, provider_message_id, error_message')
    .in('job_id', jobIds)
    .order('sent_at', { ascending: false });
  const logsByJob = new Map<
    string,
    Pick<NotificationLogRow, 'id' | 'result' | 'sent_at' | 'provider_message_id' | 'error_message'>[]
  >();
  for (const l of logs ?? []) {
    const arr = logsByJob.get(l.job_id) ?? [];
    arr.push(l);
    logsByJob.set(l.job_id, arr);
  }

  let merged = (jobs ?? []).map((j) => ({
    ...(j as unknown as NotificationJobRow),
    customers:
      customerMap.get(j.customer_id) ?? {
        name: '(削除済み)',
        email: null,
        line_user_id: null,
      },
    logs: logsByJob.get(j.id) ?? [],
    failureResolved: resolvedIds.has(j.id),
  }));

  if (unresolvedOnly) {
    merged = merged.filter((row) => row.status === 'FAILED' && !row.failureResolved);
  }

  const failedCount = merged.filter((row) => row.status === 'FAILED').length;
  const managerContact = process.env.NEXT_PUBLIC_OPS_MANAGER_CONTACT ?? '管理者';

  return (
    <>
      <div className="desktop-only">
        <PageBack href="/" label="ホームへ戻る" />
      </div>
      <div className="page-header mobile-page-header-hide">
        <div>
          <h1 className="page-title">送付履歴</h1>
          <div className="page-sub">最新200件 / 失敗ジョブの再送が可能です</div>
          <div className="page-sub">
            要対応の失敗 {unresolvedFailedCount}件
            {failedCount > unresolvedFailedCount
              ? `（表示中の失敗 ${failedCount}件・再送済みは解消表示）`
              : null}
            。障害時連絡先: {managerContact}
          </div>
        </div>
      </div>
      <LogsTable
        rows={merged}
        initial={{
          status: searchParams.status,
          channel: searchParams.channel,
          q: searchParams.q,
          unresolved: unresolvedOnly ? '1' : undefined,
        }}
        basePath="/history"
        homeHref="/"
      />
      <div className="desktop-only">
        <NextActions
          items={[
            { href: '/', label: 'ホーム', primary: true },
            { href: '/templates', label: 'テンプレート' },
            { href: '/customers', label: '顧客一覧' },
          ]}
        />
      </div>
    </>
  );
}
