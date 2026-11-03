import { describe, expect, it } from 'vitest';
import type { MemberPause } from '../data/types';
import { computeMemberPauseSummary, enumerateDateRange } from './pauses';

describe('enumerateDateRange', () => {
  it('enumerates dates across month boundaries', () => {
    const range = enumerateDateRange('2026-02-27', '2026-03-02');
    expect(range).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });

  it('returns empty array when start is after end', () => {
    expect(enumerateDateRange('2026-05-10', '2026-05-01')).toEqual([]);
  });

  it('handles single day range', () => {
    expect(enumerateDateRange('2026-04-15', '2026-04-15')).toEqual(['2026-04-15']);
  });
});

describe('computeMemberPauseSummary', () => {
  const memberId = 'm1';
  const year = 2026;

  it('returns unpaused state when no pauses exist', () => {
    const summary = computeMemberPauseSummary(memberId, [], year, '2026-07-01');
    expect(summary.isPaused).toBe(false);
    expect(summary.pausedAt).toBeNull();
    expect(summary.pausedDates).toEqual([]);
    expect(summary.pausedDaysCount).toBe(0);
    expect(summary.pausedDaysElapsed).toBe(0);
  });

  it('handles completed past pauses', () => {
    const pauses: MemberPause[] = [
      {
        memberId,
        year,
        startDate: '2026-03-01',
        endDate: '2026-03-05', // 5 days: Mar 1, 2, 3, 4, 5
      },
    ];
    const summary = computeMemberPauseSummary(memberId, pauses, year, '2026-07-01');
    expect(summary.isPaused).toBe(false);
    expect(summary.pausedAt).toBeNull();
    expect(summary.pausedDaysCount).toBe(5);
    expect(summary.pausedDaysElapsed).toBe(5);
    expect(summary.pausedDates).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
    ]);
  });

  it('handles currently active pause', () => {
    const pauses: MemberPause[] = [
      {
        memberId,
        year,
        startDate: '2026-06-28',
        endDate: null,
      },
    ];
    // Today is 2026-07-01 -> active pause extends from 2026-06-28 to 2026-07-01 (4 days)
    const summary = computeMemberPauseSummary(memberId, pauses, year, '2026-07-01');
    expect(summary.isPaused).toBe(true);
    expect(summary.pausedAt).toBe('2026-06-28');
    expect(summary.pausedDaysCount).toBe(4);
    expect(summary.pausedDaysElapsed).toBe(4);
    expect(summary.pausedDates).toEqual([
      '2026-06-28',
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
    ]);
  });

  it('combines multiple past and active pauses without duplicates', () => {
    const pauses: MemberPause[] = [
      {
        memberId,
        year,
        startDate: '2026-01-10',
        endDate: '2026-01-12', // 3 days
      },
      {
        memberId,
        year,
        startDate: '2026-11-01',
        endDate: null, // from Nov 1 to Nov 2 (2 days)
      },
      {
        memberId: 'm2', // different member
        year,
        startDate: '2026-05-01',
        endDate: null,
      },
    ];
    const summary = computeMemberPauseSummary(memberId, pauses, year, '2026-11-02');
    expect(summary.isPaused).toBe(true);
    expect(summary.pausedAt).toBe('2026-11-01');
    expect(summary.pausedDaysCount).toBe(5);
    expect(summary.pausedDaysElapsed).toBe(5);
    expect(summary.pausedDates).toContain('2026-01-10');
    expect(summary.pausedDates).toContain('2026-11-02');
  });
});
