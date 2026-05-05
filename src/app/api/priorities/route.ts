import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  filterPriorityQueue,
  sortPriorityQueue,
  type PriorityFilterMode,
  type PrioritySortMode,
} from '@/lib/priorities';
import type { PriorityQueueRow } from '@/lib/supabase/types';

const Query = z.object({
  sort: z.enum(['priority', 'timeline']).optional(),
  filter: z.enum(['all', 'auto', 'manual', 'open', 'done', 'weekly']).optional(),
});

export async function GET(req: Request) {
  await requireStaff();
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    sort: url.searchParams.get('sort') ?? undefined,
    filter: url.searchParams.get('filter') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sort = (parsed.data.sort ?? 'priority') as PrioritySortMode;
  const filter = (parsed.data.filter ?? 'weekly') as PriorityFilterMode;
  const supabase = getServerSupabase();
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);

  const [{ data, error }, { data: resolvedRows }, { count: failedThisWeek }] = await Promise.all([
    supabase.from('v_priority_queue').select('*'),
    supabase
      .from('staff_tasks')
      .select('customer_id')
      .eq('status', 'DONE')
      .gte('completed_at', weekStart.toISOString())
      .not('customer_id', 'is', null),
    supabase
      .from('notification_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'FAILED')
      .gte('created_at', weekStart.toISOString()),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resolvedCustomerIds = new Set(
    (resolvedRows ?? [])
      .map((row) => row.customer_id)
      .filter((id): id is string => typeof id === 'string'),
  );

  const rows: PriorityQueueRow[] = ((data ?? []) as PriorityQueueRow[])
    .map((row) => ({
    ...row,
      source_type: (row.source_type === 'MANUAL' ? 'MANUAL' : 'AUTO') as 'MANUAL' | 'AUTO',
    }))
    .filter(
      (row) =>
        !(
          row.source_type === 'AUTO' &&
          row.customer_id &&
          resolvedCustomerIds.has(row.customer_id)
        ),
    );

  const filtered = filterPriorityQueue(rows, filter);
  const sorted = sortPriorityQueue(filtered, sort);
  const openItems = rows.filter((row) => row.status === 'OPEN' || row.status === 'IN_PROGRESS');
  const weeklyAuto = rows.filter(
    (row) =>
      row.source_type === 'AUTO' && (row.status === 'OPEN' || row.status === 'IN_PROGRESS'),
  );

  return NextResponse.json({
    items: sorted,
    total: sorted.length,
    sort,
    filter,
    summary: {
      openCount: openItems.length,
      weeklyAutoCount: weeklyAuto.length,
      resolvedCustomerCount: resolvedCustomerIds.size,
      failedThisWeek: failedThisWeek ?? 0,
    },
  });
}
