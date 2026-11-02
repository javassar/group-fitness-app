// Safe localStorage access helpers.
// All storage calls are wrapped in try/catch blocks so the app does not crash
// if localStorage is blocked by private browsing mode or storage quotas.

const KEY_PASSCODE = 'gfa.passcode';
const KEY_MEMBER_ID = 'gfa.memberId';

export function getStoredPasscode(): string | null {
  try {
    return localStorage.getItem(KEY_PASSCODE);
  } catch {
    return null;
  }
}

export function setStoredPasscode(passcode: string): void {
  try {
    localStorage.setItem(KEY_PASSCODE, passcode);
  } catch {
    // Ignore storage errors if private mode disables writes
  }
}

export function clearStoredPasscode(): void {
  try {
    localStorage.removeItem(KEY_PASSCODE);
  } catch {
    // Ignore storage errors
  }
}

export function getStoredMemberId(): string | null {
  try {
    return localStorage.getItem(KEY_MEMBER_ID);
  } catch {
    return null;
  }
}

export function setStoredMemberId(memberId: string): void {
  try {
    localStorage.setItem(KEY_MEMBER_ID, memberId);
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredMemberId(): void {
  try {
    localStorage.removeItem(KEY_MEMBER_ID);
  } catch {
    // Ignore storage errors
  }
}

export function clearAllAuth(): void {
  clearStoredPasscode();
  clearStoredMemberId();
}
