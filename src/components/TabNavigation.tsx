/**
 * Tab Navigation Component
 * Switches between scan, history, and settings views
 */

import type { ViewTab } from '@/store/popup';
import { usePopupStore } from '@/store/popup';

export function TabNavigation() {
  const { currentTab, setCurrentTab } = usePopupStore();

  const tabs: { id: ViewTab; label: string; icon: string }[] = [
    { id: 'scan', label: 'Scan', icon: '🔍' },
    { id: 'history', label: 'History', icon: '📜' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => setCurrentTab(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
