// Data types and interfaces matching SPEC section 6.1

export type DayStatus = 'worked_out' | 'no_workout';

export interface Member {
  id: string;
  name: string;
  timeZone: string;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  note: string | null;
}

export interface GroupStatsRow {
  memberId: string;
  name: string;
  timeZone: string;
  memberToday: string; // member's local date, YYYY-MM-DD
  workedOutBeforeToday: number; // worked_out days in the year before memberToday
  todayStatus: DayStatus | null; // null if today is unlogged or memberToday is outside the year
}

export interface DataClient {
  checkPasscode(passcode: string): Promise<boolean>;
  listMembers(): Promise<Member[]>;
  setMemberTimeZone(memberId: string, timeZone: string): Promise<void>;
  getGroupStats(year: number): Promise<GroupStatsRow[]>;
  getMemberLogs(memberId: string, year: number): Promise<DayLog[]>;
  setDayLog(memberId: string, date: string, status: DayStatus, note: string | null): Promise<void>;
  clearDayLog(memberId: string, date: string): Promise<void>;
}
