// Date and time zone helper functions.
// All calendar arithmetic uses UTC methods to prevent off-by-one errors caused by local daylight saving transitions.

export function todayLocal(): string {
  // 'en-CA' outputs YYYY-MM-DD format using the browser's local time zone
  return new Date().toLocaleDateString('en-CA');
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map((val) => parseInt(val, 10));
  return { year: y, month: m, day: d };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function dayOfYear(dateStr: string): number {
  const { year, month, day } = parseDateParts(dateStr);
  // Pure UTC day subtraction prevents daylight saving time offset bugs
  const currentUtc = Date.UTC(year, month - 1, day);
  const startUtc = Date.UTC(year, 0, 1);
  return Math.round((currentUtc - startUtc) / 86400000) + 1;
}

export function getYesterday(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const yesterdayUtc = Date.UTC(year, month - 1, day) - 86400000;
  const d = new Date(yesterdayUtc);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

export function getDateRangeDescending(startDate: string, endDate: string): string[] {
  if (startDate > endDate) {
    return [];
  }
  const { year: sYear, month: sMonth, day: sDay } = parseDateParts(startDate);
  const { year: eYear, month: eMonth, day: eDay } = parseDateParts(endDate);
  let currentUtc = Date.UTC(eYear, eMonth - 1, eDay);
  const startUtc = Date.UTC(sYear, sMonth - 1, sDay);

  const dates: string[] = [];
  while (currentUtc >= startUtc) {
    const d = new Date(currentUtc);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    currentUtc -= 86400000;
  }
  return dates;
}

export function getUnloggedDates(
  year: number,
  memberToday: string,
  loggedDates: Set<string> | string[]
): string[] {
  const yearStart = `${year}-01-01`;
  const yesterday = getYesterday(memberToday);

  // If yesterday is prior to the start of the year (e.g. on Jan 1), there are no unlogged days yet
  if (yesterday < yearStart) {
    return [];
  }

  const yearEnd = `${year}-12-31`;
  const effectiveEnd = yesterday > yearEnd ? yearEnd : yesterday;

  if (effectiveEnd < yearStart) {
    return [];
  }

  const logSet = loggedDates instanceof Set ? loggedDates : new Set(loggedDates);
  const allDays = getDateRangeDescending(yearStart, effectiveEnd);
  return allDays.filter((date) => !logSet.has(date));
}

export function formatDateLong(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
