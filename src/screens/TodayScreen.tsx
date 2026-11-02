import type { DayLog, DayStatus, GroupStatsRow, MemberGoal } from '../data/types';
import { GoalCard } from '../components/GoalCard';
import { InstallHint } from '../components/InstallHint';
import { StatsList } from '../components/StatsList';
import { TodayCard } from '../components/TodayCard';
import { computeGoalStatus, GOALS_START_YEAR } from '../lib/goals';
import { computeStats } from '../lib/stats';

interface TodayScreenProps {
  todayDate: string;
  currentYear: number;
  signedInMemberId: string;
  statsRows: GroupStatsRow[];
  todayLog: DayLog | null;
  memberLogs: DayLog[];
  unloggedCount: number;
  isSaving: boolean;
  showInstallHint: boolean;
  memberGoals?: MemberGoal[];
  onDismissInstallHint: () => void;
  onReviewUnlogged: () => void;
  onSelectMember: (memberId: string) => void;
  onSaveToday: (status: DayStatus, note: string | null) => Promise<void>;
  onClearToday: () => Promise<void>;
  onOpenGoalChange?: () => void;
}

export function TodayScreen({
  todayDate,
  currentYear,
  signedInMemberId,
  statsRows,
  todayLog,
  memberLogs,
  unloggedCount,
  isSaving,
  showInstallHint,
  memberGoals,
  onDismissInstallHint,
  onReviewUnlogged,
  onSelectMember,
  onSaveToday,
  onClearToday,
  onOpenGoalChange,
}: TodayScreenProps) {
  const signedInGoal = memberGoals?.find((g) => g.memberId === signedInMemberId);
  const signedInRow = statsRows.find((r) => r.memberId === signedInMemberId);
  const signedInStats = signedInRow ? computeStats(currentYear, signedInRow) : null;
  const goalStatus =
    signedInGoal && signedInStats
      ? computeGoalStatus(
          signedInGoal.goal,
          currentYear,
          signedInStats.workoutDays,
          signedInStats.daysCounted
        )
      : { state: 'not_started' as const };

  return (
    <div className="screen-content">
      {showInstallHint && <InstallHint onDismiss={onDismissInstallHint} />}

      {unloggedCount > 0 && (
        <aside className="unlogged-banner" aria-label="Unlogged days notice">
          <span className="unlogged-banner-text">
            {unloggedCount} unlogged day{unloggedCount === 1 ? '' : 's'} this year
          </span>
          <button
            type="button"
            className="btn-review"
            onClick={onReviewUnlogged}
          >
            Review
          </button>
        </aside>
      )}

      <TodayCard
        todayDate={todayDate}
        currentStatus={todayLog?.status ?? null}
        savedNote={todayLog?.note ?? null}
        memberLogs={memberLogs}
        isSaving={isSaving}
        onSave={onSaveToday}
        onClear={onClearToday}
      />

      {currentYear >= GOALS_START_YEAR && signedInGoal && (
        <GoalCard
          goal={signedInGoal.goal}
          year={currentYear}
          status={goalStatus}
          onChangeGoal={onOpenGoalChange}
        />
      )}

      <StatsList
        rows={statsRows}
        currentYear={currentYear}
        signedInMemberId={signedInMemberId}
        memberGoals={memberGoals}
        onSelectMember={onSelectMember}
      />
    </div>
  );
}
