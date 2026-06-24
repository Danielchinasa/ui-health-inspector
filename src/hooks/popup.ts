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
 * Hook to initialize popup data (settings, history)
 */
export function usePopupInit() {
  const { setSettings, setScanHistory } = usePopupStore();

  useEffect(() => {
    async function init() {
      try {
        // Fetch settings
        const settingsResponse = await sendToBackground(
          createMessage(MessageType.GET_SETTINGS, {})
        ) as unknown as { payload?: UserSettings };
        if (settingsResponse.payload) {
          setSettings(settingsResponse.payload);
        }

        // Fetch scan history
        const historyResponse = await sendToBackground(
          createMessage(MessageType.GET_SCAN_HISTORY, {})
        ) as unknown as { payload?: ScanResult[] };
        if (historyResponse.payload) {
          setScanHistory(historyResponse.payload);
        }

        logger.info('Popup initialized');
      } catch (error) {
        logger.error('Failed to initialize popup:', error);
      }
    }

    init();
  }, [setSettings, setScanHistory]);
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
      const response = await sendToBackground(
        createMessage(MessageType.START_SCAN, {})
      ) as unknown as { payload?: ScanResult };

      if (response.payload) {
        const result = response.payload;
        setCurrentScan(result);
        setScanState('complete');
        setScanProgress(100);

        // Add to history
        setScanHistory([result, ...scanHistory].slice(0, 10)); // Keep last 10

        logger.info('Scan completed', { healthScore: result.healthScore });
      } else {
        throw new Error('No scan result received');
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
      await sendToBackground(
        createMessage(MessageType.TOGGLE_HIGHLIGHTS, { enabled: newState })
      );
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
