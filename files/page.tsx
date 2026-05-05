'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewCustomerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 顧客フォーム
  const [customer, setCustomer] = useState({
    name: '',
    name_kana: '',
    phone: '',
    email: '',
    address: '',
    postal_code: '',
    notification_preference: 'phone' as const,
    notes: '',
  });

  // 車両フォーム
  const [vehicle, setVehicle] = useState({
    plate_number: '',
    maker: '',
    model: '',
    model_code: '',
    color: '',
    first_registration_date: '',
    inspection_expiry_date: '',
    insurance_expiry_date: '',
    last_oil_change_date: '',
    last_oil_change_mileage: '',
    current_mileage: '',
    current_mileage_date: '',
    avg_monthly_mileage: '833',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. 顧客作成
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. 車両作成（プレート番号が入力されている場合のみ）
      if (vehicle.plate_number) {
        const vehiclePayload = {
          customer_id: customerData.id,
          plate_number: vehicle.plate_number,
          maker: vehicle.maker || null,
          model: vehicle.model || null,
          model_code: vehicle.model_code || null,
          color: vehicle.color || null,
          first_registration_date: vehicle.first_registration_date || null,
          inspection_expiry_date: vehicle.inspection_expiry_date || null,
          insurance_expiry_date: vehicle.insurance_expiry_date || null,
          last_oil_change_date: vehicle.last_oil_change_date || null,
          last_oil_change_mileage: vehicle.last_oil_change_mileage
            ? Number(vehicle.last_oil_change_mileage)
            : null,
          current_mileage: vehicle.current_mileage ? Number(vehicle.current_mileage) : null,
          current_mileage_date: vehicle.current_mileage_date || null,
          avg_monthly_mileage: Number(vehicle.avg_monthly_mileage) || 833,
          notes: vehicle.notes || null,
        };

        const { error: vehicleError } = await supabase
          .from('vehicles')
          .insert([vehiclePayload]);

        if (vehicleError) throw vehicleError;
      }

      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 pb-12">
      <h1 className="text-2xl font-bold mb-6">新規顧客登録</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 顧客情報セクション */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold border-b pb-2">顧客情報</h2>

          <Field label="氏名" required>
            <input
              type="text"
              required
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="フリガナ">
            <input
              type="text"
              value={customer.name_kana}
              onChange={(e) => setCustomer({ ...customer, name_kana: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="電話番号">
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="090-1234-5678"
            />
          </Field>

          <Field label="郵便番号">
            <input
              type="text"
              value={customer.postal_code}
              onChange={(e) => setCustomer({ ...customer, postal_code: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="123-4567"
            />
          </Field>

          <Field label="住所">
            <input
              type="text"
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="希望連絡手段">
            <select
              value={customer.notification_preference}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  notification_preference: e.target.value as any,
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="phone">電話</option>
              <option value="line">LINE</option>
              <option value="sms">SMS</option>
              <option value="mail">郵送</option>
            </select>
          </Field>

          <Field label="メモ">
            <textarea
              value={customer.notes}
              onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={2}
            />
          </Field>
        </section>

        {/* 車両情報セクション */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold border-b pb-2">車両情報</h2>
          <p className="text-sm text-gray-500">
            車両情報を入力すると、車検・オイル交換の通知対象になります。
          </p>

          <Field label="ナンバー">
            <input
              type="text"
              value={vehicle.plate_number}
              onChange={(e) => setVehicle({ ...vehicle, plate_number: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="品川500あ1234"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="メーカー">
              <input
                type="text"
                value={vehicle.maker}
                onChange={(e) => setVehicle({ ...vehicle, maker: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="トヨタ"
              />
            </Field>
            <Field label="車種">
              <input
                type="text"
                value={vehicle.model}
                onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="プリウス"
              />
            </Field>
          </div>

          <Field label="車検満了日" hint="★通知の重要項目">
            <input
              type="date"
              value={vehicle.inspection_expiry_date}
              onChange={(e) =>
                setVehicle({ ...vehicle, inspection_expiry_date: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <Field label="自賠責満了日">
            <input
              type="date"
              value={vehicle.insurance_expiry_date}
              onChange={(e) =>
                setVehicle({ ...vehicle, insurance_expiry_date: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="最終オイル交換日">
              <input
                type="date"
                value={vehicle.last_oil_change_date}
                onChange={(e) =>
                  setVehicle({ ...vehicle, last_oil_change_date: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </Field>
            <Field label="その時の走行距離(km)">
              <input
                type="number"
                value={vehicle.last_oil_change_mileage}
                onChange={(e) =>
                  setVehicle({ ...vehicle, last_oil_change_mileage: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              />
            </Field>
          </div>

          <Field
            label="平均月間走行距離(km)"
            hint="オイル交換時期予測に使用。デフォルトは833km(年1万km)"
          >
            <input
              type="number"
              value={vehicle.avg_monthly_mileage}
              onChange={(e) =>
                setVehicle({ ...vehicle, avg_monthly_mileage: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            />
          </Field>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border rounded py-3 font-medium"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-green-600 text-white rounded py-3 font-medium disabled:opacity-50"
          >
            {submitting ? '登録中...' : '登録する'}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
