import { describe, expect, it } from 'vitest';
import { checkTyped, PASSAGE } from './passage';

describe('checkTyped', () => {
  it('returns ok for an empty string', () => {
    expect(checkTyped(PASSAGE, '')).toBe('ok');
  });

  it('returns ok for a correct prefix', () => {
    expect(checkTyped(PASSAGE, 'Let me not')).toBe('ok');
  });

  it('returns typo for a wrong character', () => {
    expect(checkTyped(PASSAGE, 'Let me x')).toBe('typo');
  });

  it('returns typo for a case difference', () => {
    expect(checkTyped(PASSAGE, 'let me not')).toBe('typo');
  });

  it('returns complete for the full passage', () => {
    expect(checkTyped(PASSAGE, PASSAGE)).toBe('complete');
  });

  it('returns typo for the full passage plus an extra character', () => {
    expect(checkTyped(PASSAGE, `${PASSAGE} `)).toBe('typo');
  });
});
