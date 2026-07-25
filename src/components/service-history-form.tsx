'use client';

import { useMemo, useState } from 'react';
import { createServiceHistoryAction } from '@/app/(app)/customers/actions';
import type { VehicleRow } from '@/lib/supabase/types';

export const SERVICE_HISTORY_PRESETS = [
  { key: 'shaken', title: '車検' },
  { key: 'inspection_12', title: '12ヶ月点検' },
  { key: 'oil', title: 'オイル交換' },
  { key: 'tire', title: 'タイヤ交換' },
  { key: 'battery', title: 'バッテリー交換' },
  { key: 'repair', title: '修理' },
  { key: 'other', title: '' },
] as const;

export type ServiceHistoryPresetKey = (typeof SERVICE_HISTORY_PRESETS)[number]['key'];

export function ServiceHistoryForm({
  customerId,
  vehicles,
}: {
  customerId: string;
  vehicles: VehicleRow[];
}) {
  const action = createServiceHistoryAction.bind(null, customerId);
  const [kind, setKind] = useState<ServiceHistoryPresetKey>('oil');
  const [title, setTitle] = useState('オイル交換');
  const [titleTouched, setTitleTouched] = useState(false);

  const preset = useMemo(
    () => SERVICE_HISTORY_PRESETS.find((p) => p.key === kind) ?? SERVICE_HISTORY_PRESETS[0],
    [kind],
  );

  if (vehicles.length === 0) {
    return <p className="cust-meta accordion-form-padding">車両を登録してから履歴を追加できます。</p>;
  }

  return (
    <form action={action} className="form-grid accordion-form-padding service-history-form">
      <div className="form-row">
        <div className="form-field">
          <label className="form-label">車両</label>
          <select className="input select" name="vehicle_id" required defaultValue={vehicles[0].id}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.maker} {v.model} · {v.plate}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">種別</label>
          <select
            className="input select"
            name="kind"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as ServiceHistoryPresetKey;
              setKind(next);
              const p = SERVICE_HISTORY_PRESETS.find((x) => x.key === next);
              if (!titleTouched && p) {
                setTitle(p.title);
              }
            }}
          >
            {SERVICE_HISTORY_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key === 'other' ? 'その他（手入力）' : p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">タイトル</label>
          <input
            className="input"
            name="title"
            value={title}
            onChange={(e) => {
              setTitleTouched(true);
              setTitle(e.target.value);
            }}
            required={kind === 'other'}
            placeholder={kind === 'other' ? '例: ブレーキパッド交換' : preset.title}
          />
        </div>
        <div className="form-field">
          <label className="form-label">実施日</label>
          <input
            className="input"
            type="date"
            name="performed_at"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="form-field">
          <label className="form-label">走行距離 (km)</label>
          <input className="input" type="number" name="mileage" min={0} placeholder="任意" />
        </div>
        {kind === 'shaken' ? (
          <div className="form-field">
            <label className="form-label">次回車検満了日</label>
            <input className="input" type="date" name="inspection_expire_date" required />
            <div className="cust-meta customer-detail-hint-compact">車両の車検満了日も更新します</div>
          </div>
        ) : null}
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">メモ</label>
          <textarea className="textarea" name="notes" rows={3} placeholder="所見・交換部品など（任意）" />
        </div>
      </div>
      <button className="btn btn-primary" type="submit">
        履歴を登録
      </button>
    </form>
  );
}
