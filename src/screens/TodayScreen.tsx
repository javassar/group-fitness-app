import type { DayLog, DayStatus, GroupStatsRow } from '../data/types';
import { InstallHint } from '../components/InstallHint';
import { StatsList } from '../components/StatsList';
import { TodayCard } from '../components/TodayCard';

interface TodayScreenProps {
  todayDate: string;
  currentYear: number;
  signedInMemberId: string;
  statsRows: GroupStatsRow[];
  todayLog: DayLog | null;
  unloggedCount: number;
  isSaving: boolean;
  showInstallHint: boolean;
  onDismissInstallHint: () => void;
  onReviewUnlogged: () => void;
  onSelectMember: (memberId: string) => void;
  onSaveToday: (status: DayStatus, note: string | null) => Promise<void>;
  onClearToday: () => Promise<void>;
}

export function TodayScreen({
  todayDate,
  currentYear,
  signedInMemberId,
  statsRows,
  todayLog,
  unloggedCount,
  isSaving,
  showInstallHint,
  onDismissInstallHint,
  onReviewUnlogged,
  onSelectMember,
  onSaveToday,
  onClearToday,
}: TodayScreenProps) {
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

      <StatsList
        rows={statsRows}
        currentYear={currentYear}
        signedInMemberId={signedInMemberId}
        onSelectMember={onSelectMember}
      />

      <TodayCard
        todayDate={todayDate}
        currentStatus={todayLog?.status ?? null}
        savedNote={todayLog?.note ?? null}
        isSaving={isSaving}
        onSave={onSaveToday}
        onClear={onClearToday}
      />
    </div>
  );
}
