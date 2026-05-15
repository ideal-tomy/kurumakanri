import Link from 'next/link';
import { Badge, priorityVariant } from '@/components/badge';
import { upsertVehicleAction } from '@/app/(app)/customers/actions';
import { formatDate, formatKm, formatYen, priorityLabel } from '@/lib/format';
import { computeEstimatedMileage, daysUntil } from '@/lib/mileage';
import type {
  ConsentRow,
  CustomerRow,
  QuoteRow,
  ServiceHistoryRow,
  VehicleRow,
} from '@/lib/supabase/types';

export function CustomerSummaryStrip({
  customer,
  primaryVehicle,
}: {
  customer: CustomerRow;
  primaryVehicle: VehicleRow | undefined;
}) {
  const daysLeft = primaryVehicle ? daysUntil(primaryVehicle.inspection_expire_date) : null;
  const estimated = primaryVehicle
    ? computeEstimatedMileage(
        primaryVehicle.initial_mileage,
        primaryVehicle.initial_mileage_recorded_at,
        primaryVehicle.monthly_avg_km,
      )
    : null;

  const vehicleLine = primaryVehicle
    ? `${primaryVehicle.maker ?? ''} ${primaryVehicle.model ?? ''} · ${primaryVehicle.plate ?? ''}`.trim()
    : '車両未登録';

  return (
    <section className="panel customer-summary-strip">
      <div className="customer-summary-strip-inner">
        <div className="customer-summary-strip-row">
          <span className="customer-summary-strip-label">電話</span>
          {customer.phone ? (
            <a href={`tel:${customer.phone.replace(/\s/g, '')}`} className="customer-summary-strip-value">
              {customer.phone}
            </a>
          ) : (
            <span className="customer-summary-strip-value">—</span>
          )}
        </div>
        {customer.email ? (
          <div className="customer-summary-strip-row">
            <span className="customer-summary-strip-label">メール</span>
            <span className="customer-summary-strip-value customer-summary-strip-ellipsis">{customer.email}</span>
          </div>
        ) : null}
        <div className="customer-summary-strip-row">
          <span className="customer-summary-strip-label">車両</span>
          <span className="customer-summary-strip-value customer-summary-strip-ellipsis">{vehicleLine}</span>
        </div>
        {primaryVehicle ? (
          <div className="customer-summary-strip-meta">
            <span>推定走行 {formatKm(estimated)}</span>
            <span>·</span>
            <span>車検まで {priorityLabel(daysLeft)}</span>
            <Badge variant={priorityVariant(daysLeft)}>{priorityVariant(daysLeft)}</Badge>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CustomerInfoForm({
  customer,
  updateCustomer,
}: {
  customer: CustomerRow;
  updateCustomer: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={updateCustomer} className="form-grid accordion-form-padding">
      <div className="form-row">
        <div className="form-field">
          <label className="form-label">氏名</label>
          <input className="input" name="name" defaultValue={customer.name} required />
        </div>
        <div className="form-field">
          <label className="form-label">フリガナ</label>
          <input className="input" name="furigana" defaultValue={customer.furigana ?? ''} />
        </div>
        <div className="form-field">
          <label className="form-label">電話番号</label>
          <input className="input" name="phone" defaultValue={customer.phone ?? ''} />
        </div>
        <div className="form-field">
          <label className="form-label">メールアドレス</label>
          <input className="input" name="email" defaultValue={customer.email ?? ''} />
        </div>
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">LINE userId</label>
          <input
            className="input"
            name="line_user_id"
            defaultValue={customer.line_user_id ?? ''}
            placeholder="U で始まる ID（Webhook で受信した値）"
          />
          <div className="cust-meta customer-detail-hint-compact">
            <Link href="/line/unmatched" className="panel-link">
              LINE 未マッチ一覧で紐付け
            </Link>
          </div>
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">備考</label>
        <textarea className="textarea" name="notes" defaultValue={customer.notes ?? ''} />
      </div>
      <button className="btn btn-primary" type="submit">
        顧客情報を保存
      </button>
    </form>
  );
}

export function ConsentForm({
  updateConsent,
  lineConsent,
  mailConsent,
}: {
  updateConsent: (formData: FormData) => void | Promise<void>;
  lineConsent: ConsentRow | undefined;
  mailConsent: ConsentRow | undefined;
}) {
  return (
    <form action={updateConsent} className="form-grid accordion-form-padding">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="line_opt_in" defaultChecked={lineConsent?.opt_in ?? true} />
          LINE 受信
        </label>
        <label className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" name="mail_opt_in" defaultChecked={mailConsent?.opt_in ?? true} />
          メール 受信
        </label>
      </div>
      <button className="btn" type="submit">
        配信同意を保存
      </button>
    </form>
  );
}

export function VehiclesBlock({
  customerId,
  vehicles,
}: {
  customerId: string;
  vehicles: VehicleRow[];
}) {
  return (
    <div style={{ padding: '0 20px 20px', display: 'grid', gap: 16 }}>
      {vehicles.length === 0 && <div className="empty">車両未登録</div>}
      {vehicles.map((v) => {
        const estimated = computeEstimatedMileage(v.initial_mileage, v.initial_mileage_recorded_at, v.monthly_avg_km);
        const daysLeft = daysUntil(v.inspection_expire_date);
        return <VehicleForm key={v.id} customerId={customerId} vehicle={v} estimated={estimated} daysLeft={daysLeft} />;
      })}
      <details data-role="vehicle-new-details">
        <summary style={{ cursor: 'pointer', padding: '12px 0', fontWeight: 600 }}>
          + 車両を追加
        </summary>
        <VehicleForm customerId={customerId} vehicle={null} />
      </details>
    </div>
  );
}

export function QuotesBlock({ customerId, quotes }: { customerId: string; quotes: QuoteRow[] }) {
  return (
    <div style={{ padding: 20 }}>
      {quotes.length === 0 ? (
        <div className="empty">まだ見積がありません</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>見積No.</th>
              <th>状態</th>
              <th>合計</th>
              <th>有効期限</th>
            </tr>
          </thead>
          <tbody>
            {quotes.slice(0, 5).map((q) => (
              <tr key={q.id}>
                <td>{q.quote_no ?? '-'}</td>
                <td>
                  <Badge variant="info">{q.status}</Badge>
                </td>
                <td>{formatYen(q.total_amount)}</td>
                <td>{formatDate(q.valid_until)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 12 }}>
        <Link className="panel-link" href={`/quotes/by-customer/${customerId}`}>
          見積一覧へ →
        </Link>
      </div>
    </div>
  );
}

export function HistoriesBlock({ histories }: { histories: ServiceHistoryRow[] }) {
  return (
    <div style={{ padding: 20 }}>
      {histories.length === 0 ? (
        <div className="empty">履歴がありません</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>内容</th>
              <th>走行距離</th>
            </tr>
          </thead>
          <tbody>
            {histories.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.performed_at)}</td>
                <td>{h.title}</td>
                <td>{formatKm(h.mileage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function vehicleSpecsDefaults(vehicle: VehicleRow | null): {
  vehicle_class: string;
  eco: boolean;
  displacement: string;
  grossWeight: string;
} {
  const raw =
    vehicle?.vehicle_specs && typeof vehicle.vehicle_specs === 'object' && !Array.isArray(vehicle.vehicle_specs)
      ? (vehicle.vehicle_specs as Record<string, unknown>)
      : {};
  const vcRaw = raw.vehicle_class;
  const vehicle_class = vcRaw === 'LIGHT' || vcRaw === 'STANDARD' ? vcRaw : 'STANDARD';
  const eco = raw.eco_reduction_eligible === true;
  const displacement = typeof raw.displacement_cc === 'number' ? String(raw.displacement_cc) : '';
  const grossWeight = typeof raw.gross_weight_kg === 'number' ? String(raw.gross_weight_kg) : '';
  return { vehicle_class, eco, displacement, grossWeight };
}

function VehicleForm({
  customerId,
  vehicle,
  estimated,
  daysLeft,
}: {
  customerId: string;
  vehicle: VehicleRow | null;
  estimated?: number | null;
  daysLeft?: number | null;
}) {
  const sp = vehicleSpecsDefaults(vehicle);
  const action = upsertVehicleAction.bind(null, customerId, vehicle?.id ?? null);
  return (
    <form
      action={action}
      className="form-grid"
      style={{ borderTop: vehicle ? '1px solid var(--border)' : 'none', paddingTop: vehicle ? 16 : 0 }}
    >
      <div className="form-row">
        <div className="form-field">
          <label className="form-label">メーカー</label>
          <input className="input" name="maker" defaultValue={vehicle?.maker ?? ''} required />
        </div>
        <div className="form-field">
          <label className="form-label">車種</label>
          <input className="input" name="model" defaultValue={vehicle?.model ?? ''} required />
        </div>
        <div className="form-field">
          <label className="form-label">ナンバー</label>
          <input className="input" name="plate" defaultValue={vehicle?.plate ?? ''} required />
        </div>
        <div className="form-field">
          <label className="form-label">VIN</label>
          <input className="input" name="vin" defaultValue={vehicle?.vin ?? ''} />
        </div>
        <div className="form-field">
          <label className="form-label">自動車区分（車検証・概算）</label>
          <select className="input select" name="vehicle_class" defaultValue={sp.vehicle_class}>
            <option value="STANDARD">普通自動車など</option>
            <option value="LIGHT">軽自動車</option>
          </select>
        </div>
        <div className="form-field" style={{ alignSelf: 'end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" name="eco_reduction_eligible" defaultChecked={sp.eco} />
            <span>エコカー減税の適用（重量税の概算）</span>
          </label>
        </div>
        <div className="form-field">
          <label className="form-label">総排気量 (cc・任意)</label>
          <input className="input" type="number" name="displacement_cc" min={1} placeholder="例 1500" defaultValue={sp.displacement || ''} />
        </div>
        <div className="form-field">
          <label className="form-label">車両重量 (kg・任意)</label>
          <input className="input" type="number" name="gross_weight_kg" min={1} placeholder="例 1200" defaultValue={sp.grossWeight || ''} />
        </div>
        <div className="form-field">
          <label className="form-label">車検満了日</label>
          <input className="input" type="date" name="inspection_expire_date" defaultValue={vehicle?.inspection_expire_date ?? ''} required />
        </div>
        <div className="form-field">
          <label className="form-label">登録時走行 (km)</label>
          <input className="input" type="number" name="initial_mileage" defaultValue={vehicle?.initial_mileage ?? 0} min={0} />
        </div>
        <div className="form-field">
          <label className="form-label">月平均走行 (km)</label>
          <input className="input" type="number" name="monthly_avg_km" defaultValue={vehicle?.monthly_avg_km ?? ''} min={0} />
        </div>
        <div className="form-field">
          <label className="form-label">前回オイル交換時 (km)</label>
          <input className="input" type="number" name="last_oil_change_mileage" defaultValue={vehicle?.last_oil_change_mileage ?? ''} min={0} />
        </div>
        <div className="form-field">
          <label className="form-label">前回オイル交換日</label>
          <input className="input" type="date" name="last_oil_change_at" defaultValue={vehicle?.last_oil_change_at ?? ''} />
        </div>
        <div className="form-field">
          <label className="form-label">オイル目安 (km)</label>
          <input className="input" type="number" name="oil_interval_km" defaultValue={vehicle?.oil_interval_km ?? 4000} min={1000} />
        </div>
      </div>
      {vehicle && (
        <div className="cust-meta">
          推定走行: {formatKm(estimated)} / 残日数: {priorityLabel(daysLeft)}
        </div>
      )}
      <button className="btn btn-primary" type="submit">
        {vehicle ? '更新する' : '車両を登録'}
      </button>
    </form>
  );
}
