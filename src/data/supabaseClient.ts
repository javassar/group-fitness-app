import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  DataClient,
  DayLog,
  DayStatus,
  Goal,
  GoalChange,
  GoalType,
  GroupStatsRow,
  Member,
  MemberGoal,
  MemberPause,
} from './types';

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

// Module-level singleton to avoid creating multiple GoTrueClient instances
let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

function getSupabaseClient(url: string, key: string): SupabaseClient {
  const cacheKey = `${url}:${key}`;
  if (cachedClient && cachedKey === cacheKey) {
    return cachedClient;
  }
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  cachedKey = cacheKey;
  return cachedClient;
}

export class SupabaseDataClient implements DataClient {
  private client: SupabaseClient;
  private passcode: string;

  constructor(supabaseUrl: string, supabaseAnonKey: string, passcode: string) {
    this.passcode = passcode;
    // Auth is not used; sessions are disabled per SPEC section 6.3
    this.client = getSupabaseClient(supabaseUrl, supabaseAnonKey);
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
    const trimmedNote = note ? note.trim().slice(0, 200) : null;
    const { error } = await this.client.rpc('set_day_log', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_log_date: date,
      p_status: status,
      p_note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : null,
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

  async savePushSubscription(
    memberId: string,
    sub: { endpoint: string; p256dh: string; auth: string }
  ): Promise<void> {
    const { error } = await this.client.rpc('save_push_subscription', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_endpoint: sub.endpoint,
      p_p256dh_key: sub.p256dh,
      p_auth_key: sub.auth,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    const { error } = await this.client.rpc('remove_push_subscription', {
      p_passcode: this.passcode,
      p_endpoint: endpoint,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getReminderSettings(memberId: string): Promise<{ pausedUntil: string | null }> {
    const { data, error } = await this.client.rpc('get_reminder_settings', {
      p_passcode: this.passcode,
      p_member_id: memberId,
    });
    if (error) {
      throw new Error(error.message);
    }
    const row =
      Array.isArray(data) && data.length > 0
        ? (data[0] as { paused_until: string | null })
        : null;
    return { pausedUntil: row?.paused_until ?? null };
  }

  async setRemindersPausedUntil(memberId: string, date: string | null): Promise<void> {
    const { error } = await this.client.rpc('set_reminders_paused_until', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_paused_until: date,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getGoals(year: number): Promise<MemberGoal[]> {
    const { data, error } = await this.client.rpc('get_goals', {
      p_passcode: this.passcode,
      p_year: year,
    });
    if (error) {
      throw new Error(error.message);
    }
    interface GoalDbRow {
      member_id: string;
      goal_type: GoalType;
      goal_value: number;
      change_count: number;
    }
    return ((data as GoalDbRow[]) || []).map((row) => ({
      memberId: row.member_id,
      goal: {
        type: row.goal_type,
        value: Number(row.goal_value),
      },
      changeCount: Number(row.change_count),
    }));
  }

  async setGoal(memberId: string, year: number, goal: Goal): Promise<void> {
    const { error } = await this.client.rpc('set_goal', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_year: year,
      p_goal_type: goal.type,
      p_goal_value: goal.value,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getGoalChanges(year: number): Promise<GoalChange[]> {
    const { data, error } = await this.client.rpc('get_goal_changes', {
      p_passcode: this.passcode,
      p_year: year,
    });
    if (error) {
      throw new Error(error.message);
    }
    interface GoalChangeDbRow {
      member_id: string;
      member_name: string;
      old_goal_type: GoalType;
      old_goal_value: number;
      new_goal_type: GoalType;
      new_goal_value: number;
      changed_at: string;
    }
    return ((data as GoalChangeDbRow[]) || []).map((row) => ({
      memberId: row.member_id,
      memberName: row.member_name,
      oldGoal: {
        type: row.old_goal_type,
        value: Number(row.old_goal_value),
      },
      newGoal: {
        type: row.new_goal_type,
        value: Number(row.new_goal_value),
      },
      changedAt: row.changed_at,
    }));
  }

  async getMemberPauses(year: number): Promise<MemberPause[]> {
    const { data, error } = await this.client.rpc('get_member_pauses', {
      p_passcode: this.passcode,
      p_year: year,
    });
    if (error) {
      // Graceful fallback if table/function not yet run in Supabase
      return [];
    }
    interface MemberPauseDbRow {
      id: number;
      member_id: string;
      year: number;
      start_date: string;
      end_date: string | null;
    }
    return ((data as MemberPauseDbRow[]) || []).map((row) => ({
      id: Number(row.id),
      memberId: row.member_id,
      year: Number(row.year),
      startDate: row.start_date,
      endDate: row.end_date,
    }));
  }

  async setMemberPause(memberId: string, year: number, isPaused: boolean): Promise<void> {
    const { error } = await this.client.rpc('set_member_pause_state', {
      p_passcode: this.passcode,
      p_member_id: memberId,
      p_year: year,
      p_is_paused: isPaused,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}
