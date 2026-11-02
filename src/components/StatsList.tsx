import type { GroupStatsRow } from '../data/types';
import { computeStats } from '../lib/stats';
import { CheckIcon, XIcon } from './Icons';

interface StatsListProps {
  rows: GroupStatsRow[];
  currentYear: number;
  signedInMemberId: string;
  onSelectMember: (memberId: string) => void;
}

export function StatsList({
  rows,
  currentYear,
  signedInMemberId,
  onSelectMember,
}: StatsListProps) {
  // Compute stats for each row and sort: percent descending (null last, ties by name)
  const items = rows.map((row) => ({
    row,
    stats: computeStats(currentYear, row),
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
      {items.map(({ row, stats }) => {
        const isCurrentMember = row.memberId === signedInMemberId;
        const percentDisplay =
          stats.percent !== null ? `${Math.round(stats.percent * 100)}%` : '\u2013';
        const progressWidth = stats.percent !== null ? Math.round(stats.percent * 100) : 0;

        return (
          <button
            key={row.memberId}
            type="button"
            className={`stats-row ${isCurrentMember ? 'is-self' : ''}`}
            onClick={() => onSelectMember(row.memberId)}
            aria-label={`${row.name}: ${percentDisplay}, ${stats.workoutDays} of ${stats.daysCounted} days logged${isCurrentMember ? ' (you)' : ''}`}
          >
            <div className="stats-row-header">
              <div className="stats-row-name-group">
                <span className="stats-name">{row.name}</span>
                {row.todayStatus === 'worked_out' && (
                  <span className="status-badge worked" title="Worked out today" aria-label="Worked out today">
                    <CheckIcon size={14} />
                  </span>
                )}
                {row.todayStatus === 'no_workout' && (
                  <span className="status-badge rest" title="No workout today" aria-label="No workout today">
                    <XIcon size={14} />
                  </span>
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
              <span>
                {stats.workoutDays} of {stats.daysCounted} days
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
