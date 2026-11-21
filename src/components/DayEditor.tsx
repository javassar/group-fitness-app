import { useState } from 'react';
import type { DayStatus } from '../data/types';

interface DayEditorProps {
  date: string;
  currentStatus: DayStatus | null;
  initialNote: string | null;
  isSaving: boolean;
  onSave: (status: DayStatus, note: string | null) => Promise<void>;
  onClear: () => Promise<void>;
}

export function DayEditor({
  date,
  currentStatus,
  initialNote,
  isSaving,
  onSave,
  onClear,
}: DayEditorProps) {
  const [note, setNote] = useState(initialNote ?? '');
  const [prevInitialNote, setPrevInitialNote] = useState(initialNote);

  // Sync state during render when initialNote prop changes from an external reload
  if (initialNote !== prevInitialNote) {
    setPrevInitialNote(initialNote);
    setNote(initialNote ?? '');
  }

  const handleSave = async (status: DayStatus) => {
    if (isSaving) return;
    const sanitizedNote = note.trim().slice(0, 200);
    await onSave(status, sanitizedNote.length > 0 ? sanitizedNote : null);
  };

  const trimmedNote = note.trim().slice(0, 200);
  const currentSaved = (initialNote ?? '').trim();
  const isDirty = trimmedNote !== currentSaved;

  // Can save note if:
  // 1. Status is already set and note has changed from what was saved (including clearing), OR
  // 2. Status is not set yet, but user has typed a note (will save as 'worked_out')
  const canSaveNote =
    !isSaving &&
    ((currentStatus !== null && isDirty) ||
      (currentStatus === null && trimmedNote.length > 0));

  const handleSaveNote = async () => {
    if (!canSaveNote) return;
    const targetStatus: DayStatus = currentStatus ?? 'worked_out';
    await onSave(targetStatus, trimmedNote.length > 0 ? trimmedNote : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNote();
    }
  };

  let saveButtonLabel = 'Save';
  let isSavedState = false;
  if (isSaving) {
    saveButtonLabel = 'Saving';
  } else if (currentStatus !== null && !isDirty && initialNote !== null) {
    saveButtonLabel = 'Saved';
    isSavedState = true;
  }

  const handleClear = async () => {
    if (isSaving) return;
    await onClear();
    setNote('');
  };

  return (
    <div className="day-editor" onClick={(e) => e.stopPropagation()}>
      <div className="note-input-container">
        <label htmlFor={`note-input-${date}`} className="sr-only">
          Note for {date}
        </label>
        <input
          id={`note-input-${date}`}
          type="text"
          className="note-input inline-note-input"
          placeholder="What did you do? (optional)"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
        />
        <button
          type="button"
          className={`btn-note-save ${isSavedState ? 'is-saved' : ''}`}
          onClick={handleSaveNote}
          disabled={!canSaveNote}
          aria-label={saveButtonLabel}
        >
          {saveButtonLabel}
        </button>
      </div>

      <div className="day-editor-actions">
        <button
          type="button"
          className={`btn-editor-action ${currentStatus === 'worked_out' ? 'is-selected' : ''}`}
          onClick={() => handleSave('worked_out')}
          disabled={isSaving}
          aria-pressed={currentStatus === 'worked_out'}
        >
          Worked out
        </button>

        <button
          type="button"
          className={`btn-editor-action ${currentStatus === 'no_workout' ? 'is-selected' : ''}`}
          onClick={() => handleSave('no_workout')}
          disabled={isSaving}
          aria-pressed={currentStatus === 'no_workout'}
        >
          No workout
        </button>

        <button
          type="button"
          className="btn-editor-action btn-editor-clear"
          onClick={handleClear}
          disabled={isSaving || currentStatus === null}
          aria-label={`Clear log for ${date}`}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
