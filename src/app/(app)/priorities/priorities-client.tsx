'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerActionCard } from '@/components/customer-action-card';
import type { PriorityQueueRow, TaskStatus, TaskType } from '@/lib/supabase/types';
import {
  type PriorityFilterMode,
  type PrioritySortMode,
} from '@/lib/priorities';
import {
  computeDaysFromSortDueAt,
  pickRuleKeyFromQueueId,
} from '@/lib/urgency';
import { buildNotificationsReviewHref } from '@/lib/notifications/send-review-session';

const FILTERS: Array<{ id: PriorityFilterMode; label: string }> = [
  { id: 'weekly', label: '今週やること' },
  { id: 'all', label: 'すべて' },
  { id: 'done', label: '完了' },
];

function ruleLabelFromQueueId(queueId: string): string | null {
  if (queueId.startsWith('AUTO:SHAKEN90:')) return '車検 90日前';
  if (queueId.startsWith('AUTO:SHAKEN180:')) return '車検 180日前';
  if (queueId.startsWith('AUTO:OIL:')) return 'オイル交換目安';
  if (queueId.startsWith('MANUAL:')) return '手動タスク';
  return null;
}

export function PrioritiesClient() {
  const router = useRouter();
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
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
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

  // 一定時間で message を消す
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

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

  async function completeItem(item: PriorityQueueRow) {
    setError(null);
    if (item.task_id) {
      // MANUAL タスク：staff_tasks の status を DONE に
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

    // AUTO 候補：customer_id を resolved 扱いにする
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

  function goToReviewFromQueue(item: PriorityQueueRow) {
    const rk = pickRuleKeyFromQueueId(item.queue_id);
    if (!item.customer_id || !rk) {
      setError('このタスクはレビューのルールを判定できません。');
      return;
    }
    router.push(
      buildNotificationsReviewHref({
        customerIds: [item.customer_id],
        rule: rk,
        channel: 'LINE',
      }),
    );
  }

  async function sendLine(item: PriorityQueueRow) {
    setError(null);
    if (!item.customer_id) {
      setError('LINE送信先の顧客IDが不足しています。');
      return;
    }
    const ruleKey = pickRuleKeyFromQueueId(item.queue_id);
    if (!ruleKey) {
      setError('このタスクは LINE 送信対象ではありません（手動タスクや該当通知タイミング外）。');
      return;
    }
    if (!item.line_user_id) {
      setError('LINE未連携の顧客です。先に LINE userId を結びつけてください。');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(`${item.customer_name ?? ''}様にLINEで通知しますか？`)) {
      return;
    }
    setSendingIds((prev) => ({ ...prev, [item.queue_id]: true }));
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rule: ruleKey,
        channel: 'LINE',
        customer_ids: [item.customer_id],
      }),
    });
    const json = await res.json();
    setSendingIds((prev) => ({ ...prev, [item.queue_id]: false }));
    if (!res.ok) {
      setError(json.error ?? 'LINE送信に失敗しました。');
      return;
    }
    if ((json.failed ?? 0) > 0) {
      const codes = json.failedByCode ? Object.keys(json.failedByCode).join(', ') : '';
      setError(`LINE送信が一部失敗しました${codes ? `（${codes}）` : ''}。`);
    } else {
      setMessage('LINEを送信しました');
    }
    await fetchItems();
  }

  const openItems = useMemo(
    () => items.filter((item) => item.status === 'OPEN' || item.status === 'IN_PROGRESS'),
    [items],
  );
  const urgencyBannerCount = openItems.length;
  const opsManagerContact = process.env.NEXT_PUBLIC_OPS_MANAGER_CONTACT ?? '管理者';

  return (
    <>
      {/* 緊急度サマリーバナー */}
      <div className={`urgency-banner ${urgencyBannerCount === 0 ? 'calm' : urgencyBannerCount > 5 ? '' : 'warn'}`}>
        <div>
          <div className="urgency-banner-label">今週連絡が必要</div>
          <div>
            <span className="urgency-banner-value">{urgencyBannerCount}</span>
            <span style={{ marginLeft: 4, fontSize: 14 }}>件</span>
          </div>
          {urgencyBannerCount === 0 && (
            <div className="urgency-banner-sub">今週の連絡対象はありません</div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          {summary.failedThisWeek > 0 && (
            <div>今週の送信失敗: {summary.failedThisWeek}件</div>
          )}
          <div>障害時連絡先: {opsManagerContact}</div>
        </div>
      </div>

      {/* メッセージ・エラー表示 */}
      {message && (
        <div className="badge badge-success" style={{ display: 'block', padding: 10, marginBottom: 12 }}>
          {message}
        </div>
      )}
      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: 10, marginBottom: 12, whiteSpace: 'pre-line' }}>
          {error}
        </div>
      )}

      {/* フィルタ・並び替え */}
      <div className="page-actions" style={{ marginBottom: 16 }}>
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

      {/* カードリスト */}
      <section className="panel" style={{ padding: 16 }}>
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
                  taskId={item.task_id}
                  showCompleteButton={showCompleteButton}
                  ruleAvailable={ruleAvailable}
                  onLineSend={() => void sendLine(item)}
                  onLineReview={
                    ruleAvailable && item.customer_id
                      ? () => goToReviewFromQueue(item)
                      : undefined
                  }
                  onComplete={() => void completeItem(item)}
                  lineSending={Boolean(sendingIds[item.queue_id])}
                  completing={Boolean(updatingIds[item.queue_id])}
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* 手動タスク追加（折りたたみ） */}
      <details className="panel" style={{ marginTop: 20, padding: 16 }}>
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
            onChange={(e) =>
              setNewTask((prev) => ({ ...prev, priority: Number(e.target.value || 3) }))
            }
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
          <button
            className="btn btn-primary"
            disabled={savingTask}
            onClick={createTask}
            type="button"
          >
            {savingTask ? '追加中...' : 'タスク追加'}
          </button>
        </div>
      </details>
    </>
  );
}
