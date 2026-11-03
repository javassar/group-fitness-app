import type { Goal } from '../data/types';
import {
  describeGoal,
  formatWeeklyPace,
  goalStatusText,
  type GoalStatus,
} from '../lib/goals';

interface GoalCardProps {
  goal: Goal;
  year: number;
  status: GoalStatus;
}

export function GoalCard({ goal, year, status }: GoalCardProps) {
  return (
    <section className="goal-card" aria-label={`${year} workout goal`}>
      <div className="goal-card-header">
        <span className="goal-card-title">{year} GOAL</span>
        <span className="goal-pace-badge">{formatWeeklyPace(goal, year)}</span>
      </div>

      <div className="goal-card-body">
        <p className="goal-card-desc">{describeGoal(goal, year)}</p>
        <p className="goal-card-status">{goalStatusText(status)}</p>
      </div>
    </section>
  );
}
