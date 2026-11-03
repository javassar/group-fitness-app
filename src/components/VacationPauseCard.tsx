interface VacationPauseCardProps {
  isPaused: boolean;
  pausedAt: string | null;
  pausedDaysCount: number;
  isLoading: boolean;
  onTogglePause: () => Promise<void>;
}

export function VacationPauseCard({
  isPaused,
  pausedAt,
  pausedDaysCount,
  isLoading,
  onTogglePause,
}: VacationPauseCardProps) {
  return (
    <section className="settings-card" aria-label="Vacation or injury tracking pause">
      <h2 className="settings-card-title">Vacation / Injury Pause</h2>

      <div className="settings-section-body">
        <p className="settings-explanation">
          Freeze your tracking while away, sick, or injured. Paused days won't
          penalize your required weekly pace or count as missed workouts.
        </p>

        <div className="pause-card-status-block">
          <div className="pause-status-row">
            <span className="pause-status-label">Status:</span>
            {isPaused ? (
              <span className="pause-badge-active">
                Paused {pausedAt ? `since ${pausedAt}` : ''}
              </span>
            ) : (
              <span className="pause-badge-inactive">Active</span>
            )}
          </div>

          {pausedDaysCount > 0 && (
            <p className="pause-days-summary">
              {pausedDaysCount} day{pausedDaysCount === 1 ? '' : 's'} paused so far this year.
            </p>
          )}
        </div>

        <div className="settings-btn-row">
          <button
            type="button"
            className={isPaused ? 'btn-secondary' : 'btn-primary'}
            disabled={isLoading}
            onClick={onTogglePause}
          >
            {isLoading
              ? 'Updating...'
              : isPaused
              ? 'Resume Accountability'
              : 'Pause Accountability'}
          </button>
        </div>
      </div>
    </section>
  );
}
