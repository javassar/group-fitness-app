export const PASSAGE =
  'Let me not to the marriage of true minds admit impediments. Love is not love which alters when it alteration finds, or bends with the remover to remove.';

export type TypedStatus = 'complete' | 'ok' | 'typo';

export function checkTyped(passage: string, typed: string): TypedStatus {
  if (typed === passage) {
    return 'complete';
  }
  if (passage.startsWith(typed)) {
    return 'ok';
  }
  return 'typo';
}
