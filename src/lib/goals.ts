import type { Goal, GoalType } from '../data/types';
import { daysInYear } from './dates';

export const GOALS_START_YEAR = Number(import.meta.env.VITE_GOALS_START_YEAR ?? 2027);

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
    const behind = status.daysBehind ?? 0;
    return `Behind pace. ${behind} more workout ${behind === 1 ? 'day' : 'days'} to catch up.`;
  }
  return '';
}
