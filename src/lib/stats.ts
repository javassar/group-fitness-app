import type { GroupStatsRow } from '../data/types';
import { dayOfYear, daysInYear } from './dates';

export interface MemberStats {
  daysCounted: number;
  workoutDays: number;
  percent: number | null;
}

export function computeStats(
  year: number,
  row: GroupStatsRow,
  pausedDaysElapsed = 0
): MemberStats {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  let daysCounted: number;
  let workoutDays: number;

  if (row.memberToday < yearStart) {
    // Member's today is before the target year starts (future year)
    daysCounted = 0;
    workoutDays = 0;
  } else if (row.memberToday > yearEnd) {
    // Member's today is after the target year ends (past year)
    daysCounted = daysInYear(year);
    // todayStatus is ignored for past years because today is not within that year
    workoutDays = row.workedOutBeforeToday;
  } else {
    // Member's today is within the target year
    if (row.todayStatus !== null) {
      daysCounted = dayOfYear(row.memberToday);
    } else {
      daysCounted = dayOfYear(row.memberToday) - 1;
    }
    workoutDays = row.workedOutBeforeToday + (row.todayStatus === 'worked_out' ? 1 : 0);
  }

  const activeDaysCounted = Math.max(0, daysCounted - pausedDaysElapsed);
  const percent = activeDaysCounted === 0 ? null : workoutDays / activeDaysCounted;

  return {
    daysCounted: activeDaysCounted,
    workoutDays,
    percent,
  };
}
