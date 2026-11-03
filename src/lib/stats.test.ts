import { describe, expect, it } from 'vitest';
import type { GroupStatsRow } from '../data/types';
import { computeStats } from './stats';

function makeRow(overrides: Partial<GroupStatsRow>): GroupStatsRow {
  return {
    memberId: 'm1',
    name: 'Jackie',
    timeZone: 'America/Los_Angeles',
    memberToday: '2027-01-01',
    workedOutBeforeToday: 0,
    todayStatus: null,
    ...overrides,
  };
}

describe('computeStats', () => {
  it('handles January 1, today unlogged: daysCounted 0, percent null', () => {
    const row = makeRow({
      memberToday: '2027-01-01',
      workedOutBeforeToday: 0,
      todayStatus: null,
    });
    const stats = computeStats(2027, row);
    expect(stats.daysCounted).toBe(0);
    expect(stats.workoutDays).toBe(0);
    expect(stats.percent).toBeNull();
  });

  it('handles January 1, today worked_out: 1 of 1, 100 percent', () => {
    const row = makeRow({
      memberToday: '2027-01-01',
      workedOutBeforeToday: 0,
      todayStatus: 'worked_out',
    });
    const stats = computeStats(2027, row);
    expect(stats.daysCounted).toBe(1);
    expect(stats.workoutDays).toBe(1);
    expect(stats.percent).toBe(1.0);
  });

  it('handles March 1, 2027 (non-leap), today unlogged, workedOutBeforeToday 30: daysCounted 59', () => {
    const row = makeRow({
      memberToday: '2027-03-01',
      workedOutBeforeToday: 30,
      todayStatus: null,
    });
    const stats = computeStats(2027, row);
    // 2027-03-01 is day 60; unlogged today subtracts 1 = 59 days counted
    expect(stats.daysCounted).toBe(59);
    expect(stats.workoutDays).toBe(30);
    expect(stats.percent).toBeCloseTo(30 / 59, 5);
  });

  it('handles March 1, 2028 (leap year), today unlogged: daysCounted 60', () => {
    const row = makeRow({
      memberToday: '2028-03-01',
      workedOutBeforeToday: 25,
      todayStatus: null,
    });
    const stats = computeStats(2028, row);
    // In leap year 2028, 2028-03-01 is day 61; unlogged today subtracts 1 = 60 days counted
    expect(stats.daysCounted).toBe(60);
    expect(stats.workoutDays).toBe(25);
    expect(stats.percent).toBeCloseTo(25 / 60, 5);
  });

  it('handles today no_workout: day counted, workout not counted', () => {
    const row = makeRow({
      memberToday: '2027-01-05',
      workedOutBeforeToday: 2,
      todayStatus: 'no_workout',
    });
    const stats = computeStats(2027, row);
    // Day 5 of the year is counted because it was logged
    expect(stats.daysCounted).toBe(5);
    // workoutDays does not increase
    expect(stats.workoutDays).toBe(2);
    expect(stats.percent).toBeCloseTo(2 / 5, 5);
  });

  it('handles past year (memberToday in following year): daysCounted equals days in that year and todayStatus is ignored', () => {
    const row = makeRow({
      memberToday: '2028-01-15',
      workedOutBeforeToday: 180,
      todayStatus: 'worked_out', // should be ignored for past year
    });
    // Target year 2027 had 365 days
    const stats = computeStats(2027, row);
    expect(stats.daysCounted).toBe(365);
    expect(stats.workoutDays).toBe(180);
    expect(stats.percent).toBeCloseTo(180 / 365, 5);
  });

  it('handles future year: daysCounted 0, percent null', () => {
    const row = makeRow({
      memberToday: '2027-06-01',
      workedOutBeforeToday: 0,
      todayStatus: null,
    });
    const stats = computeStats(2028, row);
    expect(stats.daysCounted).toBe(0);
    expect(stats.workoutDays).toBe(0);
    expect(stats.percent).toBeNull();
  });

  it('subtracts paused days from daysCounted when calculating percentage', () => {
    const row = makeRow({
      memberToday: '2027-03-01', // day 60, unlogged -> 59 calendar days
      workedOutBeforeToday: 30,
      todayStatus: null,
    });
    // With 9 paused days elapsed, daysCounted becomes 59 - 9 = 50
    const stats = computeStats(2027, row, 9);
    expect(stats.daysCounted).toBe(50);
    expect(stats.workoutDays).toBe(30);
    expect(stats.percent).toBe(0.6); // 30 / 50 = 60%
  });
});
