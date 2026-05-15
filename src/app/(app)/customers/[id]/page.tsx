import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { Badge, priorityVariant } from '@/components/badge';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { formatDate, formatKm, formatYen, priorityLabel } from '@/lib/format';
import {
  updateCustomerAction,
  upsertVehicleAction,
  updateConsentAction,
} from '../actions';
import type {
  ConsentRow,
  CustomerRow,
  QuoteRow,
  ServiceHistoryRow,
  VehicleRow,
} from '@/lib/supabase/types';
import { computeEstimatedMileage, daysUntil } from '@/lib/mileage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
  searchParams?: { quote?: string };
}

async function loadCustomer(id: string) {
  const supabase = getServerSupabase();
  const [customerRes, vehiclesRes, consentsRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).maybeSingle<CustomerRow>(),
    supabase.from('vehicles').select('*').eq('customer_id', id).order('created_at', { ascending: true }),
    supabase.from('consents').select('*').eq('customer_id', id),
  ]);

  const vehicleIds = (vehiclesRes.data ?? []).map((v) => v.id);
  let quotesData: QuoteRow[] = [];
  let historiesData: ServiceHistoryRow[] = [];
  if (vehicleIds.length > 0) {
    const [quotesRes, historyRes] = await Promise.all([
      supabase
        .from('quotes')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('service_histories')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .order('performed_at', { ascending: false })
        .limit(20),
    ]);
    quotesData = (quotesRes.data ?? []) as QuoteRow[];
    historiesData = (historyRes.data ?? []) as ServiceHistoryRow[];
  }

  return {
    customer: customerRes.data,
    vehicles: (vehiclesRes.data ?? []) as VehicleRow[],
    quotes: quotesData,
    histories: historiesData,
    consents: (consentsRes.data ?? []) as ConsentRow[],
  };
}

export default async function CustomerDetailPage({ params, searchParams }: PageProps) {
  const { customer, vehicles, quotes, histories, consents } = await loadCustomer(
    params.id,
  );
  if (!customer) notFound();

  const quoteBanner = searchParams?.quote === 'needs_vehicle';

  const lineConsent = consents.find((c) => c.channel === 'LINE');
  const mailConsent = consents.find((c) => c.channel === 'MAIL');
  const primaryVehicle = vehicles[0];
  const updateCustomer = updateCustomerAction.bind(null, customer.id);
  const updateConsent = updateConsentAction.bind(null, customer.id);

  return (
    <>
      <PageBack href="/customers" label="顧客一覧へ戻る" />
      {quoteBanner ? (
        <section
          className="panel"
          style={{ marginBottom: 16, padding: 14, borderLeft: '4px solid var(--warn)' }}
        >
          主車両が未登録のため見積ページを開けません。先に車両を登録してください。
        </section>
      ) : null}
      <div className="page-header">
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <div className="page-sub">{customer.furigana ?? '-'}</div>
        </div>
      </div>

      <div className="content-grid">
        <section className="panel">
          <header className="panel-header">
            <div className="panel-title">顧客情報</div>
          </header>
          <form action={updateCustomer} className="form-grid" style={{ padding: 20 }}>
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
                  placeholder="U で始まる ID（LINE Webhook で受信した値）"
                />
                <div className="cust-meta">
                  未紐付けの場合は <a href="/line/unmatched" className="panel-link">LINE 未マッチ一覧</a> から結びつけできます
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

          <header className="panel-header">
            <div className="panel-title">配信同意</div>
          </header>
          <form action={updateConsent} className="form-grid" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
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
        </section>

        <section className="panel">
          <header className="panel-header">
            <div className="panel-title">車両</div>
            <Link href={`/customers/${customer.id}#vehicle-new`} className="panel-link">
              + 追加
            </Link>
          </header>
          <div style={{ padding: 20, display: 'grid', gap: 16 }}>
            {vehicles.length === 0 && <div className="empty">車両未登録</div>}
            {vehicles.map((v) => {
              const estimated = computeEstimatedMileage(v.initial_mileage, v.initial_mileage_recorded_at, v.monthly_avg_km);
              const daysLeft = daysUntil(v.inspection_expire_date);
              return (
                <VehicleForm key={v.id} customerId={customer.id} vehicle={v} estimated={estimated} daysLeft={daysLeft} />
              );
            })}
            <details>
              <summary id="vehicle-new" style={{ cursor: 'pointer', padding: 8 }}>
                + 車両を追加
              </summary>
              <VehicleForm customerId={customer.id} vehicle={null} />
            </details>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <header className="panel-header">
          <div className="panel-title">最新の見積</div>
          <Link className="panel-link" href={`/quotes/by-customer/${customer.id}`}>
            見積を見る →
          </Link>
        </header>
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
        </div>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <header className="panel-header">
          <div className="panel-title">整備履歴</div>
        </header>
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
      </section>

      {primaryVehicle && (
        <section style={{ marginTop: 16, color: 'var(--ink-3)', fontSize: 12 }}>
          推定走行距離: {formatKm(computeEstimatedMileage(primaryVehicle.initial_mileage, primaryVehicle.initial_mileage_recorded_at, primaryVehicle.monthly_avg_km))} ・
          残日数: {priorityLabel(daysUntil(primaryVehicle.inspection_expire_date))} ・ 状態:{' '}
          <Badge variant={priorityVariant(daysUntil(primaryVehicle.inspection_expire_date))}>
            {priorityVariant(daysUntil(primaryVehicle.inspection_expire_date))}
          </Badge>
        </section>
      )}

      <NextActions
        items={[
          { href: '/customers', label: '顧客一覧へ戻る', primary: true },
          { href: '/customers/new', label: '+ 別の顧客を追加' },
          { href: '/', label: 'ホーム' },
          { href: `/quotes/by-customer/${customer.id}`, label: 'この車両の見積を見る' },
        ]}
      />
    </>
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
  const displacement =
    typeof raw.displacement_cc === 'number' ? String(raw.displacement_cc) : '';
  const grossWeight =
    typeof raw.gross_weight_kg === 'number' ? String(raw.gross_weight_kg) : '';
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
    <form action={action} className="form-grid" style={{ borderTop: vehicle ? '1px solid var(--border)' : 'none', paddingTop: vehicle ? 16 : 0 }}>
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
