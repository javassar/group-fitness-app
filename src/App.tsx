import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataClient, DayLog, DayStatus, GroupStatsRow, Member } from './data/types';
import { createDataClient, isMockMode } from './data';
import { deviceTimeZone, getUnloggedDates, todayLocal } from './lib/dates';
import { isIOS, isStandalone } from './lib/platform';
import { unsubscribeFromPush } from './lib/push';
import {
  clearAllAuth,
  clearStoredMemberId,
  getStoredInstallHintDismissed,
  getStoredMemberId,
  getStoredPasscode,
  setStoredInstallHintDismissed,
} from './lib/storage';
import { PasscodeScreen } from './screens/PasscodeScreen';
import { NamePickerScreen } from './screens/NamePickerScreen';
import { TodayScreen } from './screens/TodayScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TabBar, type TabType } from './components/TabBar';

export function App() {
  const [passcode, setPasscode] = useState<string | null>(() => getStoredPasscode());
  const [memberId, setMemberId] = useState<string | null>(() => getStoredMemberId());

  // Active DataClient instance based on the passcode
  const [client, setClient] = useState<DataClient>(() =>
    createDataClient(passcode ?? '')
  );

  const [members, setMembers] = useState<Member[]>([]);
  const [statsRows, setStatsRows] = useState<GroupStatsRow[]>([]);
  const [memberLogs, setMemberLogs] = useState<DayLog[]>([]);
  const [viewingMemberLogs, setViewingMemberLogs] = useState<DayLog[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [historyViewingMemberId, setHistoryViewingMemberId] = useState<string | null>(null);
  const [historyInitialOnlyUnlogged, setHistoryInitialOnlyUnlogged] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [installHintDismissed, setInstallHintDismissed] = useState(() =>
    getStoredInstallHintDismissed()
  );

  const showInstallHint = isIOS() && !isStandalone() && !installHintDismissed;

  const handleDismissInstallHint = () => {
    setStoredInstallHintDismissed();
    setInstallHintDismissed(true);
  };

  // Track the current local day to detect midnight day rollover
  const [currentDate, setCurrentDate] = useState(() => todayLocal());
  const currentDateRef = useRef(currentDate);

  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  const currentYear = parseInt(currentDate.slice(0, 4), 10);

  // Update DataClient whenever passcode changes
  const handlePasscodeChange = (newPasscode: string) => {
    setPasscode(newPasscode);
    setClient(createDataClient(newPasscode));
  };

  const handleAuthError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('invalid passcode')) {
      clearAllAuth();
      setPasscode(null);
      setMemberId(null);
      setErrorMessage(null);
      return true;
    }
    return false;
  }, []);

  // Main data loader
  const loadData = useCallback(async () => {
    if (!passcode) {
      setIsLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      // 1. Fetch member list
      const memberList = await client.listMembers();
      setMembers(memberList);

      // If stored memberId is invalid or not in memberList, clear it
      const currentStoredId = getStoredMemberId();
      if (currentStoredId && !memberList.some((m) => m.id === currentStoredId)) {
        clearStoredMemberId();
        setMemberId(null);
        setIsLoading(false);
        return;
      }

      if (!memberId) {
        setIsLoading(false);
        return;
      }

      // Check time zone sync for signed-in member
      const signedInMember = memberList.find((m) => m.id === memberId);
      const localTz = deviceTimeZone();
      if (signedInMember && signedInMember.timeZone !== localTz) {
        await client.setMemberTimeZone(signedInMember.id, localTz);
        signedInMember.timeZone = localTz;
        setMembers([...memberList]);
      }

      // 2. Fetch stats and member logs
      const stats = await client.getGroupStats(currentYear);
      setStatsRows(stats);

      const logs = await client.getMemberLogs(memberId, currentYear);
      setMemberLogs(logs);

      // If viewing another member's history, load their logs too
      const viewingId = historyViewingMemberId ?? memberId;
      if (viewingId === memberId) {
        setViewingMemberLogs(logs);
      } else {
        const otherLogs = await client.getMemberLogs(viewingId, currentYear);
        setViewingMemberLogs(otherLogs);
      }
    } catch (err) {
      if (!handleAuthError(err)) {
        setErrorMessage('Could not load data. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [passcode, memberId, client, currentYear, historyViewingMemberId, handleAuthError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Visibility and day-rollover listeners
  useEffect(() => {
    const checkRolloverAndReload = () => {
      const nowLocal = todayLocal();
      if (nowLocal !== currentDateRef.current) {
        setCurrentDate(nowLocal);
      }
      loadData();
    };

    const handleForeground = () => {
      checkRolloverAndReload();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleForeground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleForeground);
    // Periodic check for midnight rollover
    const rolloverInterval = setInterval(() => {
      const nowLocal = todayLocal();
      if (nowLocal !== currentDateRef.current) {
        setCurrentDate(nowLocal);
        loadData();
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleForeground);
      clearInterval(rolloverInterval);
    };
  }, [loadData]);

  // Sign out / switch member
  const handleNotYou = async () => {
    // Immediately clear stored member state so the UI switches to the Name Picker with zero lag
    clearStoredMemberId();
    setMemberId(null);
    setHistoryViewingMemberId(null);
    setActiveTab('today');

    // Clean up push notification subscription in the background (non-blocking)
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        await client.removePushSubscription(endpoint);
      }
    } catch {
      // Continue even if unsubscribe fails
    }
  };

  // Open a specific member's History tab
  const handleSelectMemberFromStats = async (selectedId: string) => {
    setHistoryViewingMemberId(selectedId);
    setHistoryInitialOnlyUnlogged(false);
    if (selectedId !== memberId) {
      try {
        const otherLogs = await client.getMemberLogs(selectedId, currentYear);
        setViewingMemberLogs(otherLogs);
      } catch (err) {
        handleAuthError(err);
      }
    } else {
      setViewingMemberLogs(memberLogs);
    }
    setActiveTab('history');
  };

  // Save or clear today log
  const handleSaveToday = async (status: DayStatus, note: string | null) => {
    if (!memberId) return;
    setIsSaving(true);
    try {
      await client.setDayLog(memberId, currentDate, status, note);
      await loadData();
    } catch (err) {
      if (!handleAuthError(err)) {
        setErrorMessage('Failed to save log. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearToday = async () => {
    if (!memberId) return;
    setIsSaving(true);
    try {
      await client.clearDayLog(memberId, currentDate);
      await loadData();
    } catch (err) {
      if (!handleAuthError(err)) {
        setErrorMessage('Failed to clear log. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Save or clear past day log from History
  const handleSaveDayLog = async (date: string, status: DayStatus, note: string | null) => {
    if (!memberId) return;
    setIsSaving(true);
    try {
      await client.setDayLog(memberId, date, status, note);
      await loadData();
    } catch (err) {
      if (!handleAuthError(err)) {
        setErrorMessage('Failed to save log. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDayLog = async (date: string) => {
    if (!memberId) return;
    setIsSaving(true);
    try {
      await client.clearDayLog(memberId, date);
      await loadData();
    } catch (err) {
      if (!handleAuthError(err)) {
        setErrorMessage('Failed to clear log. Try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // If no passcode stored, show Passcode screen
  if (!passcode) {
    return <PasscodeScreen client={client} onPasscodeSuccess={handlePasscodeChange} />;
  }

  // If no member selected, show Name Picker screen
  if (!memberId) {
    return (
      <NamePickerScreen
        members={members}
        onSelectMember={(selectedId) => {
          setMemberId(selectedId);
        }}
      />
    );
  }

  // Initial loading state
  if (isLoading && members.length === 0) {
    return (
      <div className="screen-center">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  // Error state with retry
  if (errorMessage && members.length === 0) {
    return (
      <div className="screen-center">
        <div className="screen-card">
          <p className="form-error">{errorMessage}</p>
          <button type="button" className="btn-primary" onClick={loadData}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const signedInMember = members.find((m) => m.id === memberId) ?? {
    id: memberId,
    name: 'You',
    timeZone: deviceTimeZone(),
  };

  const viewingId = historyViewingMemberId ?? memberId;
  const viewingMember = members.find((m) => m.id === viewingId) ?? signedInMember;

  // Find signed-in member's today log
  const todayLog = memberLogs.find((l) => l.date === currentDate) ?? null;

  // Unlogged days calculation
  const loggedDateSet = new Set(memberLogs.map((l) => l.date));
  const unloggedDates = getUnloggedDates(currentYear, currentDate, loggedDateSet);

  return (
    <div className="app-layout">
      {isMockMode() && (
        <div className="demo-banner" role="status">
          Demo mode: fake data, nothing is saved.
        </div>
      )}

      <header className="app-header">
        <div className="app-header-main">
          <h1 className="app-header-title">Group Fitness {currentYear}</h1>
          <div className="app-header-user">
            <span>Signed in as {signedInMember.name}</span>
            <button
              type="button"
              className="btn-text-link"
              onClick={handleNotYou}
            >
              Not you?
            </button>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="toast-error" role="alert">
          <span>{errorMessage}</span>
          <button type="button" className="btn-text-link" onClick={loadData}>
            Try again
          </button>
        </div>
      )}

      <main className="app-main">
        {activeTab === 'today' && (
          <TodayScreen
            todayDate={currentDate}
            currentYear={currentYear}
            signedInMemberId={signedInMember.id}
            statsRows={statsRows}
            todayLog={todayLog}
            memberLogs={memberLogs}
            unloggedCount={unloggedDates.length}
            isSaving={isSaving}
            showInstallHint={showInstallHint}
            onDismissInstallHint={handleDismissInstallHint}
            onReviewUnlogged={() => {
              setHistoryViewingMemberId(signedInMember.id);
              setHistoryInitialOnlyUnlogged(true);
              setViewingMemberLogs(memberLogs);
              setActiveTab('history');
            }}
            onSelectMember={handleSelectMemberFromStats}
            onSaveToday={handleSaveToday}
            onClearToday={handleClearToday}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            currentYear={currentYear}
            todayDate={currentDate}
            viewingMember={viewingMember}
            signedInMemberId={signedInMember.id}
            logs={viewingId === memberId ? memberLogs : viewingMemberLogs}
            isSaving={isSaving}
            initialOnlyUnlogged={historyInitialOnlyUnlogged}
            onBackToSelf={() => {
              setHistoryViewingMemberId(signedInMember.id);
              setViewingMemberLogs(memberLogs);
            }}
            onSaveDayLog={handleSaveDayLog}
            onClearDayLog={handleClearDayLog}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen
            client={client}
            signedInMemberId={signedInMember.id}
            passcode={passcode}
            todayDate={currentDate}
          />
        )}
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
