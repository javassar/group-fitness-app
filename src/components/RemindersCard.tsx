import type { ReminderUiState } from '../lib/reminderState';

interface RemindersCardProps {
  state: ReminderUiState;
  isDemo: boolean;
  isLoading: boolean;
  onTurnOn: () => Promise<void>;
  onTurnOff: () => Promise<void>;
  onSendTest?: () => Promise<void>;
}

export function RemindersCard({
  state,
  isDemo,
  isLoading,
  onTurnOn,
  onTurnOff,
  onSendTest,
}: RemindersCardProps) {
  if (isDemo) {
    return (
      <section className="settings-card" aria-label="Reminders on this device">
        <h2 className="settings-card-title">Reminders on this device</h2>
        <p className="settings-notice">Reminders are not available in demo mode.</p>
      </section>
    );
  }

  return (
    <section className="settings-card" aria-label="Reminders on this device">
      <h2 className="settings-card-title">Reminders on this device</h2>

      <div className="settings-section-body">
        {state === 'needs_install' && (
          <p className="settings-explanation">
            Reminders need the app on your Home Screen. In Safari, open the Share menu, choose Add to Home Screen, then open the app from your Home Screen and turn reminders on there. The installed app asks for the passcode and your name again.
          </p>
        )}

        {state === 'unsupported' && (
          <p className="settings-explanation">
            This browser does not support reminders.
          </p>
        )}

        {state === 'blocked' && (
          <p className="settings-explanation">
            Notifications are blocked for this app. Open the iPhone Settings app, find this app under Notifications, and allow them.
          </p>
        )}

        {state === 'off' && (
          <div className="reminders-action-group">
            <button
              type="button"
              className="btn-primary"
              onClick={onTurnOn}
              disabled={isLoading}
            >
              {isLoading ? 'Turning on...' : 'Turn on reminders'}
            </button>
          </div>
        )}

        {state === 'on' && (
          <div className="reminders-active-group">
            <p className="settings-status-on">Reminders are on for this device.</p>
            <div className="reminders-buttons-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={onSendTest}
                disabled={isLoading}
              >
                Send test notification
              </button>
              <button
                type="button"
                className="btn-text-danger"
                onClick={onTurnOff}
                disabled={isLoading}
              >
                {isLoading ? 'Turning off...' : 'Turn off reminders'}
              </button>
            </div>
          </div>
        )}

        <p className="settings-subtext">
          You get one reminder around 8pm on days you have not logged.
        </p>
      </div>
    </section>
  );
}
