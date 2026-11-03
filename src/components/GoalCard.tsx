import type { Goal } from '../data/types';
import {
  describeGoal,
  formatRequiredWeeklyPace,
  formatWeeklyPace,
  goalStatusText,
  type GoalStatus,
} from '../lib/goals';

interface GoalCardProps {
  goal: Goal;
  year: number;
  status: GoalStatus;
  requiredPace?: number;
}

export function GoalCard({ goal, year, status, requiredPace }: GoalCardProps) {
  const paceText =
    requiredPace !== undefined
      ? formatRequiredWeeklyPace(requiredPace)
      : formatWeeklyPace(goal, year);

  return (
    <section className="goal-card" aria-label={`${year} workout goal`}>
      <div className="goal-card-header">
        <span className="goal-card-title">{year} GOAL</span>
        <span className="goal-pace-badge">{paceText}</span>
      </div>

      <div className="goal-card-body">
        <p className="goal-card-desc">{describeGoal(goal, year)}</p>
        <p className="goal-card-status">{goalStatusText(status)}</p>
      </div>
    </section>
  );
}
