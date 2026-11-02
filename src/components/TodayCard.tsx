import { useState } from 'react';
import confetti from 'canvas-confetti';
import type { DayLog, DayStatus } from '../data/types';
import { formatDateLong, getCurrentWeekDates } from '../lib/dates';
import { CheckIcon, XIcon } from './Icons';

interface TodayCardProps {
  todayDate: string;
  currentStatus: DayStatus | null;
  savedNote: string | null;
  memberLogs?: DayLog[];
  isSaving: boolean;
  onSave: (status: DayStatus, note: string | null) => Promise<void>;
  onClear: () => Promise<void>;
}

export function TodayCard({
  todayDate,
  currentStatus,
  savedNote,
  memberLogs = [],
  isSaving,
  onSave,
  onClear,
}: TodayCardProps) {
  const [note, setNote] = useState(savedNote ?? '');
  const [prevSavedNote, setPrevSavedNote] = useState(savedNote);

  // Sync state during render when savedNote prop changes from an external reload
  if (savedNote !== prevSavedNote) {
    setPrevSavedNote(savedNote);
    setNote(savedNote ?? '');
  }

  const handleStatusClick = async (status: DayStatus) => {
    if (isSaving) return;
    if (status === 'worked_out') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          // Ignore if vibration is blocked or unsupported on the device
        }
      }
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#AD2831', '#800E13', '#F5EBE6', '#D97706'],
          scalar: 0.9,
          ticks: 200,
          disableForReducedMotion: true,
        });
      } catch {
        // Ignore if confetti fails
      }
    }
    const sanitizedNote = note.trim().slice(0, 200);
    await onSave(status, sanitizedNote.length > 0 ? sanitizedNote : null);
  };

  const handleClear = async () => {
    if (isSaving) return;
    await onClear();
    setNote('');
  };

  const weekDays = getCurrentWeekDates(todayDate);
  const logsMap = new Map(memberLogs.map((l) => [l.date, l.status]));

  return (
    <section className="today-card" aria-label="Today log card">
      <div className="today-card-header">
        <h2 className="today-date-label">{formatDateLong(todayDate)}</h2>
      </div>

      <div className="week-tracker" role="region" aria-label="Current week workout activity">
        {weekDays.map((day) => {
          const isToday = day.date === todayDate;
          const isFuture = day.date > todayDate;
          const dayStatus = isToday ? currentStatus : (logsMap.get(day.date) ?? null);
          const isCompleted = dayStatus === 'worked_out';

          let dotClass = 'is-missed';
          let statusText = 'Not logged';

          if (isCompleted) {
            dotClass = 'is-completed';
            statusText = 'Worked out';
          } else if (isFuture) {
            dotClass = 'is-future';
            statusText = 'Upcoming';
          } else if (dayStatus === 'no_workout') {
            dotClass = 'is-missed';
            statusText = 'Rest day';
          }

          if (isToday) {
            statusText += ' (Today)';
          }

          return (
            <div
              key={day.date}
              className={`week-day-col ${isToday ? 'is-today' : ''}`}
              title={`${day.dayName}: ${statusText}`}
              aria-label={`${day.dayName}: ${statusText}`}
            >
              <span
                className={`week-dot ${dotClass} ${isToday && isCompleted ? 'today-pulse' : ''}`}
                aria-hidden="true"
              />
              <span className="week-day-label">{day.label}</span>
            </div>
          );
        })}
      </div>

      <div className="today-actions">
        <button
          type="button"
          className={`btn-choice btn-workout ${currentStatus === 'worked_out' ? 'is-selected' : ''}`}
          onClick={() => handleStatusClick('worked_out')}
          disabled={isSaving}
          aria-pressed={currentStatus === 'worked_out'}
        >
          <span className="btn-circle btn-workout-circle">
            <CheckIcon size={30} />
          </span>
          <span className="btn-choice-label">Worked out</span>
        </button>

        <button
          type="button"
          className={`btn-choice btn-no-workout ${currentStatus === 'no_workout' ? 'is-selected' : ''}`}
          onClick={() => handleStatusClick('no_workout')}
          disabled={isSaving}
          aria-pressed={currentStatus === 'no_workout'}
        >
          <span className="btn-circle btn-no-workout-circle">
            <XIcon size={30} />
          </span>
          <span className="btn-choice-label">No workout today</span>
        </button>
      </div>

      <div className="note-input-container">
        <label htmlFor="today-note-input" className="sr-only">
          What did you do? (optional)
        </label>
        <input
          id="today-note-input"
          type="text"
          className="note-input"
          placeholder="What did you do today? (optional)"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSaving}
        />
      </div>

      {currentStatus !== null && (
        <div className="today-clear-container">
          <button
            type="button"
            className="btn-clear-text"
            onClick={handleClear}
            disabled={isSaving}
          >
            Clear today's log
          </button>
        </div>
      )}
    </section>
  );
}
