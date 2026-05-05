import { getServerSupabase } from './supabase/server';
import {
  computeEstimatedMileage,
  daysUntil,
  nextOilTargetKm,
  oilOverageKm,
} from './mileage';
import type { CustomerOverviewRow, OilTargetRow } from './supabase/types';

export type RuleKey = 'shaken_180days' | 'shaken_90days' | 'oil_4000km';

export interface RuleTarget extends CustomerOverviewRow {
  rule_key: RuleKey;
  rule_label: string;
  next_oil_target_km?: number | null;
  oil_overage_km?: number | null;
}

const RULE_VIEW: Record<RuleKey, string> = {
  shaken_180days: 'v_targets_shaken_180',
  shaken_90days: 'v_targets_shaken_90',
  oil_4000km: 'v_targets_oil',
};

const RULE_LABEL: Record<RuleKey, string> = {
  shaken_180days: '車検半年前 (180日)',
  shaken_90days: '車検3か月前 (90日)',
  oil_4000km: 'オイル交換目安 (4,000km)',
};

export async function loadRuleTargets(rule: RuleKey): Promise<RuleTarget[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from(RULE_VIEW[rule]).select('*');
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as OilTargetRow;
    return {
      ...r,
      rule_key: rule,
      rule_label: RULE_LABEL[rule],
    };
  });
}

/**
 * クライアント側の素朴版抽出（テストや Edge Function スタブ向け）。
 * DB ビューが使えない環境でも同じ結果を返せる。
 */
export function classifyTargets(
  rows: CustomerOverviewRow[],
): { rule: RuleKey; rows: RuleTarget[] }[] {
  const out: Record<RuleKey, RuleTarget[]> = {
    shaken_180days: [],
    shaken_90days: [],
    oil_4000km: [],
  };

  const today = new Date();

  for (const row of rows) {
    if (!row.vehicle_id) continue;
    const days = row.days_until_inspection ?? daysUntil(row.inspection_expire_date, today);
    if (days != null) {
      if (days >= 60 && days <= 100) {
        out.shaken_90days.push({ ...row, rule_key: 'shaken_90days', rule_label: RULE_LABEL.shaken_90days });
      } else if (days >= 150 && days <= 210) {
        out.shaken_180days.push({ ...row, rule_key: 'shaken_180days', rule_label: RULE_LABEL.shaken_180days });
      }
    }

    const estimated =
      row.estimated_mileage ??
      computeEstimatedMileage(
        row.initial_mileage,
        row.initial_mileage_recorded_at,
        row.monthly_avg_km,
        today,
      );
    const oilInterval = row.oil_interval_km ?? 4000;
    const target = nextOilTargetKm(row.last_oil_change_mileage, row.initial_mileage, oilInterval);
    const overage = oilOverageKm(
      estimated,
      row.last_oil_change_mileage,
      row.initial_mileage,
      oilInterval,
    );
    if (overage >= -200) {
      out.oil_4000km.push({
        ...row,
        rule_key: 'oil_4000km',
        rule_label: RULE_LABEL.oil_4000km,
        next_oil_target_km: target,
        oil_overage_km: overage,
      });
    }
  }

  return (Object.keys(out) as RuleKey[]).map((rule) => ({ rule, rows: out[rule] }));
}

export const RULE_LABELS = RULE_LABEL;
