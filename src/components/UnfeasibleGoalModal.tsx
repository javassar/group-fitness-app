interface UnfeasibleGoalModalProps {
  onAdjustGoal: () => void;
  onDismiss: () => void;
}

export function UnfeasibleGoalModal({
  onAdjustGoal,
  onDismiss,
}: UnfeasibleGoalModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unfeasible-goal-title"
    >
      <div className="modal-card">
        <h2 id="unfeasible-goal-title" className="modal-title">
          Goal No Longer Achievable
        </h2>
        <p className="modal-message">
          Based on your progress and the days remaining this year, your goal now
          requires more than 7 workout days per week. Reset your goal to keep it
          realistic and achievable.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onAdjustGoal}
          >
            Adjust Goal
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
