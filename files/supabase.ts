import { createClient } from '@supabase/supabase-js';

// クライアントサイド用（公開可能なキー）
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// サーバーサイド用（管理者権限。Edge Function や API Route から使用）
export const createServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );

// 型定義
export type Customer = {
  id: string;
  name: string;
  name_kana: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  line_user_id: string | null;
  notification_preference: 'line' | 'phone' | 'sms' | 'mail';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  customer_id: string;
  plate_number: string;
  maker: string | null;
  model: string | null;
  model_code: string | null;
  color: string | null;
  vin: string | null;
  first_registration_date: string | null;
  inspection_expiry_date: string | null;
  insurance_expiry_date: string | null;
  last_oil_change_date: string | null;
  last_oil_change_mileage: number | null;
  current_mileage: number | null;
  current_mileage_date: string | null;
  avg_monthly_mileage: number;
  last_visit_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
