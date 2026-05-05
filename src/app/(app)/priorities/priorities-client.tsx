'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/badge';
import type { PriorityQueueRow, TaskStatus, TaskType } from '@/lib/supabase/types';
import {
  type PriorityFilterMode,
  type PrioritySortMode,
  taskStatusLabel,
} from '@/lib/priorities';

const FILTERS: Array<{ id: PriorityFilterMode; label: string }> = [
  { id: 'weekly', label: '今週の送信候補' },
  { id: 'all', label: 'すべて' },
  { id: 'open', label: '未完了' },
  { id: 'manual', label: '手動タスク' },
  { id: 'auto', label: '自動候補' },
  { id: 'done', label: '完了' },
];

function statusVariant(status: TaskStatus): 'success' | 'warn' | 'danger' | 'info' {
  if (status === 'DONE') return 'success';
  if (status === 'IN_PROGRESS') return 'warn';
  if (status === 'CANCELLED') return 'danger';
  return 'info';
}

function priorityVariant(priority: number): 'danger' | 'warn' | 'success' {
  if (priority >= 5) return 'danger';
  if (priority >= 3) return 'warn';
  return 'success';
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PrioritiesClient() {
  const [items, setItems] = useState<PriorityQueueRow[]>([]);
  const [sort, setSort] = useState<PrioritySortMode>('priority');
  const [filter, setFilter] = useState<PriorityFilterMode>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    openCount: 0,
    weeklyAutoCount: 0,
    resolvedCustomerCount: 0,
    failedThisWeek: 0,
  });
  const [savingTask, setSavingTask] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    taskType: 'CALL' as TaskType,
    priority: 3,
    dueAt: '',
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ sort, filter });
    const res = await fetch(`/api/priorities?${query.toString()}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? '優先一覧の取得に失敗しました。');
      setLoading(false);
      return;
    }
    setItems((json.items ?? []) as PriorityQueueRow[]);
    setSummary({
      openCount: Number(json.summary?.openCount ?? 0),
      weeklyAutoCount: Number(json.summary?.weeklyAutoCount ?? 0),
      resolvedCustomerCount: Number(json.summary?.resolvedCustomerCount ?? 0),
      failedThisWeek: Number(json.summary?.failedThisWeek ?? 0),
    });
    setLoading(false);
  }, [sort, filter]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function createTask() {
    if (!newTask.title.trim()) return;
    setSavingTask(true);
    setError(null);
    const res = await fetch('/api/priorities/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        task_type: newTask.taskType,
        priority: newTask.priority,
        due_at: newTask.dueAt ? new Date(newTask.dueAt).toISOString() : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'タスクの作成に失敗しました。');
      setSavingTask(false);
      return;
    }
    setNewTask({ title: '', description: '', taskType: 'CALL', priority: 3, dueAt: '' });
    setSavingTask(false);
    await fetchItems();
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    setUpdatingIds((prev) => ({ ...prev, [taskId]: true }));
    const res = await fetch(`/api/priorities/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'タスク更新に失敗しました。');
      setUpdatingIds((prev) => ({ ...prev, [taskId]: false }));
      return;
    }
    setUpdatingIds((prev) => ({ ...prev, [taskId]: false }));
    await fetchItems();
  }

  const openCount = useMemo(
    () => items.filter((item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS').length,
    [items],
  );
  const opsManagerContact = process.env.NEXT_PUBLIC_OPS_MANAGER_CONTACT ?? '管理者';

  return (
    <>
      <div className="page-actions" style={{ marginBottom: 16 }}>
        <select
          className="input"
          style={{ width: 220 }}
          value={sort}
          onChange={(e) => setSort(e.target.value as PrioritySortMode)}
        >
          <option value="priority">並び順: 優先度</option>
          <option value="timeline">並び順: 時系列</option>
        </select>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`btn ${filter === f.id ? 'btn-primary' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi">
          <div className="kpi-label">今週送信候補</div>
          <div>
            <span className="kpi-value">{summary.weeklyAutoCount}</span>
            <span className="kpi-unit">件</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">未完了タスク</div>
          <div>
            <span className="kpi-value">{summary.openCount || openCount}</span>
            <span className="kpi-unit">件</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">今週失敗件数</div>
          <div>
            <span className="kpi-value">{summary.failedThisWeek}</span>
            <span className="kpi-unit">件</span>
          </div>
        </div>
      </div>

      <div className="badge badge-info" style={{ display: 'block', marginBottom: 16 }}>
        対応済み（今週完了）にした顧客の自動候補は一覧から除外されます。除外顧客数: {summary.resolvedCustomerCount}件。障害時の連絡先: {opsManagerContact}
      </div>

      <section className="panel" style={{ padding: 16, marginBottom: 20 }}>
        <div className="panel-header" style={{ marginBottom: 12 }}>
          <div className="panel-title">手動タスクを追加</div>
        </div>
        <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
          <input
            className="input"
            placeholder="例: 田中様へ車検見積の再連絡"
            value={newTask.title}
            onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
          />
          <select
            className="input"
            value={newTask.taskType}
            onChange={(e) => setNewTask((prev) => ({ ...prev, taskType: e.target.value as TaskType }))}
          >
            <option value="CALL">CALL</option>
            <option value="FOLLOWUP">FOLLOWUP</option>
            <option value="QUOTE">QUOTE</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input
            className="input"
            type="number"
            min={1}
            max={5}
            value={newTask.priority}
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, priority: Number(e.target.value || 3) }))
            }
          />
          <input
            className="input"
            type="datetime-local"
            value={newTask.dueAt}
            onChange={(e) => setNewTask((prev) => ({ ...prev, dueAt: e.target.value }))}
          />
        </div>
        <div className="form-field" style={{ marginTop: 8 }}>
          <textarea
            className="textarea"
            rows={2}
            placeholder="補足メモ（任意）"
            value={newTask.description}
            onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-primary" disabled={savingTask} onClick={createTask}>
            {savingTask ? '追加中...' : 'タスク追加'}
          </button>
        </div>
      </section>

      <section className="panel">
        <header className="panel-header">
          <div className="panel-title">優先ワークキュー</div>
        </header>
        {error && (
          <div className="badge badge-danger" style={{ margin: 12, display: 'block' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div className="empty" style={{ padding: 16 }}>読み込み中...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>種別</th>
                  <th>タイトル</th>
                  <th>顧客</th>
                  <th>期限/予定</th>
                  <th>優先</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">表示できるタスクがありません</div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.queue_id}>
                      <td>
                        <Badge variant={item.source_type === 'AUTO' ? 'info' : 'success'}>
                          {item.source_type}
                        </Badge>
                      </td>
                      <td>
                        <div className="cust-name">{item.title}</div>
                        {item.description && <div className="cust-meta">{item.description}</div>}
                      </td>
                      <td>
                        {item.customer_id ? (
                          <Link href={`/customers/${item.customer_id}`} className="panel-link">
                            {item.customer_name ?? '-'}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{formatDateTime(item.sort_due_at)}</td>
                      <td>
                        <Badge variant={priorityVariant(item.priority)}>
                          P{item.priority}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={statusVariant(item.status)}>
                          {taskStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {item.phone && (
                            <a className="btn btn-sm" href={`tel:${item.phone}`}>
                              電話
                            </a>
                          )}
                          {item.task_id && item.status !== 'DONE' && (
                            <button
                              className="btn btn-sm"
                              disabled={!!updatingIds[item.task_id]}
                              onClick={() => updateTaskStatus(item.task_id as string, 'DONE')}
                            >
                              完了
                            </button>
                          )}
                          {item.task_id && item.status === 'OPEN' && (
                            <button
                              className="btn btn-sm"
                              disabled={!!updatingIds[item.task_id]}
                              onClick={() => updateTaskStatus(item.task_id as string, 'IN_PROGRESS')}
                            >
                              着手
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
