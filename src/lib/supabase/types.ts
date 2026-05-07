/**
 * Supabase 生成型のプレースホルダ。
 * 実プロジェクトでは `npm run types:gen` で上書きする。
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'OPTED_OUT';
export type NotificationChannel = 'LINE' | 'MAIL';
export type NotificationJobStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';
export type NotificationLogResult =
  | 'SUCCESS'
  | 'FAILED'
  | 'BOUNCED'
  | 'COMPLAINED';
export type QuoteStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED';
export type RuleKind = 'SHAKEN_DAYS_BEFORE' | 'OIL_KM_INTERVAL';
export type UserRole = 'ADMIN' | 'STAFF';
export type TaskType = 'CALL' | 'FOLLOWUP' | 'QUOTE' | 'OTHER';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface CustomerRow {
  id: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  email: string | null;
  line_user_id: string | null;
  status: CustomerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleRow {
  id: string;
  customer_id: string;
  maker: string;
  model: string;
  plate: string;
  vin: string | null;
  inspection_expire_date: string;
  initial_mileage: number;
  initial_mileage_recorded_at: string;
  monthly_avg_km: number | null;
  last_oil_change_mileage: number | null;
  last_oil_change_at: string | null;
  oil_interval_km: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerOverviewRow {
  customer_id: string;
  name: string;
  furigana: string | null;
  phone: string | null;
  email: string | null;
  line_user_id: string | null;
  status: CustomerStatus;
  vehicle_id: string | null;
  maker: string | null;
  model: string | null;
  plate: string | null;
  vin: string | null;
  inspection_expire_date: string | null;
  initial_mileage: number | null;
  initial_mileage_recorded_at: string | null;
  monthly_avg_km: number | null;
  last_oil_change_mileage: number | null;
  last_oil_change_at: string | null;
  oil_interval_km: number | null;
  estimated_mileage: number | null;
  days_until_inspection: number | null;
}

export interface OilTargetRow extends CustomerOverviewRow {
  next_oil_target_km: number | null;
  oil_overage_km: number | null;
}

export interface NotificationJobRow {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  rule_id: string | null;
  channel: NotificationChannel;
  template_key: string;
  scheduled_at: string;
  status: NotificationJobStatus;
  attempts: number;
  idempotency_key: string;
  payload: Json | null;
  last_error: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLogRow {
  id: string;
  job_id: string;
  provider: string;
  provider_message_id: string | null;
  result: NotificationLogResult;
  error_code: string | null;
  error_message: string | null;
  payload: Json | null;
  sent_at: string;
}

export interface ConsentRow {
  id: string;
  customer_id: string;
  channel: NotificationChannel;
  opt_in: boolean;
  opt_out_at: string | null;
  source: string | null;
  updated_at: string;
}

export interface TemplateVersionRow {
  id: string;
  template_key: string;
  channel: NotificationChannel;
  subject: string | null;
  content: string;
  version: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface StaffProfileRow {
  user_id: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LineUnmatchedRow {
  line_user_id: string;
  first_follow_at: string;
  last_text: string | null;
  last_message_at: string | null;
}

export interface QuoteRow {
  id: string;
  vehicle_id: string;
  quote_no: string | null;
  status: QuoteStatus;
  total_amount: number;
  legal_items: Json;
  service_items: Json;
  notes: string | null;
  valid_until: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceHistoryRow {
  id: string;
  vehicle_id: string;
  title: string;
  performed_at: string;
  mileage: number | null;
  notes: string | null;
  created_at: string;
}

export interface StaffTaskRow {
  id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: number;
  due_at: string | null;
  scheduled_at: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriorityQueueRow {
  queue_id: string;
  source_type: 'AUTO' | 'MANUAL';
  task_id: string | null;
  task_type: TaskType;
  status: TaskStatus;
  priority: number;
  sort_due_at: string | null;
  completed_at: string | null;
  created_at: string;
  title: string;
  description: string;
  customer_id: string | null;
  vehicle_id: string | null;
  customer_name: string | null;
  phone: string | null;
  plate: string | null;
}
