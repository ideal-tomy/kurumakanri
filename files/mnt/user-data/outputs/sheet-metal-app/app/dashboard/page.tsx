'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Target = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  vehicle_id: string;
  plate_number: string;
  maker: string | null;
  model: string | null;
  inspection_expiry_date: string | null;
  oil_change_km_remaining: number | null;
  notification_type: string;
  days_until_inspection: number | null;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  inspection_6m: { label: '車検 6ヶ月前', color: 'bg-blue-100 text-blue-700' },
  inspection_3m: { label: '車検 3ヶ月前', color: 'bg-yellow-100 text-yellow-700' },
  inspection_1m: { label: '車検 1ヶ月前', color: 'bg-red-100 text-red-700' },
  oil_change: { label: 'オイル交換目安', color: 'bg-green-100 text-green-700' },
};

export default function DashboardPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('daily_notification_targets')
        .select('*')
        .order('days_until_inspection', { ascending: true, nullsFirst: false });
      setTargets((data ?? []) as Target[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-4 pb-12">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">本日の連絡対象</h1>
        <Link
          href="/customers/new"
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + 顧客登録
        </Link>
      </header>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : targets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>本日連絡が必要な顧客はいません</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {targets.map((t) => {
            const typeInfo = TYPE_LABELS[t.notification_type] ?? {
              label: t.notification_type,
              color: 'bg-gray-100 text-gray-700',
            };
            return (
              <li
                key={`${t.vehicle_id}-${t.notification_type}`}
                className="border rounded-lg p-4 bg-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{t.customer_name} 様</p>
                    <p className="text-sm text-gray-600">
                      {t.plate_number} {t.maker} {t.model}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-3">
                  {t.notification_type === 'oil_change' ? (
                    <>予測残り {t.oil_change_km_remaining ?? '-'} km</>
                  ) : (
                    <>
                      車検満了日: {t.inspection_expiry_date} (あと
                      {t.days_until_inspection}日)
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {t.phone && (
                    <a
                      href={`tel:${t.phone}`}
                      className="flex-1 text-center bg-blue-600 text-white py-2 rounded text-sm"
                    >
                      📞 電話する
                    </a>
                  )}
                  <Link
                    href={`/customers/${t.customer_id}`}
                    className="flex-1 text-center border py-2 rounded text-sm"
                  >
                    詳細を見る
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
