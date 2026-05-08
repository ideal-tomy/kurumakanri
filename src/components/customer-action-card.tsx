'use client';

import Link from 'next/link';
import { getUrgencyLevel, type UrgencyLevel } from '@/lib/urgency';

export interface CustomerActionCardProps {
  customerId: string | null;
  customerName: string | null;
  phone: string | null;
  hasLine: boolean; // line_user_id が登録されているか
  vehicleLabel?: string | null; // 例: "トヨタ プリウス"
  plate?: string | null;
  daysLeft: number | null;
  ruleLabel?: string | null; // 例: "車検 90日前", "オイル交換目安"
  taskId: string | null;
  showCompleteButton: boolean;
  ruleAvailable: boolean; // pickRuleKey で送信先テンプレが決まるか
  onLineSend: () => void;
  onComplete: () => void;
  lineSending: boolean;
  completing: boolean;
}

function daysLabel(days: number | null): string {
  if (days == null) return '-';
  if (days < 0) return `期限切れ (${Math.abs(days)}日経過)`;
  if (days === 0) return '本日が満了日';
  return `あと${days}日`;
}

export function CustomerActionCard(props: CustomerActionCardProps) {
  const urgency: UrgencyLevel = getUrgencyLevel(props.daysLeft);
  const lineDisabled = !props.hasLine || !props.ruleAvailable || props.lineSending;
  const phoneDisabled = !props.phone;
  const completeDisabled = !props.showCompleteButton || props.completing;

  const lineHint = !props.hasLine
    ? 'LINE未連携'
    : !props.ruleAvailable
      ? '通知タイミング外'
      : '';

  return (
    <li className={`action-card ${urgency}`}>
      <div className="action-card-header">
        <div>
          {props.customerId ? (
            <Link href={`/customers/${props.customerId}`} className="action-card-title">
              {props.customerName ?? '名前未設定'} 様
            </Link>
          ) : (
            <div className="action-card-title">{props.customerName ?? '名前未設定'} 様</div>
          )}
          {(props.vehicleLabel || props.plate) && (
            <div className="action-card-meta action-card-vehicle">
              {props.vehicleLabel && <span>{props.vehicleLabel}</span>}
              {props.plate && <span className="plate">{props.plate}</span>}
            </div>
          )}
          {props.ruleLabel && (
            <div className="action-card-meta">{props.ruleLabel}</div>
          )}
        </div>
        <div>
          <div className="action-card-days-label">残日数</div>
          <div className={`action-card-days ${urgency}`}>{daysLabel(props.daysLeft)}</div>
        </div>
      </div>

      <div className="action-card-actions">
        <button
          type="button"
          className="btn-action btn-line"
          onClick={props.onLineSend}
          disabled={lineDisabled}
          aria-label={lineHint || 'LINE通知を送信'}
          title={lineHint || 'LINE通知を送信'}
        >
          {props.lineSending ? '送信中…' : lineHint ? lineHint : 'LINE'}
        </button>
        {props.phone ? (
          <a
            className="btn-action btn-phone"
            href={`tel:${props.phone}`}
            aria-label={`${props.customerName ?? ''}に電話する`}
          >
            電話
          </a>
        ) : (
          <button type="button" className="btn-action btn-phone" disabled aria-label="電話番号未登録">
            電話
          </button>
        )}
        <button
          type="button"
          className="btn-action btn-done"
          onClick={props.onComplete}
          disabled={completeDisabled}
          aria-label="このタスクを完了にする"
        >
          {props.completing ? '更新中…' : '完了'}
        </button>
      </div>
    </li>
  );
}
