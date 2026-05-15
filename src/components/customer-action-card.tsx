'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getUrgencyLevel, type UrgencyLevel } from '@/lib/urgency';

export interface CustomerActionCardProps {
  customerId: string | null;
  customerName: string | null;
  phone: string | null;
  hasLine: boolean;
  vehicleLabel?: string | null;
  plate?: string | null;
  daysLeft: number | null;
  ruleLabel?: string | null;
  /** AUTO 通知の送信プレビュー対象か */
  ruleAvailable: boolean;
  /** 完了を記録できるか */
  showCompleteButton: boolean;
  /** 手動タスク（MANUAL）か */
  isManualTask: boolean;
  onOpenPreview: () => void;
  onComplete: () => void;
  completing?: boolean;
}

function daysLabel(days: number | null): string {
  if (days == null) return '-';
  if (days < 0) return `期限切れ (${Math.abs(days)}日経過)`;
  if (days === 0) return '本日が満了日';
  return `あと${days}日`;
}

export function CustomerActionCard(props: CustomerActionCardProps) {
  const urgency: UrgencyLevel = getUrgencyLevel(props.daysLeft);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocDown(e: MouseEvent) {
      const el = menuWrapRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  const previewDisabled =
    props.ruleAvailable && (!props.hasLine || !props.customerId);

  let primaryLabel = '見積を確認して送付 ▶';
  let primaryAction: (() => void) | undefined = props.onOpenPreview;
  let primaryDisabled = false;

  if (props.ruleAvailable) {
    primaryDisabled = previewDisabled;
    if (!props.hasLine) primaryLabel = 'LINE未連携';
  } else if (props.isManualTask && props.showCompleteButton) {
    primaryLabel = '対応を完了する';
    primaryAction = props.onComplete;
    primaryDisabled = props.completing ?? false;
  } else if (props.showCompleteButton) {
    primaryLabel = '完了にする';
    primaryAction = props.onComplete;
    primaryDisabled = props.completing ?? false;
  } else {
    primaryLabel = '送付対象外';
    primaryAction = undefined;
    primaryDisabled = true;
  }

  return (
    <li className={`action-card ${urgency}`}>
      <div className="action-card-header">
        <div className="action-card-header-main">
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
          {props.ruleLabel && <div className="action-card-meta">{props.ruleLabel}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div className="action-card-menu-wrap" ref={menuWrapRef}>
            <button
              type="button"
              className="action-card-menu-btn"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="その他の操作"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>
            {menuOpen ? (
              <ul className="action-card-menu-popover" role="menu">
                <li>
                  {props.phone ? (
                    <a href={`tel:${props.phone}`} role="menuitem" onClick={() => setMenuOpen(false)}>
                      電話する
                    </a>
                  ) : (
                    <button type="button" disabled>
                      電話（番号なし）
                    </button>
                  )}
                </li>
                {props.showCompleteButton ? (
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={props.completing}
                      onClick={() => {
                        setMenuOpen(false);
                        void props.onComplete();
                      }}
                    >
                      {props.completing ? '更新中…' : '完了にする'}
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
          <div>
            <div className="action-card-days-label">残日数</div>
            <div className={`action-card-days ${urgency}`}>{daysLabel(props.daysLeft)}</div>
          </div>
        </div>
      </div>

      <div className="action-card-actions action-card-actions-single">
        <button
          type="button"
          className="btn-action btn-action-primary-send"
          disabled={primaryDisabled || !primaryAction}
          onClick={() => primaryAction?.()}
        >
          {primaryLabel}
        </button>
      </div>
    </li>
  );
}
