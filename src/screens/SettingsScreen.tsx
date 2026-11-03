import { useCallback, useEffect, useState } from 'react';
import type { DataClient, Goal } from '../data/types';
import { isMockMode } from '../data';
import { describeGoal, GOALS_START_YEAR } from '../lib/goals';
import { isIOS, isPushSupported, isStandalone } from '../lib/platform';
import {
  extractSubscriptionKeys,
  getExistingSubscription,
  sendTestNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/push';
import { getReminderUiState, type ReminderUiState } from '../lib/reminderState';
import { RemindersCard } from '../components/RemindersCard';
import { PauseCard } from '../components/PauseCard';

interface SettingsScreenProps {
  client: DataClient;
  signedInMemberId: string;
  passcode: string;
  todayDate: string;
  currentGoal?: Goal | null;
  currentYear?: number;
  onChangeGoal?: () => void;
}

export function SettingsScreen({
  client,
  signedInMemberId,
  passcode,
  todayDate,
  currentGoal,
  currentYear,
  onChangeGoal,
}: SettingsScreenProps) {
  const isDemo = isMockMode();
  const [reminderState, setReminderState] = useState<ReminderUiState>('off');
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

  // Resolve current permission and subscription state
  const refreshState = useCallback(async () => {
    const supported = isPushSupported();
    const ios = isIOS();
    const standalone = isStandalone();
    const permission = typeof Notification !== 'undefined' ? Notification.permission : null;

    let sub: PushSubscription | null = null;
    if (supported) {
      sub = await getExistingSubscription();
    }

    const state = getReminderUiState({
      supported,
      isIOS: ios,
      isStandalone: standalone,
      permission,
      hasSubscription: sub !== null,
    });
    setReminderState(state);

    // Silent upsert if permission granted and subscription exists
    if (!isDemo && permission === 'granted' && sub) {
      try {
        const keys = extractSubscriptionKeys(sub);
        await client.savePushSubscription(signedInMemberId, keys);
      } catch {
        // Silently ignore background sync failures
      }
    }

    // Load pause settings
    if (!isDemo) {
      try {
        const settings = await client.getReminderSettings(signedInMemberId);
        setPausedUntil(settings.pausedUntil);
      } catch {
        // Silently ignore
      }
    }
  }, [client, signedInMemberId, isDemo]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleTurnOn = async () => {
    if (!vapidPublicKey) {
      setErrorMessage('Missing public VAPID key in environment variables.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const sub = await subscribeToPush(vapidPublicKey);
      const keys = extractSubscriptionKeys(sub);
      await client.savePushSubscription(signedInMemberId, keys);
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      await refreshState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnOff = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTestMessage(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await client.removePushSubscription(endpoint);
      }
      await refreshState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestMessage(null);
    try {
      await sendTestNotification(passcode, signedInMemberId);
      setTestMessage({
        type: 'success',
        text: 'Sent. It should arrive in a few seconds.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSetPausedUntil = async (date: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await client.setRemindersPausedUntil(signedInMemberId, date);
      setPausedUntil(date);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen-content">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      {errorMessage && (
        <div className="toast-error" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="btn-text-link"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {currentYear !== undefined && currentYear >= GOALS_START_YEAR && currentGoal && (
        <section className="settings-card" aria-label="Yearly goal settings">
          <h2 className="settings-card-title">{currentYear} Goal</h2>
          <div className="settings-section-body">
            <p className="settings-explanation">
              Your goal is currently set to <strong>{describeGoal(currentGoal, currentYear)}</strong>.
            </p>
            <div className="settings-btn-row">
              <button
                type="button"
                className="btn-primary"
                onClick={onChangeGoal}
              >
                Change Goal
              </button>
            </div>
          </div>
        </section>
      )}

      <RemindersCard
        state={reminderState}
        isDemo={isDemo}
        isLoading={isLoading}
        isSendingTest={isSendingTest}
        testMessage={testMessage}
        onTurnOn={handleTurnOn}
        onTurnOff={handleTurnOff}
        onSendTest={handleSendTest}
      />

      <PauseCard
        pausedUntil={pausedUntil}
        todayDate={todayDate}
        isDemo={isDemo}
        isLoading={isLoading}
        onSetPausedUntil={handleSetPausedUntil}
      />
    </div>
  );
}
