'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';

const customerSchema = z.object({
  name: z.string().min(1, '氏名は必須です'),
  furigana: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('').transform(() => null)).nullable(),
  notes: z.string().optional().nullable(),
  line_user_id: z
    .string()
    .regex(
      /^U[0-9a-f]{32,}$/i,
      'LINE userId は U で始まる ID を指定してください',
    )
    .nullable()
    .optional(),
});

const vehicleSchema = z.object({
  maker: z.string().min(1, 'メーカーは必須です'),
  model: z.string().min(1, '車種は必須です'),
  plate: z.string().min(1, 'ナンバーは必須です'),
  vin: z.string().optional().nullable(),
  inspection_expire_date: z.string().min(1, '満了日は必須です'),
  initial_mileage: z.coerce.number().int().nonnegative().default(0),
  monthly_avg_km: z.coerce.number().int().nonnegative().optional().nullable(),
  last_oil_change_mileage: z.coerce.number().int().nonnegative().optional().nullable(),
  last_oil_change_at: z.string().optional().nullable(),
  oil_interval_km: z.coerce.number().int().positive().default(4000),
});

function nullable(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v === '' ? null : v;
}

function parseVehicleSpecsFromForm(formData: FormData): Record<string, unknown> {
  const cls = nullable(formData.get('vehicle_class'));
  const vehicle_class = cls === 'LIGHT' || cls === 'STANDARD' ? cls : undefined;
  const eco = formData.get('eco_reduction_eligible') === 'on';
  const dispRaw = nullable(formData.get('displacement_cc'));
  const wRaw = nullable(formData.get('gross_weight_kg'));
  const displacement_cc =
    dispRaw != null ? Number.parseInt(dispRaw, 10) : Number.NaN;
  const gross_weight_kg =
    wRaw != null ? Number.parseInt(wRaw, 10) : Number.NaN;
  const specs: Record<string, unknown> = {};
  if (vehicle_class) specs.vehicle_class = vehicle_class;
  if (eco) specs.eco_reduction_eligible = true;
  if (Number.isFinite(displacement_cc) && displacement_cc > 0) {
    specs.displacement_cc = displacement_cc;
  }
  if (Number.isFinite(gross_weight_kg) && gross_weight_kg > 0) {
    specs.gross_weight_kg = gross_weight_kg;
  }
  return specs;
}

export async function createCustomerAction(formData: FormData) {
  const ctx = await requireStaff();
  const supabase = getServerSupabase();

  const customerData = customerSchema.parse({
    name: formData.get('name') ?? '',
    furigana: nullable(formData.get('furigana')),
    phone: nullable(formData.get('phone')),
    email: nullable(formData.get('email')),
    notes: nullable(formData.get('notes')),
    line_user_id: nullable(formData.get('line_user_id')),
  });

  const { data: customer, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select('id')
    .single();
  if (error || !customer) {
    if (error && (error as { code?: string }).code === '23505') {
      throw new Error('指定された LINE userId は既に他の顧客に登録されています');
    }
    throw new Error(error?.message ?? '顧客の作成に失敗しました');
  }

  // 車両情報は「メーカー・車種・ナンバー・車検満了日」の4項目すべて埋まっているときだけ insert する。
  // ウィザードの Step 1 だけで保存するケースを許容するため、いずれかが欠ければ車両は登録せず顧客のみ作る。
  const hasVehicleFlag = formData.get('with_vehicle') === 'on';
  const maker = nullable(formData.get('maker'));
  const model = nullable(formData.get('model'));
  const plate = nullable(formData.get('plate'));
  const inspectionExpireDate = nullable(formData.get('inspection_expire_date'));
  const allVehicleRequiredFilled = Boolean(maker && model && plate && inspectionExpireDate);

  if (hasVehicleFlag && allVehicleRequiredFilled) {
    const v = vehicleSchema.parse({
      maker,
      model,
      plate,
      vin: nullable(formData.get('vin')),
      inspection_expire_date: inspectionExpireDate,
      initial_mileage: formData.get('initial_mileage') ?? 0,
      monthly_avg_km: nullable(formData.get('monthly_avg_km')),
      last_oil_change_mileage: nullable(formData.get('last_oil_change_mileage')),
      last_oil_change_at: nullable(formData.get('last_oil_change_at')),
      oil_interval_km: formData.get('oil_interval_km') ?? 4000,
    });
    await supabase.from('vehicles').insert({
      ...v,
      customer_id: customer.id,
      vehicle_specs: parseVehicleSpecsFromForm(formData),
    });
  }

  // 配信同意を初期化（既定 true）
  await supabase.from('consents').insert([
    { customer_id: customer.id, channel: 'LINE', opt_in: true, source: 'create' },
    { customer_id: customer.id, channel: 'MAIL', opt_in: true, source: 'create' },
  ]);

  await writeAudit({
    userId: ctx.userId,
    action: 'customer.create',
    resource: 'customers',
    resourceId: customer.id,
    payload: { name: customerData.name },
  });

  revalidatePath('/customers');
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const ctx = await requireStaff();
  const supabase = getServerSupabase();
  const data = customerSchema.parse({
    name: formData.get('name') ?? '',
    furigana: nullable(formData.get('furigana')),
    phone: nullable(formData.get('phone')),
    email: nullable(formData.get('email')),
    notes: nullable(formData.get('notes')),
    line_user_id: nullable(formData.get('line_user_id')),
  });
  const { error } = await supabase.from('customers').update(data).eq('id', customerId);
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('指定された LINE userId は既に他の顧客に登録されています');
    }
    throw new Error(error.message);
  }

  await writeAudit({
    userId: ctx.userId,
    action: 'customer.update',
    resource: 'customers',
    resourceId: customerId,
    payload: data,
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/customers');
}

export async function upsertVehicleAction(customerId: string, vehicleId: string | null, formData: FormData) {
  const ctx = await requireStaff();
  const supabase = getServerSupabase();
  const data = vehicleSchema.parse({
    maker: formData.get('maker') ?? '',
    model: formData.get('model') ?? '',
    plate: formData.get('plate') ?? '',
    vin: nullable(formData.get('vin')),
    inspection_expire_date: formData.get('inspection_expire_date') ?? '',
    initial_mileage: formData.get('initial_mileage') ?? 0,
    monthly_avg_km: nullable(formData.get('monthly_avg_km')),
    last_oil_change_mileage: nullable(formData.get('last_oil_change_mileage')),
    last_oil_change_at: nullable(formData.get('last_oil_change_at')),
    oil_interval_km: formData.get('oil_interval_km') ?? 4000,
  });

  const vehicle_specs = parseVehicleSpecsFromForm(formData);

  if (vehicleId) {
    const { error } = await supabase.from('vehicles').update({ ...data, vehicle_specs }).eq('id', vehicleId);
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: ctx.userId,
      action: 'vehicle.update',
      resource: 'vehicles',
      resourceId: vehicleId,
      payload: data,
    });
  } else {
    const { error } = await supabase.from('vehicles').insert({
      ...data,
      customer_id: customerId,
      vehicle_specs,
    });
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: ctx.userId,
      action: 'vehicle.create',
      resource: 'vehicles',
      resourceId: customerId,
      payload: data,
    });
  }

  revalidatePath(`/customers/${customerId}`);
}

export async function updateConsentAction(customerId: string, formData: FormData) {
  const ctx = await requireStaff();
  const supabase = getServerSupabase();
  const lineOptIn = formData.get('line_opt_in') === 'on';
  const mailOptIn = formData.get('mail_opt_in') === 'on';

  await supabase.from('consents').upsert(
    [
      { customer_id: customerId, channel: 'LINE', opt_in: lineOptIn, opt_out_at: lineOptIn ? null : new Date().toISOString(), source: 'staff_edit' },
      { customer_id: customerId, channel: 'MAIL', opt_in: mailOptIn, opt_out_at: mailOptIn ? null : new Date().toISOString(), source: 'staff_edit' },
    ],
    { onConflict: 'customer_id,channel' },
  );

  await writeAudit({
    userId: ctx.userId,
    action: 'consent.update',
    resource: 'consents',
    resourceId: customerId,
    payload: { LINE: lineOptIn, MAIL: mailOptIn },
  });

  revalidatePath(`/customers/${customerId}`);
}
