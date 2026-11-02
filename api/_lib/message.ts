export interface ReminderMessage {
  title: string;
  body: string;
}

export function buildReminderMessage(loggedCount: number, memberCount: number): ReminderMessage {
  const title = 'Group Fitness';

  if (loggedCount === 0) {
    return {
      title,
      body: 'Nobody has logged today yet. Log yours.',
    };
  }

  if (loggedCount >= memberCount - 1) {
    return {
      title,
      body: 'Everyone else has logged today. Log yours.',
    };
  }

  return {
    title,
    body: `${loggedCount} of ${memberCount} have logged today. Log yours.`,
  };
}
