import { describe, expect, it } from 'vitest';
import {
  computeEstimatedMileage,
  daysUntil,
  nextOilTargetKm,
  oilOverageKm,
} from './mileage';

describe('computeEstimatedMileage', () => {
  it('returns initial mileage when no months elapsed', () => {
    const today = new Date('2026-01-01');
    const result = computeEstimatedMileage(50000, '2026-01-01', 800, today);
    expect(result).toBe(50000);
  });

  it('adds monthly_avg_km * months when time has passed', () => {
    const today = new Date('2026-04-01');
    const result = computeEstimatedMileage(50000, '2026-01-01', 1000, today);
    expect(result).toBeGreaterThanOrEqual(52800);
    expect(result).toBeLessThanOrEqual(53100);
  });

  it('returns null when initial mileage is null', () => {
    expect(computeEstimatedMileage(null, '2026-01-01', 800)).toBeNull();
  });
});

describe('daysUntil', () => {
  it('returns positive when target is in the future', () => {
    const days = daysUntil('2026-12-31', new Date('2026-12-01T00:00:00'));
    expect(days).toBe(30);
  });

  it('returns 0 when target is today', () => {
    const days = daysUntil('2026-05-02', new Date('2026-05-02T10:00:00'));
    expect(days).toBe(0);
  });

  it('returns negative when target is past', () => {
    const days = daysUntil('2026-04-01', new Date('2026-05-02T00:00:00'));
    expect(days).toBeLessThan(0);
  });
});

describe('nextOilTargetKm / oilOverageKm', () => {
  it('next target = last + interval', () => {
    expect(nextOilTargetKm(40000, 30000, 4000)).toBe(44000);
  });

  it('uses initial when last is null', () => {
    expect(nextOilTargetKm(null, 30000, 4000)).toBe(34000);
  });

  it('overage is positive when over the target', () => {
    expect(oilOverageKm(45000, 40000, 30000, 4000)).toBe(1000);
  });
});
