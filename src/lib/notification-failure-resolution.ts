/**
 * 失敗ジョブが「その後の成功で解消済み」かを判定する。
 * 履歴行（FAILED）は残すが、未解消だけを要対応として扱う。
 */

export type JobResolutionInput = {
  id: string;
  customer_id: string;
  channel: string;
  template_key: string;
  status: string;
  created_at: string;
};

function resolutionKey(job: Pick<JobResolutionInput, 'customer_id' | 'channel' | 'template_key'>) {
  return `${job.customer_id}|${job.channel}|${job.template_key}`;
}

/** 同一顧客・チャネル・テンプレの最新 SENT 時刻（ms） */
export function latestSentAtByKey(jobs: JobResolutionInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const job of jobs) {
    if (job.status !== 'SENT') continue;
    const key = resolutionKey(job);
    const t = Date.parse(job.created_at);
    if (Number.isNaN(t)) continue;
    const prev = map.get(key) ?? 0;
    if (t > prev) map.set(key, t);
  }
  return map;
}

/**
 * FAILED のうち、それ以降に同種の SENT があるジョブ ID。
 * （再送成功後も履歴の FAILED 行は残るが、要対応ではない）
 */
export function resolvedFailureJobIds(jobs: JobResolutionInput[]): Set<string> {
  const latestSent = latestSentAtByKey(jobs);
  const resolved = new Set<string>();
  for (const job of jobs) {
    if (job.status !== 'FAILED') continue;
    const failedAt = Date.parse(job.created_at);
    if (Number.isNaN(failedAt)) continue;
    const sentAt = latestSent.get(resolutionKey(job));
    if (sentAt != null && sentAt > failedAt) {
      resolved.add(job.id);
    }
  }
  return resolved;
}

/** 要対応の失敗件数（解消済みを除く） */
export function countUnresolvedFailures(jobs: JobResolutionInput[]): number {
  const resolved = resolvedFailureJobIds(jobs);
  return jobs.filter((j) => j.status === 'FAILED' && !resolved.has(j.id)).length;
}
