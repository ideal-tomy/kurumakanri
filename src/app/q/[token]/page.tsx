import { verifyQuoteShareToken } from '@/lib/quote-share';
import { QuoteDocument } from '@/components/quote-document';
import { parseIssuerFromEnv } from '@/lib/issuer';
import { getServiceSupabase } from '@/lib/supabase/server';
import { quoteTotalsForDisplay } from '@/lib/quote';
import type { CustomerRow } from '@/lib/supabase/types';
import type { QuoteRow } from '@/lib/supabase/types';
import type { VehicleRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { token: string };
}

export default async function PublicQuotePage({ params }: PageProps) {
  const decoded = verifyQuoteShareToken(params.token);
  if (!decoded) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="brand-name">リンクが無効です</h1>
          <p className="page-sub" style={{ marginTop: 12 }}>
            URL の有効期限が切れているか、不正なリンクです。店舗までお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  const service = getServiceSupabase();
  const { data: quote } = await service
    .from('quotes')
    .select('*')
    .eq('id', decoded.quoteId)
    .maybeSingle<QuoteRow>();

  if (!quote) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="brand-name">見積が見つかりません</h1>
        </div>
      </div>
    );
  }

  const { data: vehicle } = await service
    .from('vehicles')
    .select('*')
    .eq('id', quote.vehicle_id)
    .maybeSingle<VehicleRow>();

  if (!vehicle) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <h1 className="brand-name">車両情報がありません</h1>
        </div>
      </div>
    );
  }

  const { data: customer } = await service
    .from('customers')
    .select('*')
    .eq('id', vehicle.customer_id)
    .maybeSingle<CustomerRow>();

  const disp = quoteTotalsForDisplay({
    legal_items: quote.legal_items,
    service_items: quote.service_items,
    taxable_subtotal_ex_tax: quote.taxable_subtotal_ex_tax,
    tax_amount_10: quote.tax_amount_10,
    non_taxable_subtotal: quote.non_taxable_subtotal,
    grand_total: quote.grand_total,
    total_amount: quote.total_amount,
  });

  const issuer = parseIssuerFromEnv();

  return (
    <main className="quote-doc-shell">
      <QuoteDocument
        issuer={issuer}
        customerName={customer?.name ?? 'お客様'}
        maker={vehicle.maker}
        model={vehicle.model}
        plate={vehicle.plate}
        quoteNo={quote.quote_no}
        issuedAt={quote.issued_at}
        validUntil={quote.valid_until}
        notes={quote.notes}
        legal={disp.legal}
        service={disp.service}
        taxableSubtotalExTax={disp.taxable_subtotal_ex_tax}
        taxAmount10={disp.tax_amount_10}
        nonTaxableSubtotal={disp.non_taxable_subtotal}
        grandTotal={disp.grand_total}
        showPrintHint
      />
    </main>
  );
}
