import { describe, expect, it } from 'vitest';
import { MockDataClient } from '../data/mockClient';
import {
  computeGoalStatus,
  computeRequiredWeeklyPace,
  describeGoal,
  describeGoalShort,
  formatRequiredWeeklyPace,
  formatWeeklyPace,
  goalStatusText,
  validateGoalInput,
} from './goals';

describe('validateGoalInput', () => {
  const year = 2027;

  it('validates days goal input', () => {
    expect(validateGoalInput('days', 0, year)).toBe('Days must be between 1 and 365.');
    expect(validateGoalInput('days', 366, year)).toBe('Days must be between 1 and 365.');
    expect(validateGoalInput('days', 1.5, year)).toBe('Enter a whole number.');
    expect(validateGoalInput('days', NaN, year)).toBe('Enter a whole number.');
    expect(validateGoalInput('days', 1, year)).toBeNull();
    expect(validateGoalInput('days', 365, year)).toBeNull();
  });

  it('validates percent goal input', () => {
    expect(validateGoalInput('percent', 0, year)).toBe('Percent must be between 1 and 100.');
    expect(validateGoalInput('percent', 101, year)).toBe('Percent must be between 1 and 100.');
    expect(validateGoalInput('percent', 1, year)).toBeNull();
    expect(validateGoalInput('percent', 100, year)).toBeNull();
  });

  it('allows days 366 for leap year 2028', () => {
    expect(validateGoalInput('days', 366, 2028)).toBeNull();
  });
});

describe('computeGoalStatus', () => {
  const year = 2027;

  it('returns not_started when daysCounted is 0', () => {
    expect(computeGoalStatus({ type: 'days', value: 200 }, year, 0, 0)).toEqual({
      state: 'not_started',
    });
  });

  it('handles days goal pace: 55 of 100 is on track with 0 days ahead', () => {
    expect(computeGoalStatus({ type: 'days', value: 200 }, year, 55, 100)).toEqual({
      state: 'on_track',
      daysAhead: 0,
    });
  });

  it('handles days goal pace: 54 of 100 is behind with 1 day behind', () => {
    expect(computeGoalStatus({ type: 'days', value: 200 }, year, 54, 100)).toEqual({
      state: 'behind',
      daysBehind: 1,
    });
  });

  it('handles percent goal pace: 5 of 10 for 50% is on track with 0 days ahead', () => {
    expect(computeGoalStatus({ type: 'percent', value: 50 }, year, 5, 10)).toEqual({
      state: 'on_track',
      daysAhead: 0,
    });
  });

  it('handles percent goal pace: 4 of 10 for 50% is behind with 1 day behind', () => {
    expect(computeGoalStatus({ type: 'percent', value: 50 }, year, 4, 10)).toEqual({
      state: 'behind',
      daysBehind: 1,
    });
  });

  it('handles percent goal pace: 20 of 30 for 50% is on track with 5 days ahead', () => {
    expect(computeGoalStatus({ type: 'percent', value: 50 }, year, 20, 30)).toEqual({
      state: 'on_track',
      daysAhead: 5,
    });
  });
});

describe('describeGoal', () => {
  const year = 2027;

  it('describes days goal', () => {
    expect(describeGoal({ type: 'days', value: 200 }, year)).toBe(
      '200 days (about 55% of the year)'
    );
  });

  it('describes percent goal', () => {
    expect(describeGoal({ type: 'percent', value: 60 }, year)).toBe(
      '60% of days (about 219 days)'
    );
  });
});

describe('describeGoalShort and goalStatusText', () => {
  it('formats describeGoalShort singular and plural forms for days', () => {
    expect(describeGoalShort({ type: 'days', value: 1 })).toBe('1 day');
    expect(describeGoalShort({ type: 'days', value: 2 })).toBe('2 days');
    expect(describeGoalShort({ type: 'percent', value: 50 })).toBe('50%');
  });

  it('formats goalStatusText for not_started', () => {
    expect(goalStatusText({ state: 'not_started' })).toBe(
      'Log today to start tracking your goal.'
    );
  });

  it('formats goalStatusText for on_track (0 days ahead)', () => {
    expect(goalStatusText({ state: 'on_track', daysAhead: 0 })).toBe('On track.');
  });

  it('formats goalStatusText for on_track with singular (1 day ahead) and plural (2 days ahead)', () => {
    expect(goalStatusText({ state: 'on_track', daysAhead: 1 })).toBe(
      'On track, 1 day ahead of pace.'
    );
    expect(goalStatusText({ state: 'on_track', daysAhead: 2 })).toBe(
      'On track, 2 days ahead of pace.'
    );
  });

  it('formats goalStatusText for behind', () => {
    expect(goalStatusText({ state: 'behind', daysBehind: 1 })).toBe('Behind pace.');
    expect(goalStatusText({ state: 'behind', daysBehind: 30 })).toBe('Behind pace.');
  });
});

describe('formatWeeklyPace', () => {
  const year = 2027; // 365 days

  it('calculates weekly pace for percentage goals', () => {
    expect(formatWeeklyPace({ type: 'percent', value: 75 }, year)).toBe('~5.3 days / wk');
    expect(formatWeeklyPace({ type: 'percent', value: 50 }, year)).toBe('~3.5 days / wk');
    expect(formatWeeklyPace({ type: 'percent', value: 100 }, year)).toBe('~7 days / wk');
    expect(formatWeeklyPace({ type: 'percent', value: 14 }, year)).toBe('~1 day / wk');
  });

  it('calculates weekly pace for days goals', () => {
    // 200 / 365 * 7 = 3.8356... -> 3.8
    expect(formatWeeklyPace({ type: 'days', value: 200 }, year)).toBe('~3.8 days / wk');
    // 52 / 365 * 7 = 0.997... -> 1
    expect(formatWeeklyPace({ type: 'days', value: 52 }, year)).toBe('~1 day / wk');
    // 365 / 365 * 7 = 7
    expect(formatWeeklyPace({ type: 'days', value: 365 }, year)).toBe('~7 days / wk');
  });
});

describe('computeRequiredWeeklyPace and formatRequiredWeeklyPace', () => {
  const year = 2026; // 365 days

  it('computes dynamic required pace accurately when feasible', () => {
    // 75% of 365 = round(273.75) = 274
    // 2026-11-02 is day 306. D_remaining = 365 - 306 = 59
    // workoutsCompleted = 220 -> W_needed = 274 - 220 = 54
    // Pace_required = (54 / 59) * 7 = 6.406779...
    const res = computeRequiredWeeklyPace({ type: 'percent', value: 75 }, year, 220, '2026-11-02');
    expect(res.workoutsGoal).toBe(274);
    expect(res.workoutsNeeded).toBe(54);
    expect(res.daysRemaining).toBe(59);
    expect(res.isUnfeasible).toBe(false);
    expect(formatRequiredWeeklyPace(res.paceRequired)).toBe('~6.4 days / wk');
  });

  it('detects unfeasible goals when required pace exceeds 7 days/wk', () => {
    // 75% of 365 = 274
    // On 2026-11-02 (day 306), D_remaining = 59
    // workoutsCompleted = 100 -> W_needed = 174
    // Pace_required = (174 / 59) * 7 = 20.64... > 7.0
    const res = computeRequiredWeeklyPace({ type: 'percent', value: 75 }, year, 100, '2026-11-02');
    expect(res.isUnfeasible).toBe(true);
    expect(res.workoutsNeeded).toBe(174);
    expect(formatRequiredWeeklyPace(res.paceRequired)).toBe('~20.6 days / wk');
  });

  it('handles days goals and returns 0.0 when goal is already reached', () => {
    // Goal 200 days. Completed 210.
    const res = computeRequiredWeeklyPace({ type: 'days', value: 200 }, year, 210, '2026-11-02');
    expect(res.workoutsNeeded).toBe(0);
    expect(res.isUnfeasible).toBe(false);
    expect(res.paceRequired).toBe(0);
    expect(formatRequiredWeeklyPace(res.paceRequired)).toBe('~0.0 days / wk');
  });

  it('handles the last day of the year without division by zero', () => {
    // 2026-12-31 is day 365. D_remaining = max(1, 365 - 365) = 1
    const res = computeRequiredWeeklyPace({ type: 'days', value: 200 }, year, 199, '2026-12-31');
    expect(res.daysRemaining).toBe(1);
    expect(res.workoutsNeeded).toBe(1);
    expect(res.paceRequired).toBe(7);
    expect(res.isUnfeasible).toBe(false);
    expect(formatRequiredWeeklyPace(res.paceRequired)).toBe('~7.0 days / wk');
  });

  it('adjusts required pace when user has been on pause', () => {
    // 50% goal in 365-day year
    // Without pause: W_goal = round(365 * 0.5) = 183
    // With 14 days pause: Effective Total Days = 351 -> W_goal = round(351 * 0.5) = 176
    // On 2026-07-02 (day 183), activeDaysElapsed = 183 - 14 = 169
    // daysRemaining = 351 - 169 = 182
    // If completed 90 workouts: W_needed = 176 - 90 = 86
    // Pace_required = (86 / 182) * 7 = 3.307...
    const res = computeRequiredWeeklyPace(
      { type: 'percent', value: 50 },
      year,
      90,
      '2026-07-02',
      14,
      14
    );
    expect(res.workoutsGoal).toBe(176);
    expect(res.workoutsNeeded).toBe(86);
    expect(res.daysRemaining).toBe(182);
    expect(formatRequiredWeeklyPace(res.paceRequired)).toBe('~3.3 days / wk');
  });
});

describe('MockDataClient goal storage and behavior', () => {
  it('manages goals, change tracking, and change logs correctly', async () => {
    const client = new MockDataClient('test');
    const year = 2027;

    // 1. Initial state has no goals
    const initialGoals = await client.getGoals(year);
    expect(initialGoals).toEqual([]);

    // 2. Setting first goal creates no change log entry
    await client.setGoal('m-jackie', year, { type: 'days', value: 200 });
    const afterFirst = await client.getGoals(year);
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]).toEqual({
      memberId: 'm-jackie',
      goal: { type: 'days', value: 200 },
      changeCount: 0,
    });

    const initialChanges = await client.getGoalChanges(year);
    expect(initialChanges).toEqual([]);

    // 3. Setting identical goal is a no-op
    await client.setGoal('m-jackie', year, { type: 'days', value: 200 });
    const afterSame = await client.getGoals(year);
    expect(afterSame[0].changeCount).toBe(0);
    const sameChanges = await client.getGoalChanges(year);
    expect(sameChanges).toEqual([]);

    // 4. Changing goal increments changeCount and creates a change log entry
    await client.setGoal('m-jackie', year, { type: 'percent', value: 60 });
    const afterChange = await client.getGoals(year);
    expect(afterChange[0]).toEqual({
      memberId: 'm-jackie',
      goal: { type: 'percent', value: 60 },
      changeCount: 1,
    });

    const changes = await client.getGoalChanges(year);
    expect(changes).toHaveLength(1);
    expect(changes[0].memberId).toBe('m-jackie');
    expect(changes[0].memberName).toBe('Jackie');
    expect(changes[0].oldGoal).toEqual({ type: 'days', value: 200 });
    expect(changes[0].newGoal).toEqual({ type: 'percent', value: 60 });
  });
});
