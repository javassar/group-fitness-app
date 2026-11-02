interface InstallHintProps {
  onDismiss: () => void;
}

export function InstallHint({ onDismiss }: InstallHintProps) {
  return (
    <aside className="install-hint-banner" aria-label="Home Screen install instructions">
      <p className="install-hint-text">
        Add this app to your Home Screen to get reminders. In Safari, open the Share menu and choose Add to Home Screen. Menu names can vary slightly by iOS version.
      </p>
      <button
        type="button"
        className="btn-install-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss Home Screen install instructions"
      >
        Dismiss
      </button>
    </aside>
  );
}
