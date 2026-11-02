import { useState } from 'react';
import type { Goal, GoalType } from '../data/types';
import { daysInYear } from '../lib/dates';
import { describeGoal, validateGoalInput } from '../lib/goals';

interface GoalSetupScreenProps {
  year: number;
  onSaveGoal: (goal: Goal) => Promise<void>;
  isSaving: boolean;
  errorMessage?: string | null;
}

export function GoalSetupScreen({
  year,
  onSaveGoal,
  isSaving,
  errorMessage,
}: GoalSetupScreenProps) {
  const [goalType, setGoalType] = useState<GoalType>('days');
  const [valueStr, setValueStr] = useState('');
  const [hasTyped, setHasTyped] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const D = daysInYear(year);
  const trimmed = valueStr.trim();
  const numValue = trimmed === '' ? NaN : Number(trimmed);
  const validationError = hasTyped ? validateGoalInput(goalType, numValue, year) : null;
  const isValid = trimmed !== '' && validateGoalInput(goalType, numValue, year) === null;

  // Live helper line when input is valid
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

  const handleSetGoalClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      setIsConfirming(true);
    }
  };

  const handleConfirm = async () => {
    if (!isValid || isSaving) return;
    await onSaveGoal({
      type: goalType,
      value: numValue,
    });
  };

  const pendingGoal: Goal = {
    type: goalType,
    value: isValid ? numValue : 0,
  };

  return (
    <div className="screen-center">
      <div className="screen-card goal-setup-card">
        {!isConfirming ? (
          <>
            <h1 className="screen-title">Set your {year} goal</h1>
            <p className="screen-subtitle">
              Choose how many days you will work out this year, or what percent of
              days. You can change it later, but it takes effort and the group sees
              every change.
            </p>

            <form onSubmit={handleSetGoalClick} className="goal-setup-form">
              <div className="segmented-control" role="group" aria-label="Goal unit">
                <button
                  type="button"
                  className={`segmented-btn ${goalType === 'days' ? 'active' : ''}`}
                  onClick={() => {
                    setGoalType('days');
                  }}
                >
                  Days
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${goalType === 'percent' ? 'active' : ''}`}
                  onClick={() => {
                    setGoalType('percent');
                  }}
                >
                  Percent of days
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="goal-input" className="sr-only">
                  {goalType === 'days' ? 'Number of days' : 'Percent of days'}
                </label>
                <input
                  id="goal-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input-field goal-input"
                  placeholder={goalType === 'days' ? 'e.g. 180' : 'e.g. 50'}
                  value={valueStr}
                  onChange={(e) => {
                    setValueStr(e.target.value);
                    setHasTyped(true);
                  }}
                  autoFocus
                />

                {liveHelper && <p className="goal-helper-text">{liveHelper}</p>}
                {validationError && (
                  <p className="form-error goal-validation-error">{validationError}</p>
                )}
              </div>

              {errorMessage && <p className="form-error">{errorMessage}</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={!isValid || isSaving}
              >
                Set goal
              </button>
            </form>
          </>
        ) : (
          <div className="goal-confirm-box">
            <h1 className="screen-title">Confirm your goal</h1>
            <p className="screen-subtitle">
              Your {year} goal will be{' '}
              <strong>{describeGoal(pendingGoal, year)}</strong>. Changing it later
              means typing a passage with no mistakes.
            </p>

            {errorMessage && <p className="form-error">{errorMessage}</p>}

            <div className="goal-confirm-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={isSaving}
                onClick={handleConfirm}
              >
                {isSaving ? 'Saving...' : 'Confirm goal'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isSaving}
                onClick={() => setIsConfirming(false)}
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
