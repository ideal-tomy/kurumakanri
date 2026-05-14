export type UrgencyLevel = 'critical' | 'warning' | 'normal';

/**
 * 残日数から緊急度ラベルを返す。
 * - 30日以下: critical
 * - 90日以下: warning
 * - それ以上 / null: normal
 */
export function getUrgencyLevel(daysRemaining: number | null): UrgencyLevel {
  if (daysRemaining == null) return 'normal';
  if (daysRemaining <= 30) return 'critical';
  if (daysRemaining <= 90) return 'warning';
  return 'normal';
}

export function urgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case 'critical':
      return '緊急';
    case 'warning':
      return '近接';
    default:
      return '通常';
  }
}

/**
 * v_priority_queue.sort_due_at から「現在から満了日までの残日数」を算出。
 * sort_due_at は `current_date + days_until_inspection` で構築されているため、
 * これを逆算することで残日数を取得できる。
 */
export function computeDaysFromSortDueAt(sortDueAt: string | null): number | null {
  if (!sortDueAt) return null;
  const due = new Date(sortDueAt);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type AutoRuleKey =
  | 'shaken_90days'
  | 'shaken_180days'
  | 'shaken_30days'
  | 'shaken_overdue'
  | 'oil_4000km';

/**
 * v_priority_queue.queue_id のプレフィックスから自動通知ルールを判定。
 * queue_id 例:
 *   AUTO:SHAKEN90:<customer_id>:<vehicle_id>
 *   AUTO:SHAKEN180:<customer_id>:<vehicle_id>
 *   AUTO:SHAKEN30:<customer_id>:<vehicle_id>
 *   AUTO:OVERDUE:<customer_id>:<vehicle_id>
 *   AUTO:OIL:<customer_id>:<vehicle_id>
 *   MANUAL:<task_id>
 */
export function pickRuleKeyFromQueueId(queueId: string | null): AutoRuleKey | null {
  if (!queueId) return null;
  // 長いプレフィックスを先に判定（SHAKEN180 が SHAKEN90 の前方一致にならないよう順序に注意）
  if (queueId.startsWith('AUTO:SHAKEN180:')) return 'shaken_180days';
  if (queueId.startsWith('AUTO:SHAKEN90:')) return 'shaken_90days';
  if (queueId.startsWith('AUTO:SHAKEN30:')) return 'shaken_30days';
  if (queueId.startsWith('AUTO:OVERDUE:')) return 'shaken_overdue';
  if (queueId.startsWith('AUTO:OIL:')) return 'oil_4000km';
  return null;
}
