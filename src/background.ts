/**
 * Background Service Worker
 * Central coordinator for the extension
 * Handles message routing and coordination between popup and content scripts
 */

import type { Message, ScanResult, UserSettings } from '@/types';
import { MessageType } from '@/types';

import { createLogger } from '@/utils/logger';
import { createMessage, onMessage, sendToTab } from '@/utils/messaging';
import { storageManager } from '@/utils/storage';

const logger = createLogger('Background');

/**
 * Extension lifecycle
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Extension installed:', details);

  if (details.reason === 'install') {
    // First-time installation
    logger.info('First-time installation detected');

    // Initialize default settings
    await storageManager.updateSettings({});
    logger.info('Default settings initialized');
  } else if (details.reason === 'update') {
    // Extension updated
    const previousVersion = details.previousVersion;
    logger.info(
      `Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`
    );
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension started');
});

/**
 * Handle messages from popup and content scripts
 */
onMessage(async (message: Message, sender) => {
  logger.info('Received message:', { type: message.type, from: sender.tab?.id || 'popup' });

  try {
    switch (message.type) {
      case MessageType.PING:
        return createMessage(MessageType.PONG);

      case MessageType.START_SCAN:
        return handleStartScan(sender.tab?.id);

      case MessageType.GET_SETTINGS:
        return await storageManager.getSettings();

      case MessageType.UPDATE_SETTINGS:
        return await storageManager.updateSettings(
          (message as unknown as { payload: Partial<UserSettings> }).payload
        );

      case MessageType.GET_SCAN_HISTORY:
        return await storageManager.getScanHistory();

      case MessageType.SAVE_SCAN_RESULT:
        await storageManager.addScanResult((message as unknown as { payload: ScanResult }).payload);
        return { success: true };

      case MessageType.TOGGLE_HIGHLIGHTS:
      case MessageType.CLEAR_HIGHLIGHTS:
      case MessageType.FOCUS_ISSUE:
        // Forward to content script
        if (sender.tab?.id) {
          return await sendToTab(sender.tab.id, message);
        }
        throw new Error('No active tab');

      default:
        logger.warn('Unknown message type:', message.type);
        return { error: 'Unknown message type' };
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Handle scan start request
 */
async function handleStartScan(tabId?: number) {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

  logger.info(`Starting scan for tab ${tabId}`);

  // Send scan start message to content script
  const scanMessage = createMessage(MessageType.START_SCAN);

  try {
    const result = await sendToTab(tabId, scanMessage);
    logger.info('Scan completed:', result);
    return result;
  } catch (error) {
    logger.error('Scan failed:', error);
    throw error;
  }
}

/**
 * Handle tab updates (optional: auto-scan on page load)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    logger.debug(`Tab ${tabId} finished loading: ${tab.url}`);

    // Check if auto-scan is enabled
    const settings = await storageManager.getSettings();
    if (settings.autoScan) {
      logger.info(`Auto-scanning tab ${tabId}`);
      // Trigger auto-scan (implementation in future phases)
    }
  }
});

/**
 * Handle action icon click
 */
chrome.action.onClicked.addListener((tab) => {
  logger.info('Extension icon clicked for tab:', tab.id);
  // Popup will handle the UI
});

/**
 * Global error handler
 */
self.addEventListener('error', (event) => {
  logger.error('Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
});

logger.info('Background service worker initialized');

// Keep service worker alive (Manifest V3 requirement)
const keepAlive = () => {
  chrome.runtime.getPlatformInfo(() => {
    // This keeps the service worker alive
  });
};

// Ping every 20 seconds
setInterval(keepAlive, 20000);

export {};
