import { describe, expect, it } from 'vitest';
import {
  filterPriorityQueue,
  sortPriorityQueue,
  type PriorityFilterMode,
  type PrioritySortMode,
} from './priorities';
import type { PriorityQueueRow } from './supabase/types';

function row(partial: Partial<PriorityQueueRow>): PriorityQueueRow {
  return {
    queue_id: partial.queue_id ?? crypto.randomUUID(),
    source_type: partial.source_type ?? 'AUTO',
    task_id: partial.task_id ?? null,
    task_type: partial.task_type ?? 'CALL',
    status: partial.status ?? 'OPEN',
    priority: partial.priority ?? 3,
    sort_due_at: partial.sort_due_at ?? null,
    completed_at: partial.completed_at ?? null,
    created_at: partial.created_at ?? '2026-01-01T00:00:00.000Z',
    title: partial.title ?? 't',
    description: partial.description ?? '',
    customer_id: partial.customer_id ?? null,
    vehicle_id: partial.vehicle_id ?? null,
    customer_name: partial.customer_name ?? null,
    phone: partial.phone ?? null,
    plate: partial.plate ?? null,
  };
}

describe('sortPriorityQueue', () => {
  it('priorityモードは優先度降順で並ぶ', () => {
    const rows = [
      row({ queue_id: 'a', priority: 2, sort_due_at: '2026-01-03T00:00:00.000Z' }),
      row({ queue_id: 'b', priority: 5, sort_due_at: '2026-01-05T00:00:00.000Z' }),
      row({ queue_id: 'c', priority: 4, sort_due_at: '2026-01-01T00:00:00.000Z' }),
    ];
    const sorted = sortPriorityQueue(rows, 'priority' as PrioritySortMode);
    expect(sorted.map((r) => r.queue_id)).toEqual(['b', 'c', 'a']);
  });

  it('timelineモードは期限昇順で並ぶ', () => {
    const rows = [
      row({ queue_id: 'a', priority: 2, sort_due_at: '2026-01-03T00:00:00.000Z' }),
      row({ queue_id: 'b', priority: 5, sort_due_at: '2026-01-05T00:00:00.000Z' }),
      row({ queue_id: 'c', priority: 4, sort_due_at: '2026-01-01T00:00:00.000Z' }),
    ];
    const sorted = sortPriorityQueue(rows, 'timeline' as PrioritySortMode);
    expect(sorted.map((r) => r.queue_id)).toEqual(['c', 'a', 'b']);
  });
});

describe('filterPriorityQueue', () => {
  const rows = [
    row({ queue_id: 'a', source_type: 'AUTO', status: 'OPEN' }),
    row({ queue_id: 'b', source_type: 'MANUAL', status: 'IN_PROGRESS' }),
    row({ queue_id: 'c', source_type: 'MANUAL', status: 'DONE' }),
  ];

  it('manualフィルタは手動のみ残す', () => {
    const filtered = filterPriorityQueue(rows, 'manual' as PriorityFilterMode);
    expect(filtered.map((r) => r.queue_id)).toEqual(['b', 'c']);
  });

  it('openフィルタは未完了のみ残す', () => {
    const filtered = filterPriorityQueue(rows, 'open' as PriorityFilterMode);
    expect(filtered.map((r) => r.queue_id)).toEqual(['a', 'b']);
  });

  it('weeklyフィルタは自動かつ未完了のみ残す', () => {
    const filtered = filterPriorityQueue(rows, 'weekly' as PriorityFilterMode);
    expect(filtered.map((r) => r.queue_id)).toEqual(['a']);
  });
});
