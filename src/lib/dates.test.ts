import { describe, expect, it } from 'vitest';
import { dayOfYear, getCurrentWeekDates, getDateRangeDescending, getUnloggedDates } from './dates';

describe('dates helper functions', () => {
  describe('dayOfYear', () => {
    it('calculates correct day of year for key boundary dates', () => {
      // 2027 is a non-leap year (365 days)
      expect(dayOfYear('2027-01-01')).toBe(1);
      // Jan (31) + Feb (28) = 59 days before March 1, so March 1 is day 60
      expect(dayOfYear('2027-03-01')).toBe(60);
      expect(dayOfYear('2027-12-31')).toBe(365);

      // 2028 is a leap year (366 days, Feb has 29 days)
      // Jan (31) + Feb (29) = 60 days before March 1, so March 1 is day 61
      expect(dayOfYear('2028-03-01')).toBe(61);
    });
  });

  describe('getDateRangeDescending', () => {
    it('returns exactly 60 entries without duplicates across March daylight saving change', () => {
      const range = getDateRangeDescending('2027-01-01', '2027-03-01');
      expect(range.length).toBe(60);
      expect(range[0]).toBe('2027-03-01');
      expect(range[range.length - 1]).toBe('2027-01-01');

      // Verify no duplicates
      const uniqueDates = new Set(range);
      expect(uniqueDates.size).toBe(60);

      // Verify consecutive descending order
      for (let i = 0; i < range.length - 1; i++) {
        expect(range[i] > range[i + 1]).toBe(true);
      }
    });
  });

  describe('getUnloggedDates', () => {
    it('returns an empty list on January 1', () => {
      const unlogged = getUnloggedDates(2027, '2027-01-01', new Set());
      expect(unlogged).toEqual([]);
    });

    it('excludes today and excludes logged days', () => {
      // On March 5, 2027, yesterday is March 4. Days to consider: March 1, 2, 3, 4.
      // Suppose March 1 and March 3 are logged.
      const logged = new Set(['2027-03-01', '2027-03-03']);
      const unlogged = getUnloggedDates(2027, '2027-03-05', logged);

      // Unlogged days should be March 4 and March 2, plus all prior unlogged days of the year
      expect(unlogged).toContain('2027-03-04');
      expect(unlogged).toContain('2027-03-02');
      expect(unlogged).not.toContain('2027-03-01');
      expect(unlogged).not.toContain('2027-03-03');
      // Today (2027-03-05) must not be included
      expect(unlogged).not.toContain('2027-03-05');
    });
  });

  describe('getCurrentWeekDates', () => {
    it('returns Monday through Sunday for a Wednesday', () => {
      // 2026-11-04 is a Wednesday
      const week = getCurrentWeekDates('2026-11-04');
      expect(week.length).toBe(7);
      expect(week[0]).toEqual({ date: '2026-11-02', label: 'M', dayName: 'Monday' });
      expect(week[1]).toEqual({ date: '2026-11-03', label: 'T', dayName: 'Tuesday' });
      expect(week[2]).toEqual({ date: '2026-11-04', label: 'W', dayName: 'Wednesday' });
      expect(week[3]).toEqual({ date: '2026-11-05', label: 'T', dayName: 'Thursday' });
      expect(week[4]).toEqual({ date: '2026-11-06', label: 'F', dayName: 'Friday' });
      expect(week[5]).toEqual({ date: '2026-11-07', label: 'S', dayName: 'Saturday' });
      expect(week[6]).toEqual({ date: '2026-11-08', label: 'S', dayName: 'Sunday' });
    });

    it('returns the same week whether evaluated on Monday or Sunday', () => {
      const fromMonday = getCurrentWeekDates('2026-11-02');
      const fromSunday = getCurrentWeekDates('2026-11-08');
      expect(fromMonday).toEqual(fromSunday);
    });
  });
});
