import type { MemberPause } from '../data/types';

export interface MemberPauseSummary {
  isPaused: boolean;
  pausedAt: string | null;
  pausedDates: string[];
  pausedDaysCount: number;
  pausedDaysElapsed: number;
}

/**
 * Enumerates all dates between startStr and endStr inclusive in YYYY-MM-DD format using UTC.
 */
export function enumerateDateRange(startStr: string, endStr: string): string[] {
  if (startStr > endStr) return [];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const dates: string[] = [];

  while (cur <= endUtc) {
    const d = new Date(cur);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    cur += 86400000;
  }

  return dates;
}

/**
 * Computes the pause state and paused dates for a member in a given year.
 */
export function computeMemberPauseSummary(
  memberId: string,
  allPauses: MemberPause[],
  year: number,
  todayDateStr: string
): MemberPauseSummary {
  const memberPauses = allPauses.filter(
    (p) => p.memberId === memberId && p.year === year
  );

  const activePause = memberPauses.find((p) => p.endDate === null);
  const isPaused = Boolean(activePause);
  const pausedAt = activePause ? activePause.startDate : null;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const pausedDateSet = new Set<string>();

  for (const p of memberPauses) {
    const effectiveStart = p.startDate < yearStart ? yearStart : p.startDate;
    const effectiveEnd = p.endDate ? p.endDate : todayDateStr;
    const clampedEnd = effectiveEnd > yearEnd ? yearEnd : effectiveEnd;

    if (effectiveStart <= clampedEnd) {
      const dates = enumerateDateRange(effectiveStart, clampedEnd);
      for (const d of dates) {
        pausedDateSet.add(d);
      }
    }
  }

  const pausedDates = Array.from(pausedDateSet).sort();
  const pausedDaysCount = pausedDates.length;
  const pausedDaysElapsed = pausedDates.filter((d) => d <= todayDateStr).length;

  return {
    isPaused,
    pausedAt,
    pausedDates,
    pausedDaysCount,
    pausedDaysElapsed,
  };
}
