import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import type { CustomerOverviewRow } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function QuoteByCustomerPage({
  params,
}: {
  params: { customerId: string };
}) {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('v_customer_overview')
    .select('vehicle_id')
    .eq('customer_id', params.customerId)
    .maybeSingle<Pick<CustomerOverviewRow, 'vehicle_id'>>();

  if (!data?.vehicle_id) {
    redirect(`/customers/${params.customerId}?quote=needs_vehicle`);
  }
  redirect(`/quotes/${data.vehicle_id}`);
}
