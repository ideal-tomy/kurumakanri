/**
 * 推定走行距離 / 残日数の計算ユーティリティ。
 * Postgres 側関数（`public.estimated_mileage` / `public.days_until`）と挙動を一致させる。
 */

const DAYS_PER_MONTH = 30.4375;

export function computeEstimatedMileage(
  initialMileage: number | null | undefined,
  initialRecordedAt: string | Date | null | undefined,
  monthlyAvgKm: number | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (initialMileage == null || initialRecordedAt == null) return initialMileage ?? null;
  const recorded =
    typeof initialRecordedAt === 'string' ? new Date(initialRecordedAt) : initialRecordedAt;
  if (Number.isNaN(recorded.getTime())) return initialMileage ?? null;
  const days = Math.max(0, (asOf.getTime() - recorded.getTime()) / (1000 * 60 * 60 * 24));
  const months = days / DAYS_PER_MONTH;
  const additional = (monthlyAvgKm ?? 0) * months;
  return Math.max(0, Math.round(initialMileage + additional));
}

export function daysUntil(date: string | null | undefined, asOf: Date = new Date()): number | null {
  if (!date) return null;
  const target = new Date(date + 'T00:00:00');
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - new Date(asOf.toDateString()).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function nextOilTargetKm(
  lastOilChangeMileage: number | null | undefined,
  initialMileage: number | null | undefined,
  oilIntervalKm: number,
): number {
  const base = lastOilChangeMileage ?? initialMileage ?? 0;
  return base + oilIntervalKm;
}

export function oilOverageKm(
  estimatedMileage: number | null | undefined,
  lastOilChangeMileage: number | null | undefined,
  initialMileage: number | null | undefined,
  oilIntervalKm: number,
): number {
  return (estimatedMileage ?? 0) - nextOilTargetKm(lastOilChangeMileage, initialMileage, oilIntervalKm);
}
