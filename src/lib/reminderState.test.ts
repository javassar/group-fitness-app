import { describe, expect, it } from 'vitest';
import { getReminderUiState } from './reminderState';

describe('getReminderUiState', () => {
  it('returns needs_install when iOS and not standalone (even if unsupported)', () => {
    expect(
      getReminderUiState({
        supported: false,
        isIOS: true,
        isStandalone: false,
        permission: null,
        hasSubscription: false,
      })
    ).toBe('needs_install');

    expect(
      getReminderUiState({
        supported: true,
        isIOS: true,
        isStandalone: false,
        permission: 'granted',
        hasSubscription: true,
      })
    ).toBe('needs_install');
  });

  it('returns unsupported when not supported (and not an uninstalled iOS device)', () => {
    expect(
      getReminderUiState({
        supported: false,
        isIOS: false,
        isStandalone: false,
        permission: null,
        hasSubscription: false,
      })
    ).toBe('unsupported');
  });

  it('returns blocked when permission is denied', () => {
    expect(
      getReminderUiState({
        supported: true,
        isIOS: true,
        isStandalone: true,
        permission: 'denied',
        hasSubscription: false,
      })
    ).toBe('blocked');

    expect(
      getReminderUiState({
        supported: true,
        isIOS: false,
        isStandalone: false,
        permission: 'denied',
        hasSubscription: false,
      })
    ).toBe('blocked');
  });

  it('returns on when permission is granted and a subscription exists', () => {
    expect(
      getReminderUiState({
        supported: true,
        isIOS: true,
        isStandalone: true,
        permission: 'granted',
        hasSubscription: true,
      })
    ).toBe('on');
  });

  it('returns off when supported and not blocked or on', () => {
    // Permission default/prompt, no subscription
    expect(
      getReminderUiState({
        supported: true,
        isIOS: true,
        isStandalone: true,
        permission: 'default',
        hasSubscription: false,
      })
    ).toBe('off');

    // Permission granted, but no active subscription yet
    expect(
      getReminderUiState({
        supported: true,
        isIOS: true,
        isStandalone: true,
        permission: 'granted',
        hasSubscription: false,
      })
    ).toBe('off');
  });
});
