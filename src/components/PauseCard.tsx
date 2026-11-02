import { useState } from 'react';
import { formatDateLong } from '../lib/dates';

interface PauseCardProps {
  pausedUntil: string | null;
  todayDate: string;
  isDemo: boolean;
  isLoading: boolean;
  onSetPausedUntil: (date: string | null) => Promise<void>;
}

export function PauseCard({
  pausedUntil,
  todayDate,
  isDemo,
  isLoading,
  onSetPausedUntil,
}: PauseCardProps) {
  const [selectedDate, setSelectedDate] = useState('');

  if (isDemo) {
    return null;
  }

  // A pause is active if pausedUntil is set and is on or after today
  const isPauseActive = pausedUntil !== null && pausedUntil >= todayDate;

  const handlePause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || isLoading) return;
    await onSetPausedUntil(selectedDate);
    setSelectedDate('');
  };

  const handleResume = async () => {
    if (isLoading) return;
    await onSetPausedUntil(null);
  };

  return (
    <section className="settings-card" aria-label="Pause reminders">
      <h2 className="settings-card-title">Pause reminders</h2>

      <div className="settings-section-body">
        {isPauseActive ? (
          <div className="pause-active-group">
            <p className="settings-status-paused">
              Paused through {formatDateLong(pausedUntil!)}
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResume}
              disabled={isLoading}
            >
              {isLoading ? 'Resuming...' : 'Resume now'}
            </button>
          </div>
        ) : (
          <form onSubmit={handlePause} className="pause-form">
            <label htmlFor="pause-until-input" className="form-label">
              Pause reminders through
            </label>
            <div className="pause-input-row">
              <input
                id="pause-until-input"
                type="date"
                className="text-input date-input"
                min={todayDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="submit"
                className="btn-primary btn-pause"
                disabled={isLoading || !selectedDate}
              >
                {isLoading ? 'Saving...' : 'Pause'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
