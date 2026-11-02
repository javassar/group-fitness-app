export type ReminderUiState = 'needs_install' | 'unsupported' | 'blocked' | 'off' | 'on';

export interface ReminderStateInput {
  supported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | null;
  hasSubscription: boolean;
}

export function getReminderUiState(input: ReminderStateInput): ReminderUiState {
  // On iOS, notifications require being installed to the Home Screen first
  if (input.isIOS && !input.isStandalone) {
    return 'needs_install';
  }

  // If the browser does not support Web Push / Service Workers
  if (!input.supported) {
    return 'unsupported';
  }

  // If the user previously denied notification permissions
  if (input.permission === 'denied') {
    return 'blocked';
  }

  // If permission is granted and an active push subscription exists
  if (input.permission === 'granted' && input.hasSubscription) {
    return 'on';
  }

  // Default state: reminders are off and ready to be turned on
  return 'off';
}
