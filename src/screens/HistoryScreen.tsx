import { useState } from 'react';
import type { DayLog, DayStatus, Member } from '../data/types';
import { formatDateShort, getDateRangeDescending } from '../lib/dates';
import { ArrowLeftIcon, CheckIcon } from '../components/Icons';
import { DayEditor } from '../components/DayEditor';

interface HistoryScreenProps {
  currentYear: number;
  todayDate: string;
  viewingMember: Member;
  signedInMemberId: string;
  logs: DayLog[];
  isSaving: boolean;
  initialOnlyUnlogged?: boolean;
  onBackToSelf: () => void;
  onSaveDayLog: (date: string, status: DayStatus, note: string | null) => Promise<void>;
  onClearDayLog: (date: string) => Promise<void>;
}

export function HistoryScreen({
  currentYear,
  todayDate,
  viewingMember,
  signedInMemberId,
  logs,
  isSaving,
  initialOnlyUnlogged = false,
  onBackToSelf,
  onSaveDayLog,
  onClearDayLog,
}: HistoryScreenProps) {
  const [onlyUnlogged, setOnlyUnlogged] = useState(initialOnlyUnlogged);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const isSelf = viewingMember.id === signedInMemberId;

  // Build a fast lookup map for logs: date -> DayLog
  const logsMap = new Map<string, DayLog>();
  for (const log of logs) {
    logsMap.set(log.date, log);
  }

  // All dates from today back to January 1 of the current year, newest first
  const yearStart = `${currentYear}-01-01`;
  const allDates = getDateRangeDescending(yearStart, todayDate);

  // Filter dates if "Only unlogged days" is active
  const displayedDates = onlyUnlogged
    ? allDates.filter((date) => !logsMap.has(date))
    : allDates;

  const handleRowClick = (date: string) => {
    if (!isSelf || isSaving) return;
    setExpandedDate((prev) => (prev === date ? null : date));
  };

  const handleSave = async (date: string, status: DayStatus, note: string | null) => {
    await onSaveDayLog(date, status, note);
  };

  const handleClear = async (date: string) => {
    await onClearDayLog(date);
  };

  interface MonthGroup {
    monthKey: string;
    monthTitle: string;
    monthLoggedCount: number;
    dates: string[];
  }

  // Group displayed dates into chronological monthly sections (newest first)
  const monthGroups: MonthGroup[] = [];
  let currentGroup: MonthGroup | null = null;

  for (const date of displayedDates) {
    const monthKey = date.slice(0, 7); // "YYYY-MM"
    if (!currentGroup || currentGroup.monthKey !== monthKey) {
      const [yStr, mStr] = monthKey.split('-');
      const yearNum = parseInt(yStr, 10);
      const monthNum = parseInt(mStr, 10);
      const monthTitle = new Date(Date.UTC(yearNum, monthNum - 1, 1))
        .toLocaleDateString('en-US', {
          timeZone: 'UTC',
          month: 'long',
          year: 'numeric',
        })
        .toUpperCase();

      const monthLoggedCount = logs.filter(
        (l) => l.date.startsWith(monthKey) && l.status === 'worked_out'
      ).length;

      currentGroup = {
        monthKey,
        monthTitle,
        monthLoggedCount,
        dates: [],
      };
      monthGroups.push(currentGroup);
    }
    currentGroup.dates.push(date);
  }

  return (
    <div className="screen-content">
      <div className="history-header">
        <div className="history-header-top">
          {!isSelf ? (
            <div className="history-nav-back">
              <button
                type="button"
                className="btn-back"
                onClick={onBackToSelf}
                aria-label="Back to your log"
              >
                <ArrowLeftIcon size={18} />
                <span>Back</span>
              </button>
              <h1 className="history-title">{viewingMember.name}&apos;s log</h1>
            </div>
          ) : (
            <h1 className="history-title">Training log</h1>
          )}

          <button
            type="button"
            className={`filter-pill-btn ${onlyUnlogged ? 'is-active' : ''}`}
            onClick={() => setOnlyUnlogged((prev) => !prev)}
            aria-pressed={onlyUnlogged}
          >
            <span>Only unlogged</span>
          </button>
        </div>
      </div>

      {displayedDates.length === 0 ? (
        <div className="history-ledger" role="list">
          <div className="empty-history-notice">
            {onlyUnlogged ? 'No unlogged days found!' : 'No entries to display.'}
          </div>
        </div>
      ) : (
        monthGroups.map((group) => (
          <section key={group.monthKey} className="history-month-section" aria-label={group.monthTitle}>
            <div className="ledger-summary-header">
              <span className="ledger-summary-title">{group.monthTitle}</span>
              <span className="ledger-summary-sub">{group.monthLoggedCount} logged</span>
            </div>

            <div className="history-ledger" role="list">
              {group.dates.map((date) => {
                const log = logsMap.get(date);
                const isExpanded = isSelf && expandedDate === date;
                const isWorkedOut = log?.status === 'worked_out';
                const isNoWorkout = log?.status === 'no_workout';

                return (
                  <div
                    key={date}
                    className={`ledger-item-container ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    <button
                      type="button"
                      className={`ledger-row ${isSelf ? 'is-interactive' : 'is-readonly'}`}
                      onClick={() => handleRowClick(date)}
                      aria-expanded={isSelf ? isExpanded : undefined}
                      aria-label={`${formatDateShort(date)}: ${isWorkedOut ? 'Logged' : isNoWorkout ? 'Rest' : 'Unlogged'}${log?.note ? `, note: ${log.note}` : ''}`}
                    >
                      <div className="ledger-row-left">
                        <span
                          className={`ledger-dot ${isWorkedOut ? 'is-logged' : isNoWorkout ? 'is-rest' : 'is-unlogged'}`}
                          aria-hidden="true"
                        />
                        <span className="ledger-date">{formatDateShort(date)}</span>
                      </div>

                      <div className="ledger-row-right">
                        {isWorkedOut && (
                          <span className="ledger-badge is-logged">
                            <CheckIcon size={13} />
                            <span>Logged</span>
                          </span>
                        )}
                        {isNoWorkout && (
                          <span className="ledger-badge is-rest">Rest</span>
                        )}
                        {!log && (
                          <span className="ledger-unlogged-dash">—</span>
                        )}
                      </div>
                    </button>

                    {log?.note && (
                      <div className="ledger-row-note">{log.note}</div>
                    )}

                    {isExpanded && (
                      <DayEditor
                        date={date}
                        currentStatus={log?.status ?? null}
                        initialNote={log?.note ?? null}
                        isSaving={isSaving}
                        onSave={(status, note) => handleSave(date, status, note)}
                        onClear={() => handleClear(date)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
