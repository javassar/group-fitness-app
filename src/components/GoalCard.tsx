import type { Goal } from '../data/types';
import { describeGoal, goalStatusText, type GoalStatus } from '../lib/goals';

interface GoalCardProps {
  goal: Goal;
  year: number;
  status: GoalStatus;
  onChangeGoal?: () => void;
}

export function GoalCard({ goal, year, status, onChangeGoal }: GoalCardProps) {
  return (
    <section className="goal-card" aria-label={`${year} workout goal`}>
      <div className="goal-card-header">
        <span className="goal-card-title">{year} GOAL</span>
        <button
          type="button"
          className="btn-text-link goal-card-change-btn"
          onClick={onChangeGoal}
        >
          Change goal
        </button>
      </div>

      <div className="goal-card-body">
        <p className="goal-card-desc">{describeGoal(goal, year)}</p>
        <p className="goal-card-status">{goalStatusText(status)}</p>
      </div>
    </section>
  );
}
