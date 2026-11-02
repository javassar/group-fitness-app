import { useState } from 'react';
import type { DayStatus } from '../data/types';
import { formatDateLong } from '../lib/dates';
import { CheckIcon, XIcon } from './Icons';

interface TodayCardProps {
  todayDate: string;
  currentStatus: DayStatus | null;
  savedNote: string | null;
  isSaving: boolean;
  onSave: (status: DayStatus, note: string | null) => Promise<void>;
  onClear: () => Promise<void>;
}

export function TodayCard({
  todayDate,
  currentStatus,
  savedNote,
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
    const sanitizedNote = note.trim().slice(0, 200);
    await onSave(status, sanitizedNote.length > 0 ? sanitizedNote : null);
  };

  const handleClear = async () => {
    if (isSaving) return;
    await onClear();
    setNote('');
  };

  return (
    <section className="today-card" aria-label="Today log card">
      <h2 className="today-date-label">{formatDateLong(todayDate)}</h2>

      <div className="today-actions">
        <button
          type="button"
          className={`btn-choice btn-workout ${currentStatus === 'worked_out' ? 'is-selected' : ''}`}
          onClick={() => handleStatusClick('worked_out')}
          disabled={isSaving}
          aria-pressed={currentStatus === 'worked_out'}
        >
          <span className="btn-circle btn-workout-circle">
            <CheckIcon size={32} />
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
            <XIcon size={32} />
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
          placeholder="What did you do? (optional)"
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
