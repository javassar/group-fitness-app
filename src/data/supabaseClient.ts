import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataClient, DayLog, DayStatus, GroupStatsRow, Member } from './types';

interface MemberRow {
  id: string;
  name: string;
  time_zone: string;
}

interface GroupStatsDbRow {
  member_id: string;
  name: string;
  time_zone: string;
  member_today: string;
  worked_out_before_today: number;
  today_status: string | null;
}

interface MemberLogDbRow {
  log_date: string;
  status: string;
  note: string | null;
}

export class SupabaseDataClient implements DataClient {
  private client: SupabaseClient;
  private passcode: string;

  constructor(supabaseUrl: string, supabaseAnonKey: string, passcode: string) {
    this.passcode = passcode;
    // Auth is not used; sessions are disabled per SPEC section 6.3
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  async checkPasscode(passcode: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('check_passcode', {
      p_passcode: passcode,
    });
    if (error) {
      throw new Error(error.message);
    }
    return Boolean(data);
  }

  async listMembers(): Promise<Member[]> {
    const { data, error } = await this.client.rpc('list_members', {
      p_passcode: this.passcode,
    });
    if (error) {
      throw new Error(error.message);
    }
    return ((data as MemberRow[]) || []).map((row) => ({
      id: row.id,
      name: row.name,
      timeZone: row.time_zone,
    }));
  }

  async setMemberTimeZone(memberId: string, timeZone: string): Promise<void> {
    const { error } = await this.client.rpc('set_member_time_zone', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_time_zone: timeZone,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getGroupStats(year: number): Promise<GroupStatsRow[]> {
    const { data, error } = await this.client.rpc('get_group_stats', {
      p_passcode: this.passcode,
      p_year: year,
    });
    if (error) {
      throw new Error(error.message);
    }
    return ((data as GroupStatsDbRow[]) || []).map((row) => ({
      memberId: row.member_id,
      name: row.name,
      timeZone: row.time_zone,
      memberToday: row.member_today,
      workedOutBeforeToday: Number(row.worked_out_before_today),
      todayStatus: (row.today_status as DayStatus) || null,
    }));
  }

  async getMemberLogs(memberId: string, year: number): Promise<DayLog[]> {
    const { data, error } = await this.client.rpc('get_member_logs', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_year: year,
    });
    if (error) {
      throw new Error(error.message);
    }
    return ((data as MemberLogDbRow[]) || []).map((row) => ({
      date: row.log_date,
      status: row.status as DayStatus,
      note: row.note,
    }));
  }

  async setDayLog(
    memberId: string,
    date: string,
    status: DayStatus,
    note: string | null
  ): Promise<void> {
    const { error } = await this.client.rpc('set_day_log', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_log_date: date,
      p_status: status,
      p_note: note,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async clearDayLog(memberId: string, date: string): Promise<void> {
    const { error } = await this.client.rpc('clear_day_log', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_log_date: date,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}
