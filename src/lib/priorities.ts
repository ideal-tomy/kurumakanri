import type { PriorityQueueRow, TaskStatus } from './supabase/types';

export type PrioritySortMode = 'priority' | 'timeline';
export type PriorityFilterMode = 'all' | 'auto' | 'manual' | 'open' | 'done' | 'weekly';

function timestamp(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

export function sortPriorityQueue(
  rows: PriorityQueueRow[],
  mode: PrioritySortMode,
): PriorityQueueRow[] {
  const copied = [...rows];
  copied.sort((a, b) => {
    if (mode === 'timeline') {
      const dueDiff = timestamp(a.sort_due_at) - timestamp(b.sort_due_at);
      if (dueDiff !== 0) return dueDiff;
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return timestamp(a.created_at) - timestamp(b.created_at);
    }

    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    const dueDiff = timestamp(a.sort_due_at) - timestamp(b.sort_due_at);
    if (dueDiff !== 0) return dueDiff;
    return timestamp(a.created_at) - timestamp(b.created_at);
  });
  return copied;
}

function isOpenStatus(status: TaskStatus): boolean {
  return status === 'OPEN' || status === 'IN_PROGRESS';
}

export function filterPriorityQueue(
  rows: PriorityQueueRow[],
  filter: PriorityFilterMode,
): PriorityQueueRow[] {
  switch (filter) {
    case 'auto':
      return rows.filter((row) => row.source_type === 'AUTO');
    case 'manual':
      return rows.filter((row) => row.source_type === 'MANUAL');
    case 'open':
      return rows.filter((row) => isOpenStatus(row.status));
    case 'done':
      return rows.filter((row) => row.status === 'DONE');
    case 'weekly':
      return rows.filter((row) => row.source_type === 'AUTO' && isOpenStatus(row.status));
    default:
      return rows;
  }
}

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'OPEN':
      return '未着手';
    case 'IN_PROGRESS':
      return '対応中';
    case 'DONE':
      return '完了';
    case 'CANCELLED':
      return '中止';
    default:
      return status;
  }
}
