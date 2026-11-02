import { isMockMode } from '../data';

export function SettingsScreen() {
  const isDemo = isMockMode();

  return (
    <div className="screen-content">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      <section className="settings-card" aria-label="Reminders on this device">
        <h2 className="settings-card-title">Reminders on this device</h2>

        {isDemo ? (
          <p className="settings-notice">Reminders are not available in demo mode.</p>
        ) : (
          <div className="settings-section-body">
            <p className="settings-explanation">
              Reminders need the app on your Home Screen. In Safari, open the Share menu, choose Add to Home Screen, then open the app from your Home Screen and turn reminders on there. The installed app asks for the passcode and your name again.
            </p>
            <p className="settings-subtext">
              You get one reminder around 8pm on days you have not logged.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
