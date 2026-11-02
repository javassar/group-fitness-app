import { describe, expect, it } from 'vitest';
import { buildReminderMessage } from './message.js';

describe('buildReminderMessage', () => {
  it('gives the Nobody text when loggedCount is 0 and memberCount is 5', () => {
    expect(buildReminderMessage(0, 5)).toEqual({
      title: 'Group Fitness',
      body: 'Nobody has logged today yet. Log yours.',
    });
  });

  it('gives the 2 of 5 text when loggedCount is 2 and memberCount is 5', () => {
    expect(buildReminderMessage(2, 5)).toEqual({
      title: 'Group Fitness',
      body: '2 of 5 have logged today. Log yours.',
    });
  });

  it('gives the Everyone else text when loggedCount is 4 and memberCount is 5', () => {
    expect(buildReminderMessage(4, 5)).toEqual({
      title: 'Group Fitness',
      body: 'Everyone else has logged today. Log yours.',
    });
  });

  it('gives the Nobody text when loggedCount is 0 and memberCount is 1', () => {
    expect(buildReminderMessage(0, 1)).toEqual({
      title: 'Group Fitness',
      body: 'Nobody has logged today yet. Log yours.',
    });
  });
});
