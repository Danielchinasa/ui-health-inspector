/**
 * Popup State Store
 * Manages UI state using Zustand
 */

import { create } from 'zustand';
import type { ScanResult, UserSettings } from '@/types';

export type ScanState = 'idle' | 'scanning' | 'complete' | 'error';
export type ViewTab = 'scan' | 'history' | 'settings';
export type IssueFilter = 'all' | 'high' | 'medium' | 'low';

export type ThemeMode = 'dark' | 'light';

interface PopupState {
  // Scan state
  scanState: ScanState;
  currentScan: ScanResult | null;
  scanError: string | null;
  scanProgress: number; // 0-100

  // UI state
  currentTab: ViewTab;
  issueFilter: IssueFilter;
  highlightsEnabled: boolean;
  expandedIssueId: string | null;
  theme: ThemeMode;

  // Settings
  settings: UserSettings | null;

  // History
  scanHistory: ScanResult[];

  // Actions
  setScanState: (state: ScanState) => void;
  setCurrentScan: (scan: ScanResult | null) => void;
  setScanError: (error: string | null) => void;
  setScanProgress: (progress: number) => void;
  setCurrentTab: (tab: ViewTab) => void;
  setIssueFilter: (filter: IssueFilter) => void;
  setHighlightsEnabled: (enabled: boolean) => void;
  setExpandedIssueId: (id: string | null) => void;
  setTheme: (theme: ThemeMode) => void;
  setSettings: (settings: UserSettings) => void;
  setScanHistory: (history: ScanResult[]) => void;
  reset: () => void;
}

const initialState = {
  scanState: 'idle' as ScanState,
  currentScan: null,
  scanError: null,
  scanProgress: 0,
  currentTab: 'scan' as ViewTab,
  issueFilter: 'all' as IssueFilter,
  highlightsEnabled: false,
  expandedIssueId: null,
  theme: 'dark' as ThemeMode,
  settings: null,
  scanHistory: [],
};

export const usePopupStore = create<PopupState>((set) => ({
  ...initialState,

  setScanState: (scanState) => set({ scanState }),
  setCurrentScan: (currentScan) => set({ currentScan }),
  setScanError: (scanError) => set({ scanError }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setCurrentTab: (currentTab) => set({ currentTab }),
  setIssueFilter: (issueFilter) => set({ issueFilter }),
  setHighlightsEnabled: (highlightsEnabled) => set({ highlightsEnabled }),
  setExpandedIssueId: (expandedIssueId) => set({ expandedIssueId }),
  setTheme: (theme) => set({ theme }),
  setSettings: (settings) => set({ settings }),
  setScanHistory: (scanHistory) => set({ scanHistory }),
  reset: () => set(initialState),
}));
