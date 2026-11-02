import type { DataClient, DayLog, DayStatus, GroupStatsRow, Member } from './types';
import { deviceTimeZone, getDateRangeDescending, todayLocal } from '../lib/dates';

// Simple deterministic Linear Congruential Generator (LCG) pseudo-random function.
// Using a fixed seed guarantees identical fake data on every reload.
function createDeterministicRandom(seed: number) {
  let current = seed;
  return function (): number {
    current = (current * 9301 + 49297) % 233280;
    return current / 233280;
  };
}

const SAMPLE_NOTES_WORKOUT = ['run', 'lift', '5k run', 'yoga', 'walk', 'cycling', 'pilates', 'swim'];
const SAMPLE_NOTES_REST = ['rest day', 'sore', 'traveling', 'recovery'];

export class MockDataClient implements DataClient {
  private passcode: string;
  private members: Member[];
  // Key format: `${memberId}:${date}`
  private logs: Map<string, DayLog> = new Map();

  constructor(passcode: string) {
    this.passcode = passcode;
    const tz = deviceTimeZone();

    // Five members named as in supabase/seed.sql
    this.members = [
      { id: 'm-audrey', name: 'Audrey', timeZone: tz },
      { id: 'm-gray', name: 'Gray', timeZone: tz },
      { id: 'm-jack', name: 'Jack', timeZone: tz },
      { id: 'm-jackie', name: 'Jackie', timeZone: tz },
      { id: 'm-jan', name: 'Jan', timeZone: tz },
    ];

    this.seedMockData();
  }

  private seedMockData(): void {
    const today = todayLocal();
    const currentYear = parseInt(today.slice(0, 4), 10);
    const yearStart = `${currentYear}-01-01`;

    // Newest first list of all days in the current year up to today
    const allDaysSoFar = getDateRangeDescending(yearStart, today);
    // Cover the most recent 60 days or since January 1, whichever is shorter
    const daysToSeed = allDaysSoFar.slice(0, 60);

    const rand = createDeterministicRandom(42);

    for (const member of this.members) {
      for (const date of daysToSeed) {
        const roll = rand();
        if (roll < 0.55) {
          // ~55% worked_out
          const noteRoll = rand();
          const note =
            noteRoll < 0.3
              ? SAMPLE_NOTES_WORKOUT[Math.floor(rand() * SAMPLE_NOTES_WORKOUT.length)]
              : null;
          this.logs.set(`${member.id}:${date}`, {
            date,
            status: 'worked_out',
            note,
          });
        } else if (roll < 0.8) {
          // ~25% no_workout
          const noteRoll = rand();
          const note =
            noteRoll < 0.2
              ? SAMPLE_NOTES_REST[Math.floor(rand() * SAMPLE_NOTES_REST.length)]
              : null;
          this.logs.set(`${member.id}:${date}`, {
            date,
            status: 'no_workout',
            note,
          });
        }
        // Remaining ~20% are left unlogged (no entry in the map)
      }
    }
  }

  private assertPasscode(): void {
    if (this.passcode !== 'test') {
      throw new Error('invalid passcode');
    }
  }

  async checkPasscode(passcode: string): Promise<boolean> {
    return passcode === 'test';
  }

  async listMembers(): Promise<Member[]> {
    this.assertPasscode();
    return [...this.members].sort((a, b) => a.name.localeCompare(b.name));
  }

  async setMemberTimeZone(memberId: string, timeZone: string): Promise<void> {
    this.assertPasscode();
    const member = this.members.find((m) => m.id === memberId);
    if (member) {
      member.timeZone = timeZone;
    }
  }

  async getGroupStats(year: number): Promise<GroupStatsRow[]> {
    this.assertPasscode();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const rows: GroupStatsRow[] = this.members.map((member) => {
      const memberToday = todayLocal();

      let workedOutBeforeToday = 0;
      for (const [key, log] of this.logs.entries()) {
        if (!key.startsWith(`${member.id}:`)) continue;
        if (
          log.status === 'worked_out' &&
          log.date >= yearStart &&
          log.date <= yearEnd &&
          log.date < memberToday
        ) {
          workedOutBeforeToday++;
        }
      }

      let todayStatus: DayStatus | null = null;
      if (memberToday >= yearStart && memberToday <= yearEnd) {
        const todayLog = this.logs.get(`${member.id}:${memberToday}`);
        if (todayLog) {
          todayStatus = todayLog.status;
        }
      }

      return {
        memberId: member.id,
        name: member.name,
        timeZone: member.timeZone,
        memberToday,
        workedOutBeforeToday,
        todayStatus,
      };
    });

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getMemberLogs(memberId: string, year: number): Promise<DayLog[]> {
    this.assertPasscode();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const logs: DayLog[] = [];
    for (const [key, log] of this.logs.entries()) {
      if (key.startsWith(`${memberId}:`)) {
        if (log.date >= yearStart && log.date <= yearEnd) {
          logs.push({ ...log });
        }
      }
    }

    return logs.sort((a, b) => a.date.localeCompare(b.date));
  }

  async setDayLog(
    memberId: string,
    date: string,
    status: DayStatus,
    note: string | null
  ): Promise<void> {
    this.assertPasscode();
    const memberToday = todayLocal();
    const currentYear = memberToday.slice(0, 4);

    if (date > memberToday || date < `${currentYear}-01-01`) {
      throw new Error('date out of allowed range');
    }

    const trimmedNote = note ? note.trim() : null;
    this.logs.set(`${memberId}:${date}`, {
      date,
      status,
      note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : null,
    });
  }

  async clearDayLog(memberId: string, date: string): Promise<void> {
    this.assertPasscode();
    this.logs.delete(`${memberId}:${date}`);
  }
}
