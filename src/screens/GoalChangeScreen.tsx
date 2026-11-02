import { useState } from 'react';
import type { Goal, GoalType } from '../data/types';
import { daysInYear } from '../lib/dates';
import { validateGoalInput } from '../lib/goals';
import { checkTyped, PASSAGE } from '../lib/passage';

interface GoalChangeScreenProps {
  currentGoal: Goal;
  year: number;
  onSaveGoal: (goal: Goal) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  errorMessage?: string | null;
}

export function GoalChangeScreen({
  currentGoal,
  year,
  onSaveGoal,
  onCancel,
  isSaving,
  errorMessage,
}: GoalChangeScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Typed friction passage state
  const [typed, setTyped] = useState('');
  const [typoMessage, setTypoMessage] = useState<string | null>(null);

  // Step 2: New goal selection state
  const [goalType, setGoalType] = useState<GoalType>(currentGoal.type);
  const [valueStr, setValueStr] = useState(String(currentGoal.value));
  const [hasTypedStep2, setHasTypedStep2] = useState(false);

  const D = daysInYear(year);

  // Step 1 text change handler
  const handleTypingChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;

    if (typoMessage) {
      setTypoMessage(null);
    }

    const status = checkTyped(PASSAGE, nextVal);
    if (status === 'typo') {
      setTyped('');
      setTypoMessage('That did not match. Start again from the beginning.');
    } else if (status === 'complete') {
      setTyped(nextVal);
      setStep(2);
    } else {
      setTyped(nextVal);
    }
  };

  // Step 2 validation
  const trimmed = valueStr.trim();
  const numValue = trimmed === '' ? NaN : Number(trimmed);
  const validationError = hasTypedStep2 ? validateGoalInput(goalType, numValue, year) : null;
  const isValid = trimmed !== '' && validateGoalInput(goalType, numValue, year) === null;
  const isUnchanged = goalType === currentGoal.type && numValue === currentGoal.value;
  const canSave = isValid && !isUnchanged && !isSaving;

  // Live helper line for step 2
  let liveHelper = '';
  if (isValid) {
    if (goalType === 'days') {
      const pct = Math.round((numValue / D) * 100);
      liveHelper = `That is about ${pct}% of the year.`;
    } else {
      const days = Math.ceil((numValue * D) / 100);
      liveHelper = `That is about ${days} days.`;
    }
  }

  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await onSaveGoal({
      type: goalType,
      value: numValue,
    });
  };

  return (
    <div className="screen-center">
      <div className="screen-card goal-change-card">
        <header className="goal-change-top-bar">
          <button
            type="button"
            className="btn-text-link goal-change-cancel-btn"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </header>

        {step === 1 ? (
          <div className="goal-friction-box">
            <h1 className="screen-title">Change your goal</h1>
            <p className="screen-subtitle">
              To change your goal, type this passage exactly. One mistake and you start over.
            </p>

            <div className="passage-block" aria-label="Passage to type">
              <p className="passage-text">{PASSAGE}</p>
            </div>

            <div className="form-group">
              <label htmlFor="passage-textarea" className="sr-only">
                Type the passage here
              </label>
              <textarea
                id="passage-textarea"
                className="input-field passage-textarea"
                rows={4}
                value={typed}
                onChange={handleTypingChange}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoComplete="off"
                placeholder="Start typing the passage here..."
                autoFocus
              />

              <div className="passage-meta">
                <span className="passage-counter">
                  {typed.length} of {PASSAGE.length} characters
                </span>
              </div>

              {typoMessage && (
                <p className="form-error typo-message" role="alert">
                  {typoMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="goal-edit-box">
            <h1 className="screen-title">Set your new goal</h1>
            <p className="screen-subtitle">
              Choose your updated target for {year}.
            </p>

            <form onSubmit={handleSaveClick} className="goal-setup-form">
              <div className="segmented-control" role="group" aria-label="Goal unit">
                <button
                  type="button"
                  className={`segmented-btn ${goalType === 'days' ? 'active' : ''}`}
                  onClick={() => {
                    setGoalType('days');
                    setHasTypedStep2(true);
                  }}
                >
                  Days
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${goalType === 'percent' ? 'active' : ''}`}
                  onClick={() => {
                    setGoalType('percent');
                    setHasTypedStep2(true);
                  }}
                >
                  Percent of days
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="new-goal-input" className="sr-only">
                  {goalType === 'days' ? 'Number of days' : 'Percent of days'}
                </label>
                <input
                  id="new-goal-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input-field goal-input"
                  value={valueStr}
                  onChange={(e) => {
                    setValueStr(e.target.value);
                    setHasTypedStep2(true);
                  }}
                  autoFocus
                />

                {liveHelper && <p className="goal-helper-text">{liveHelper}</p>}
                {validationError && (
                  <p className="form-error goal-validation-error">{validationError}</p>
                )}
                {isUnchanged && !validationError && (
                  <p className="goal-helper-text muted-note">
                    Goal is unchanged. Enter a different number to save.
                  </p>
                )}
              </div>

              {errorMessage && <p className="form-error">{errorMessage}</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={!canSave}
              >
                {isSaving ? 'Saving...' : 'Save new goal'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
