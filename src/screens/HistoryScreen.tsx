import { useState } from 'react';
import type { DayLog, DayStatus, Member } from '../data/types';
import { formatDateShort, getDateRangeDescending } from '../lib/dates';
import { ArrowLeftIcon } from '../components/Icons';
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
    if (!isSelf) return;
    setExpandedDate((prev) => (prev === date ? null : date));
  };

  const handleSave = async (date: string, status: DayStatus, note: string | null) => {
    await onSaveDayLog(date, status, note);
  };

  const handleClear = async (date: string) => {
    await onClearDayLog(date);
  };

  return (
    <div className="screen-content">
      <div className="history-header">
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
          <h1 className="history-title">Your log</h1>
        )}

        <label className="filter-toggle-label">
          <input
            type="checkbox"
            className="filter-checkbox"
            checked={onlyUnlogged}
            onChange={(e) => setOnlyUnlogged(e.target.checked)}
          />
          <span>Only unlogged days</span>
        </label>
      </div>

      <div className="history-list" role="list">
        {displayedDates.length === 0 ? (
          <div className="empty-history-notice">
            {onlyUnlogged ? 'No unlogged days found!' : 'No entries to display.'}
          </div>
        ) : (
          displayedDates.map((date) => {
            const log = logsMap.get(date);
            const isExpanded = isSelf && expandedDate === date;

            let statusLabel = 'Not logged';
            let statusClass = 'status-not-logged';
            if (log?.status === 'worked_out') {
              statusLabel = 'Worked out';
              statusClass = 'status-worked-out';
            } else if (log?.status === 'no_workout') {
              statusLabel = 'No workout';
              statusClass = 'status-no-workout';
            }

            return (
              <div
                key={date}
                className={`history-row-container ${isExpanded ? 'is-expanded' : ''}`}
              >
                <button
                  type="button"
                  className={`history-row ${isSelf ? 'is-interactive' : 'is-readonly'}`}
                  onClick={() => handleRowClick(date)}
                  aria-expanded={isSelf ? isExpanded : undefined}
                  aria-label={`${formatDateShort(date)}: ${statusLabel}${log?.note ? `, note: ${log.note}` : ''}`}
                >
                  <div className="history-row-main">
                    <span className="history-date">{formatDateShort(date)}</span>
                    <span className={`status-chip ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {log?.note && (
                    <div className="history-row-note">
                      {log.note}
                    </div>
                  )}
                </button>

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
          })
        )}
      </div>
    </div>
  );
}
