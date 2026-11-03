import type { Goal, GoalType } from '../data/types';
import { dayOfYear, daysInYear } from './dates';

export const GOALS_START_YEAR = Number(import.meta.env.VITE_GOALS_START_YEAR ?? 2026);

export type GoalStatusState = 'not_started' | 'on_track' | 'behind';

export interface GoalStatus {
  state: GoalStatusState;
  daysAhead?: number;
  daysBehind?: number;
}

export function validateGoalInput(type: GoalType, value: number, year: number): string | null {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isInteger(value)) {
    return 'Enter a whole number.';
  }

  if (type === 'days') {
    const D = daysInYear(year);
    if (value < 1 || value > D) {
      return `Days must be between 1 and ${D}.`;
    }
  } else if (type === 'percent') {
    if (value < 1 || value > 100) {
      return 'Percent must be between 1 and 100.';
    }
  }

  return null;
}

export function computeGoalStatus(
  goal: Goal,
  year: number,
  workoutDays: number,
  daysCounted: number
): GoalStatus {
  if (daysCounted === 0) {
    return { state: 'not_started' };
  }

  const D = daysInYear(year);
  const den = goal.type === 'days' ? D : 100;
  const surplus = workoutDays * den - goal.value * daysCounted;

  if (surplus >= 0) {
    return {
      state: 'on_track',
      daysAhead: Math.floor(surplus / den),
    };
  }

  return {
    state: 'behind',
    daysBehind: Math.ceil(-surplus / den),
  };
}

export function describeGoal(goal: Goal, year: number): string {
  const D = daysInYear(year);
  if (goal.type === 'days') {
    const pct = Math.round((goal.value / D) * 100);
    return `${goal.value} days (about ${pct}% of the year)`;
  }
  const days = Math.ceil((goal.value * D) / 100);
  return `${goal.value}% of days (about ${days} days)`;
}

export function describeGoalShort(goal: Goal): string {
  if (goal.type === 'days') {
    return `${goal.value} ${goal.value === 1 ? 'day' : 'days'}`;
  }
  return `${goal.value}%`;
}

export function computeWeeklyPace(goal: Goal, year: number): number {
  if (goal.type === 'percent') {
    return (goal.value * 7) / 100;
  }
  return (goal.value / daysInYear(year)) * 7;
}

export function formatWeeklyPace(goal: Goal, year: number): string {
  const weekly = computeWeeklyPace(goal, year);
  const rounded = Math.round(weekly * 10) / 10;
  const numStr = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  const unit = rounded === 1 ? 'day / wk' : 'days / wk';
  return `~${numStr} ${unit}`;
}

export interface DynamicPaceResult {
  workoutsGoal: number;
  workoutsNeeded: number;
  daysRemaining: number;
  paceRequired: number;
  isUnfeasible: boolean;
}

export function computeRequiredWeeklyPace(
  goal: Goal,
  year: number,
  workoutsCompleted: number,
  todayDateStr: string,
  pausedDaysCount = 0,
  pausedDaysElapsed = 0
): DynamicPaceResult {
  const totalDaysInYear = daysInYear(year);
  const effectiveTotalDays = Math.max(1, totalDaysInYear - pausedDaysCount);
  const workoutsGoal =
    goal.type === 'days'
      ? goal.value
      : Math.round(effectiveTotalDays * (goal.value / 100));
  const workoutsNeeded = Math.max(0, workoutsGoal - workoutsCompleted);
  const currentDayOfYear = dayOfYear(todayDateStr);
  const activeDaysElapsed = Math.max(0, currentDayOfYear - pausedDaysElapsed);
  const daysRemaining = Math.max(1, effectiveTotalDays - activeDaysElapsed);
  const paceRequired = (workoutsNeeded / daysRemaining) * 7;
  const isUnfeasible = paceRequired > 7.0 || workoutsNeeded > daysRemaining;

  return {
    workoutsGoal,
    workoutsNeeded,
    daysRemaining,
    paceRequired,
    isUnfeasible,
  };
}

export function formatRequiredWeeklyPace(paceRequired: number): string {
  return `~${paceRequired.toFixed(1)} days / wk`;
}

export function goalStatusText(status: GoalStatus): string {
  if (status.state === 'not_started') {
    return 'Log today to start tracking your goal.';
  }
  if (status.state === 'on_track') {
    const ahead = status.daysAhead ?? 0;
    if (ahead >= 1) {
      return `On track, ${ahead} ${ahead === 1 ? 'day' : 'days'} ahead of pace.`;
    }
    return 'On track.';
  }
  if (status.state === 'behind') {
    return 'Behind pace.';
  }
  return '';
}
