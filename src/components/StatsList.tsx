import type { GroupStatsRow, MemberGoal } from '../data/types';
import { describeGoalShort, GOALS_START_YEAR } from '../lib/goals';
import { computeStats } from '../lib/stats';

interface StatsListProps {
  rows: GroupStatsRow[];
  currentYear: number;
  signedInMemberId: string;
  memberGoals?: MemberGoal[];
  onSelectMember: (memberId: string) => void;
}

export function StatsList({
  rows,
  currentYear,
  signedInMemberId,
  memberGoals,
  onSelectMember,
}: StatsListProps) {
  // Compute stats for each row and sort: percent descending (null last, ties by name)
  const items = rows.map((row) => ({
    row,
    stats: computeStats(currentYear, row),
    goal: memberGoals?.find((g) => g.memberId === row.memberId),
  }));

  items.sort((a, b) => {
    // The signed-in user is always displayed first at the top
    if (a.row.memberId === signedInMemberId) return -1;
    if (b.row.memberId === signedInMemberId) return 1;

    if (a.stats.percent === null && b.stats.percent === null) {
      return a.row.name.localeCompare(b.row.name);
    }
    if (a.stats.percent === null) return 1;
    if (b.stats.percent === null) return -1;
    if (b.stats.percent !== a.stats.percent) {
      return b.stats.percent - a.stats.percent;
    }
    return a.row.name.localeCompare(b.row.name);
  });

  return (
    <div className="stats-list" role="region" aria-label="Group workout statistics">
      {items.map(({ row, stats, goal }) => {
        const isCurrentMember = row.memberId === signedInMemberId;
        const percentDisplay =
          stats.percent !== null ? `${Math.round(stats.percent * 100)}%` : '–';
        const progressWidth =
          stats.percent !== null
            ? stats.workoutDays > 0
              ? Math.max(Math.round(stats.percent * 100), 2)
              : 0
            : 0;

        return (
          <button
            key={row.memberId}
            type="button"
            className={`stats-row ${isCurrentMember ? 'is-self' : ''}`}
            onClick={() => onSelectMember(row.memberId)}
            aria-label={`${row.name}: ${percentDisplay}, ${stats.workoutDays} of ${stats.daysCounted} days logged${isCurrentMember ? ' (you)' : ''}`}
          >
            <div className="stats-row-header">
              <div className="stats-row-name-block">
                <div className="stats-row-name-group">
                  <span className="stats-name">{row.name}</span>
                  {isCurrentMember && <span className="stats-you-badge">YOU</span>}
                  {row.todayStatus === 'worked_out' && (
                    <span
                      className="status-dot worked"
                      title="Worked out today"
                      aria-label="Worked out today"
                    />
                  )}
                  {row.todayStatus === 'no_workout' && (
                    <span
                      className="status-dot rest"
                      title="No workout today"
                      aria-label="No workout today"
                    />
                  )}
                </div>
                {currentYear >= GOALS_START_YEAR && (
                  <div className="stats-goal-text">
                    {goal ? (
                      <>
                        Goal: {describeGoalShort(goal.goal)}
                        {goal.changeCount >= 1 &&
                          ` (changed ${goal.changeCount} ${goal.changeCount === 1 ? 'time' : 'times'})`}
                      </>
                    ) : (
                      'No goal set yet'
                    )}
                  </div>
                )}
              </div>
              <span className="stats-percent">{percentDisplay}</span>
            </div>

            <div className="progress-bar-track" aria-hidden="true">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <div className="stats-row-sub">
              <span className="stats-sub-count">{stats.workoutDays}</span>
              <span className="stats-sub-total"> / {stats.daysCounted} days</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
