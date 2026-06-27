/**
 * Popup Hooks
 * Custom React hooks for popup functionality
 */

import { useEffect, useCallback } from 'react';
import { MessageType } from '@/types';
import type { ScanResult, UserSettings } from '@/types';
import { sendToBackground } from '@/utils/messaging';
import { createMessage } from '@/utils/messaging';
import { createLogger } from '@/utils/logger';
import { usePopupStore } from '@/store/popup';

const logger = createLogger('PopupHooks');

/**
 * Hook to initialize popup data (settings, history, last scan for current tab)
 */
export function usePopupInit() {
  const { setSettings, setScanHistory, setCurrentScan } = usePopupStore();

  useEffect(() => {
    async function init() {
      try {
        // Fetch settings
        const settingsResponse = (await sendToBackground(
          createMessage(MessageType.GET_SETTINGS, {})
        )) as unknown as { success?: boolean; data?: UserSettings };
        if (settingsResponse.success && settingsResponse.data) {
          setSettings(settingsResponse.data);
        }

        // Fetch scan history
        const historyResponse = (await sendToBackground(
          createMessage(MessageType.GET_SCAN_HISTORY, {})
        )) as unknown as { success?: boolean; data?: ScanResult[] };
        if (historyResponse.success && historyResponse.data) {
          setScanHistory(historyResponse.data);
        }

        // Get current tab to load its specific scan result
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url) {
            const storageKey = `scanResult_${tabs[0].url}`;
            chrome.storage.local.get([storageKey], (result) => {
              if (result[storageKey]) {
                setCurrentScan(result[storageKey]);
                logger.info('Loaded scan result for current tab:', tabs[0].url);
              } else {
                logger.info('No previous scan result for this tab');
              }
            });
          }
        });

        logger.info('Popup initialized');
      } catch (error) {
        logger.error('Failed to initialize popup:', error);
      }
    }

    init();
  }, [setSettings, setScanHistory, setCurrentScan]);
}

/**
 * Hook to handle scan execution
 */
export function useScanAction() {
  const {
    setScanState,
    setCurrentScan,
    setScanError,
    setScanProgress,
    setScanHistory,
    scanHistory,
  } = usePopupStore();

  const startScan = useCallback(async () => {
    try {
      setScanState('scanning');
      setScanError(null);
      setScanProgress(0);

      logger.info('Starting scan from popup');

      // Send scan request to background
      const response = (await sendToBackground(
        createMessage(MessageType.START_SCAN, {})
      )) as unknown as { success?: boolean; data?: ScanResult; error?: string };

      if (response.success && response.data) {
        // The data is double-wrapped: response.data contains another { success, data } object
        const wrappedResult = response.data as any;
        const result = wrappedResult.data || wrappedResult; // Unwrap if needed

        // Detailed logging for debugging
        console.log('=== SCAN RESULT RECEIVED ===');
        console.log('Raw response:', response);
        console.log('Wrapped result:', wrappedResult);
        console.log('Final result object:', result);
        console.log('Health score:', result.healthScore);
        console.log('Issues object:', result.issues);
        console.log('Issues keys:', result.issues ? Object.keys(result.issues) : 'no issues');
        console.log('Dead buttons:', result.issues?.deadButtons);
        console.log('Dead buttons length:', result.issues?.deadButtons?.length);

        setCurrentScan(result);
        setScanState('complete');
        setScanProgress(100);

        // Add to history
        setScanHistory([result, ...scanHistory].slice(0, 10)); // Keep last 10

        // Persist scan result per-tab using URL as key
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url) {
            const storageKey = `scanResult_${tabs[0].url}`;
            chrome.storage.local.set({ [storageKey]: result }, () => {
              logger.info('Scan result persisted for tab:', tabs[0].url);
            });
          }
        });

        logger.info('Scan completed', { healthScore: result.healthScore });
      } else {
        throw new Error(response.error || 'No scan result received');
      }
    } catch (error) {
      logger.error('Scan failed:', error);
      setScanState('error');
      setScanError(error instanceof Error ? error.message : 'Scan failed');
      setScanProgress(0);
    }
  }, [setScanState, setCurrentScan, setScanError, setScanProgress, setScanHistory, scanHistory]);

  return { startScan };
}

/**
 * Hook to toggle highlights
 */
export function useHighlights() {
  const { highlightsEnabled, setHighlightsEnabled } = usePopupStore();

  const toggleHighlights = useCallback(async () => {
    const newState = !highlightsEnabled;
    setHighlightsEnabled(newState);

    try {
      await sendToBackground(createMessage(MessageType.TOGGLE_HIGHLIGHTS, { enabled: newState }));
      logger.info('Highlights toggled', { enabled: newState });
    } catch (error) {
      logger.error('Failed to toggle highlights:', error);
      // Revert on error
      setHighlightsEnabled(!newState);
    }
  }, [highlightsEnabled, setHighlightsEnabled]);

  return { highlightsEnabled, toggleHighlights };
}

/**
 * Hook to update settings
 */
export function useSettings() {
  const { settings, setSettings } = usePopupStore();

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      try {
        const updated = { ...settings, ...newSettings } as UserSettings;
        setSettings(updated);

        await sendToBackground(createMessage(MessageType.UPDATE_SETTINGS, updated));
        logger.info('Settings updated', newSettings);
      } catch (error) {
        logger.error('Failed to update settings:', error);
      }
    },
    [settings, setSettings]
  );

  return { settings, updateSettings };
}
