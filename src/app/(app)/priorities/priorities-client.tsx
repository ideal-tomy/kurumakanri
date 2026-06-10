'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustomerActionCard } from '@/components/customer-action-card';
import { PreviewBottomSheet } from '@/components/preview-bottom-sheet';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import type { PriorityQueueRow, TaskStatus, TaskType } from '@/lib/supabase/types';
import {
  type PriorityFilterMode,
  type PrioritySortMode,
} from '@/lib/priorities';
import {
  computeDaysFromSortDueAt,
  pickRuleKeyFromQueueId,
  type AutoRuleKey,
} from '@/lib/urgency';

const FILTERS: Array<{ id: PriorityFilterMode; label: string }> = [
  { id: 'weekly', label: '今週やること' },
  { id: 'all', label: 'すべて' },
  { id: 'done', label: '完了' },
];

function ruleLabelFromQueueId(queueId: string): string | null {
  if (queueId.startsWith('AUTO:SHAKEN90:')) return '車検 90日前';
  if (queueId.startsWith('AUTO:SHAKEN180:')) return '車検 180日前';
  if (queueId.startsWith('AUTO:SHAKEN30:')) return '車検 30日前';
  if (queueId.startsWith('AUTO:OVERDUE:')) return '車検満了後フォロー';
  if (queueId.startsWith('AUTO:OIL:')) return 'オイル交換目安';
  if (queueId.startsWith('MANUAL:')) return '手動タスク';
  return null;
}

export function PrioritiesClient() {
  const [items, setItems] = useState<PriorityQueueRow[]>([]);
  const [sort, setSort] = useState<PrioritySortMode>('priority');
  const [filter, setFilter] = useState<PriorityFilterMode>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  const [preview, setPreview] = useState<{
    customerId: string;
    rule: AutoRuleKey;
    customerName: string | null;
    vehicleLabel: string | null;
    plate: string | null;
    ruleLabel: string | null;
    contextLine: string | null;
  } | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const filterDlgRef = useRef<HTMLDialogElement>(null);
  const manualDlgRef = useRef<HTMLDialogElement>(null);

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

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  useModalDialog(filterDlgRef, filterOpen, () => setFilterOpen(false));
  useModalDialog(manualDlgRef, manualOpen, () => setManualOpen(false));

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
    setManualOpen(false);
    await fetchItems();
  }

  async function completeItem(item: PriorityQueueRow) {
    setError(null);
    if (item.task_id) {
      setUpdatingIds((prev) => ({ ...prev, [item.queue_id]: true }));
      const res = await fetch(`/api/priorities/tasks/${item.task_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' as TaskStatus }),
      });
      const json = await res.json();
      setUpdatingIds((prev) => ({ ...prev, [item.queue_id]: false }));
      if (!res.ok) {
        setError(json.error ?? 'タスク更新に失敗しました。');
        return;
      }
      setMessage('対応済みにしました');
      await fetchItems();
      return;
    }

    if (!item.customer_id) {
      setError('完了登録に必要な顧客IDが不足しています。');
      return;
    }
    setUpdatingIds((prev) => ({ ...prev, [item.queue_id]: true }));
    const res = await fetch('/api/priorities/resolved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: item.customer_id,
        source_label: ruleLabelFromQueueId(item.queue_id) ?? '今週の連絡',
      }),
    });
    const json = await res.json();
    setUpdatingIds((prev) => ({ ...prev, [item.queue_id]: false }));
    if (!res.ok) {
      setError(json.error ?? '完了登録に失敗しました。');
      return;
    }
    setMessage('対応済みにしました');
    await fetchItems();
  }

  function openPreviewForItem(item: PriorityQueueRow) {
    const rk = pickRuleKeyFromQueueId(item.queue_id);
    if (!item.customer_id || !rk) {
      setError('このタスクはプレビューできません。');
      return;
    }
    setPreview({
      customerId: item.customer_id,
      rule: rk,
      customerName: item.customer_name,
      vehicleLabel: item.vehicle_label ?? null,
      plate: item.plate,
      ruleLabel: ruleLabelFromQueueId(item.queue_id),
      contextLine: ruleLabelFromQueueId(item.queue_id),
    });
  }

  const openItems = useMemo(
    () => items.filter((item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS'),
    [items],
  );
  const urgencyBannerCount = openItems.length;
  const opsManagerContact = process.env.NEXT_PUBLIC_OPS_MANAGER_CONTACT ?? '管理者';

  const filterLabel = FILTERS.find((f) => f.id === filter)?.label ?? '';
  const sortLabel = sort === 'priority' ? '優先度順' : '時系列';

  return (
    <>
      <div
        className={`urgency-banner urgency-banner--compact mobile-only ${
          urgencyBannerCount === 0 ? 'calm' : urgencyBannerCount > 5 ? '' : 'warn'
        }`}
      >
        <span>
          <span className="urgency-banner-label">今週</span>{' '}
          <span className="urgency-banner-value">{urgencyBannerCount}</span> 件
          {summary.failedThisWeek > 0 && (
            <>
              {' '}
              · 送信失敗 {summary.failedThisWeek} 件
            </>
          )}
          {' '}
          · 障害時: {opsManagerContact}
        </span>
      </div>

      <div className={`urgency-banner ${urgencyBannerCount === 0 ? 'calm' : urgencyBannerCount > 5 ? '' : 'warn'} desktop-only`}>
        <div>
          <div className="urgency-banner-label">今週連絡が必要</div>
          <div>
            <span className="urgency-banner-value">{urgencyBannerCount}</span>
            <span style={{ marginLeft: 4, fontSize: 14 }}>件</span>
          </div>
          {urgencyBannerCount === 0 && <div className="urgency-banner-sub">今週の連絡対象はありません</div>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          {summary.failedThisWeek > 0 && <div>今週の送信失敗: {summary.failedThisWeek}件</div>}
          <div>障害時連絡先: {opsManagerContact}</div>
        </div>
      </div>

      {message && (
        <div className="badge badge-success" style={{ display: 'block', padding: 10, marginBottom: 12 }}>
          {message}
        </div>
      )}
      {error && (
        <div
          className="badge badge-danger"
          style={{ display: 'block', padding: 10, marginBottom: 12, whiteSpace: 'pre-line' }}
        >
          {error}
        </div>
      )}

      <div className="priorities-toolbar mobile-only">
        <button type="button" className="priorities-toolbar-btn" onClick={() => setFilterOpen(true)}>
          絞り込み ▾ <span style={{ opacity: 0.75, fontWeight: 400 }}>{filterLabel} / {sortLabel}</span>
        </button>
      </div>

      <div className="page-actions desktop-only" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`btn ${filter === f.id ? 'btn-primary' : ''}`}
            onClick={() => setFilter(f.id)}
            type="button"
          >
            {f.label}
          </button>
        ))}
        <select
          className="select"
          style={{ width: 180 }}
          value={sort}
          onChange={(e) => setSort(e.target.value as PrioritySortMode)}
        >
          <option value="priority">並び順: 優先度</option>
          <option value="timeline">並び順: 時系列</option>
        </select>
      </div>

      <section className="panel priorities-panel-mobile priorities-list-section">
        {loading ? (
          <div className="empty">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="empty">表示できるタスクがありません</div>
        ) : (
          <ul className="action-card-list">
            {items.map((item) => {
              const daysLeft = computeDaysFromSortDueAt(item.sort_due_at);
              const ruleAvailable = pickRuleKeyFromQueueId(item.queue_id) !== null;
              const showCompleteButton =
                (item.task_id != null && item.status !== 'DONE') ||
                (item.source_type === 'AUTO' && item.customer_id != null && item.status !== 'DONE');
              const isManualTask = item.task_id != null;
              return (
                <CustomerActionCard
                  key={item.queue_id}
                  customerId={item.customer_id}
                  customerName={item.customer_name}
                  phone={item.phone}
                  hasLine={Boolean(item.line_user_id)}
                  vehicleLabel={item.vehicle_label ?? null}
                  plate={item.plate}
                  daysLeft={daysLeft}
                  ruleLabel={ruleLabelFromQueueId(item.queue_id)}
                  ruleAvailable={ruleAvailable}
                  showCompleteButton={showCompleteButton}
                  isManualTask={isManualTask}
                  onOpenPreview={() => openPreviewForItem(item)}
                  onComplete={() => void completeItem(item)}
                  completing={Boolean(updatingIds[item.queue_id])}
                />
              );
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="fab-manual-task mobile-only"
        aria-label="手動タスクを追加"
        onClick={() => setManualOpen(true)}
      >
        +
      </button>

      <details className="panel desktop-only" style={{ marginTop: 20, padding: 16 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>+ 手動タスクを追加（電話・見積など）</summary>
        <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <input
            className="input"
            placeholder="例: 田中様へ車検見積の再連絡"
            value={newTask.title}
            onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
          />
          <select
            className="select"
            value={newTask.taskType}
            onChange={(e) => setNewTask((prev) => ({ ...prev, taskType: e.target.value as TaskType }))}
          >
            <option value="CALL">電話</option>
            <option value="FOLLOWUP">フォロー</option>
            <option value="QUOTE">見積</option>
            <option value="OTHER">その他</option>
          </select>
          <input
            className="input"
            type="number"
            min={1}
            max={5}
            value={newTask.priority}
            onChange={(e) => setNewTask((prev) => ({ ...prev, priority: Number(e.target.value || 3) }))}
            aria-label="優先度（1〜5）"
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
          <button className="btn btn-primary" disabled={savingTask} onClick={() => void createTask()} type="button">
            {savingTask ? '追加中...' : 'タスク追加'}
          </button>
        </div>
      </details>

      <dialog
        ref={filterDlgRef}
        className="preview-sheet-root"
        onClick={(e) => {
          if (e.target === filterDlgRef.current) filterDlgRef.current?.close();
        }}
      >
        <div className="preview-sheet-panel filter-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <div className="preview-sheet-handle" aria-hidden />
          <div style={{ fontWeight: 700, marginBottom: 12 }}>絞り込み</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>表示</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FILTERS.map((f) => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="pf"
                  checked={filter === f.id}
                  onChange={() => setFilter(f.id)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', margin: '16px 0 8px' }}>並び順</div>
          <select
            className="select"
            style={{ width: '100%' }}
            value={sort}
            onChange={(e) => setSort(e.target.value as PrioritySortMode)}
          >
            <option value="priority">優先度（残日数）</option>
            <option value="timeline">時系列</option>
          </select>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 20, minHeight: 48 }}
            onClick={() => filterDlgRef.current?.close()}
          >
            閉じる
          </button>
        </div>
      </dialog>

      <dialog
        ref={manualDlgRef}
        className="preview-sheet-root"
        onClick={(e) => {
          if (e.target === manualDlgRef.current) manualDlgRef.current?.close();
        }}
      >
        <div className="preview-sheet-panel filter-sheet-panel" onClick={(e) => e.stopPropagation()}>
          <div className="preview-sheet-handle" aria-hidden />
          <div style={{ fontWeight: 700, marginBottom: 12 }}>手動タスクを追加</div>
          <input
            className="input"
            style={{ width: '100%', marginBottom: 8 }}
            placeholder="例: 田中様へ車検見積の再連絡"
            value={newTask.title}
            onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
          />
          <select
            className="select"
            style={{ width: '100%', marginBottom: 8 }}
            value={newTask.taskType}
            onChange={(e) => setNewTask((prev) => ({ ...prev, taskType: e.target.value as TaskType }))}
          >
            <option value="CALL">電話</option>
            <option value="FOLLOWUP">フォロー</option>
            <option value="QUOTE">見積</option>
            <option value="OTHER">その他</option>
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              value={newTask.priority}
              onChange={(e) => setNewTask((prev) => ({ ...prev, priority: Number(e.target.value || 3) }))}
              aria-label="優先度（1〜5）"
            />
            <input
              className="input"
              type="datetime-local"
              value={newTask.dueAt}
              onChange={(e) => setNewTask((prev) => ({ ...prev, dueAt: e.target.value }))}
            />
          </div>
          <textarea
            className="textarea"
            style={{ width: '100%', marginBottom: 12 }}
            rows={2}
            placeholder="補足メモ（任意）"
            value={newTask.description}
            onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', minHeight: 48 }}
            disabled={savingTask}
            onClick={() => void createTask()}
          >
            {savingTask ? '追加中...' : 'タスク追加'}
          </button>
          <button type="button" className="preview-sheet-cancel" onClick={() => manualDlgRef.current?.close()}>
            キャンセル
          </button>
        </div>
      </dialog>

      {preview && (
        <PreviewBottomSheet
          open
          onClose={() => setPreview(null)}
          customerId={preview.customerId}
          rule={preview.rule}
          customerName={preview.customerName}
          vehicleLabel={preview.vehicleLabel}
          plate={preview.plate}
          contextLine={preview.contextLine}
          onSent={() => {
            setPreview(null);
            setMessage('LINEを送信しました');
            void fetchItems();
          }}
        />
      )}
    </>
  );
}
