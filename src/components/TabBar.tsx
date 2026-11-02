import { CalendarIcon, ClockIcon, SlidersIcon } from './Icons';

export type TabType = 'today' | 'history' | 'settings';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="Main navigation">
      <button
        type="button"
        className={`tab-item ${activeTab === 'today' ? 'is-active' : ''}`}
        onClick={() => onTabChange('today')}
        aria-selected={activeTab === 'today'}
        role="tab"
      >
        <CalendarIcon size={18} className="tab-icon" />
        <span className="tab-label">Today</span>
      </button>

      <button
        type="button"
        className={`tab-item ${activeTab === 'history' ? 'is-active' : ''}`}
        onClick={() => onTabChange('history')}
        aria-selected={activeTab === 'history'}
        role="tab"
      >
        <ClockIcon size={18} className="tab-icon" />
        <span className="tab-label">History</span>
      </button>

      <button
        type="button"
        className={`tab-item ${activeTab === 'settings' ? 'is-active' : ''}`}
        onClick={() => onTabChange('settings')}
        aria-selected={activeTab === 'settings'}
        role="tab"
      >
        <SlidersIcon size={18} className="tab-icon" />
        <span className="tab-label">Settings</span>
      </button>
    </nav>
  );
}
