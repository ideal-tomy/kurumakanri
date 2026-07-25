import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  CustomerInfoForm,
  ConsentForm,
  CustomerSummaryStrip,
  HistoriesBlock,
  QuotesBlock,
  VehiclesBlock,
} from '@/components/customer-detail-panels';
import { OpenDetailsFromHash } from '@/components/open-details-from-hash';
import { PageBack } from '@/components/page-back';
import { NextActions } from '@/components/next-actions';
import { updateCustomerAction, updateConsentAction } from '../actions';
import type {
  ConsentRow,
  CustomerRow,
  QuoteRow,
  ServiceHistoryRow,
  VehicleRow,
} from '@/lib/supabase/types';
import { PortalLinkCopy } from '@/components/portal-link-copy';
import { buildCustomerPortalUrl } from '@/lib/customer-portal-share';
import { computeEstimatedMileage, daysUntil } from '@/lib/mileage';
import { formatDate, formatKm, priorityLabel } from '@/lib/format';

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
  const { customer, vehicles, quotes, histories, consents } = await loadCustomer(params.id);
  if (!customer) notFound();

  const quoteBanner = searchParams?.quote === 'needs_vehicle';

  const lineConsent = consents.find((c) => c.channel === 'LINE');
  const mailConsent = consents.find((c) => c.channel === 'MAIL');
  const primaryVehicle = vehicles[0];
  const updateCustomer = updateCustomerAction.bind(null, customer.id);
  const updateConsent = updateConsentAction.bind(null, customer.id);
  const portalUrl = buildCustomerPortalUrl(customer.id);

  return (
    <>
      <OpenDetailsFromHash />

      <PageBack href="/customers" label="顧客一覧へ戻る" />
      {quoteBanner ? (
        <section
          className="panel"
          style={{ marginBottom: 16, padding: 14, borderLeft: '4px solid var(--warn)' }}
        >
          主車両が未登録のため見積ページを開けません。先に車両を登録してください。
        </section>
      ) : null}
      <div className="page-header customer-detail-page-header">
        <div>
          <h1 className="page-title">{customer.name}</h1>
          <div className="page-sub">{customer.furigana ?? '-'}</div>
        </div>
      </div>

      <div className="mobile-only">
        <CustomerSummaryStrip customer={customer} primaryVehicle={primaryVehicle} />
      </div>

      <section className="panel customer-portal-panel">
        <header className="panel-header">
          <div className="panel-title">顧客向けポータル</div>
        </header>
        <div className="customer-portal-panel-body">
          {portalUrl ? (
            <>
              <p className="cust-meta customer-portal-panel-desc">
                LINE やメールでお客様に送る専用ページのリンクです。お車の状況・見積概要・整備履歴を確認できます。
              </p>
              <PortalLinkCopy url={portalUrl} />
            </>
          ) : (
            <p className="cust-meta">
              CUSTOMER_PORTAL_SECRET を設定するとリンクを発行できます。
            </p>
          )}
        </div>
      </section>

      {/* デスクトップ: 従来の2カラム＋パネル */}
      <div className="desktop-only">
        <div className="content-grid">
          <section className="panel">
            <header className="panel-header">
              <div className="panel-title">顧客情報</div>
            </header>
            <CustomerInfoForm customer={customer} updateCustomer={updateCustomer} />

            <header className="panel-header">
              <div className="panel-title">配信同意</div>
            </header>
            <ConsentForm updateConsent={updateConsent} lineConsent={lineConsent} mailConsent={mailConsent} />
          </section>

          <section className="panel vehicle-panel-desktop">
            <header className="panel-header">
              <div className="panel-title">車両</div>
              <Link href={`/customers/${customer.id}#vehicle-new`} className="panel-link">
                + 追加
              </Link>
            </header>
            <VehiclesBlock customerId={customer.id} vehicles={vehicles} />
          </section>
        </div>

        <section className="panel" style={{ marginTop: 24 }}>
          <header className="panel-header">
            <div className="panel-title">最新の見積</div>
            <Link className="panel-link" href={`/quotes/by-customer/${customer.id}`}>
              見積を見る →
            </Link>
          </header>
          <QuotesBlock customerId={customer.id} quotes={quotes} />
        </section>

        <section className="panel" style={{ marginTop: 24 }}>
          <header className="panel-header">
            <div className="panel-title">整備履歴</div>
          </header>
          <HistoriesBlock customerId={customer.id} vehicles={vehicles} histories={histories} />
        </section>

        {primaryVehicle ? (
          <section style={{ marginTop: 16, color: 'var(--ink-3)', fontSize: 12 }}>
            推定走行距離:{' '}
            {formatKm(
              computeEstimatedMileage(
                primaryVehicle.initial_mileage,
                primaryVehicle.initial_mileage_recorded_at,
                primaryVehicle.monthly_avg_km,
              ),
            )}{' '}
            ・ 残日数: {priorityLabel(daysUntil(primaryVehicle.inspection_expire_date))}
          </section>
        ) : null}
      </div>

      {/* モバイル: アコーディオンで縦スクロールを抑制 */}
      <div className="mobile-only customer-detail-accordions">
        <details className="panel accordion-details">
          <summary className="accordion-summary">
            <span className="accordion-summary-title">顧客情報・連絡先</span>
          </summary>
          <CustomerInfoForm customer={customer} updateCustomer={updateCustomer} />
        </details>

        <details className="panel accordion-details">
          <summary className="accordion-summary">
            <span className="accordion-summary-title">配信同意</span>
          </summary>
          <ConsentForm updateConsent={updateConsent} lineConsent={lineConsent} mailConsent={mailConsent} />
        </details>

        <details id="accordion-vehicles" className="panel accordion-details" {...(quoteBanner ? { open: true } : {})}>
          <summary className="accordion-summary">
            <span className="accordion-summary-title">車両（{vehicles.length}）</span>
          </summary>
          <div className="accordion-vehicle-toolbar">
            <Link href={`/customers/${customer.id}#vehicle-new`} className="panel-link">
              + 車両を追加（フォームへ）
            </Link>
          </div>
          <VehiclesBlock customerId={customer.id} vehicles={vehicles} />
        </details>

        <details className="panel accordion-details">
          <summary className="accordion-summary">
            <span className="accordion-summary-title">最新の見積</span>
          </summary>
          <QuotesBlock customerId={customer.id} quotes={quotes} />
        </details>

        <details className="panel accordion-details">
          <summary className="accordion-summary">
            <span className="accordion-summary-title">整備履歴</span>
          </summary>
          <HistoriesBlock customerId={customer.id} vehicles={vehicles} histories={histories} />
        </details>
      </div>

      <NextActions
        items={[
          { href: '/customers', label: '顧客一覧へ戻る', primary: true },
          { href: '/customers/new', label: '+ 別の顧客を追加' },
          { href: '/', label: 'ホーム' },
          { href: `/quotes/by-customer/${customer.id}`, label: 'この顧客の見積を見る' },
        ]}
      />
    </>
  );
}
