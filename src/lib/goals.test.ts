import { describe, expect, it } from 'vitest';
import {
  computeGoalStatus,
  describeGoal,
  describeGoalShort,
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

  it('formats goalStatusText for behind with singular (1 day behind) and plural (2 days behind)', () => {
    expect(goalStatusText({ state: 'behind', daysBehind: 1 })).toBe(
      'Behind pace. 1 more workout day to catch up.'
    );
    expect(goalStatusText({ state: 'behind', daysBehind: 2 })).toBe(
      'Behind pace. 2 more workout days to catch up.'
    );
  });
});
