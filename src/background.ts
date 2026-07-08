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
    // First-time installation — write defaults including autoScan: false
    logger.info('First-time installation detected');
    await storageManager.updateSettings({ autoScan: false });
    logger.info('Default settings initialized');
  } else if (details.reason === 'update') {
    // Extension updated — always reset autoScan to false so it never fires unexpectedly
    const previousVersion = details.previousVersion;
    logger.info(
      `Extension updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`
    );
    await storageManager.updateSettings({ autoScan: false });
    logger.info('Reset autoScan to false after update');
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
        return await forwardToTargetTab(message, sender.tab?.id);

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
  let targetTabId = tabId;

  // If no tab ID provided (message from popup), get the active tab
  if (!targetTabId) {
    logger.info('No tab ID provided, querying for active tab');
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab?.id) {
      throw new Error('No active tab found');
    }

    targetTabId = activeTab.id;
    logger.info(`Found active tab: ${targetTabId}`);
  }

  logger.info(`Starting scan for tab ${targetTabId}`);

  // Send scan start message to content script
  const scanMessage = createMessage(MessageType.START_SCAN);

  try {
    const result = await sendToTab(targetTabId, scanMessage);
    logger.info('Scan completed:', result);
    return result;
  } catch (error) {
    // If content script not loaded, try to inject it programmatically
    // Check both the error message and the underlying cause
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCause = (error as any)?.cause;
    const causeMessage =
      errorCause instanceof Error ? errorCause.message : String(errorCause || '');

    const isConnectionError =
      errorMessage.includes('Receiving end does not exist') ||
      errorMessage.includes('Failed to send message to tab') ||
      causeMessage.includes('Receiving end does not exist');

    if (isConnectionError) {
      logger.warn('Content script not loaded, attempting programmatic injection...');

      try {
        // Get the manifest to find the actual content script filename
        const manifest = chrome.runtime.getManifest();
        const contentScripts = manifest.content_scripts?.[0]?.js;

        if (!contentScripts || contentScripts.length === 0) {
          throw new Error('No content script found in manifest');
        }

        // Check if we can inject on this page
        const tab = await chrome.tabs.get(targetTabId);
        const url = tab.url || '';

        logger.info(`Target page URL: ${url}`);

        // Cannot inject on special pages
        const blockedProtocols = [
          'chrome://',
          'chrome-extension://',
          'edge://',
          'about:',
          'devtools://',
        ];
        const isBlocked = blockedProtocols.some((protocol) => url.startsWith(protocol));

        if (isBlocked || url === '') {
          const protocol = url.split(':')[0] || 'this';
          throw new Error(
            `Cannot scan ${protocol} pages. Please open a regular website (http:// or https://) and try again.`
          );
        }

        // Inject the content script
        logger.info(`Injecting content scripts into ${url}: ${contentScripts.join(', ')}`);

        try {
          await chrome.scripting.executeScript({
            target: { tabId: targetTabId },
            files: contentScripts,
          });
          logger.info('✓ Content script file injected successfully');
        } catch (scriptError) {
          logger.error('✗ Script injection failed:', scriptError);
          const errorMsg = scriptError instanceof Error ? scriptError.message : 'Unknown error';

          if (
            errorMsg.includes('Cannot access') ||
            errorMsg.includes('The extensions gallery cannot be scripted')
          ) {
            throw new Error(
              'Cannot scan Chrome Web Store or extension pages. Please try a regular website.'
            );
          }

          throw new Error(`Failed to inject scanner: ${errorMsg}`);
        }

        // Wait for content script to initialize with retries
        logger.info('⏳ Waiting for content script to initialize...');
        let retries = 8; // Increased from 5
        let contentScriptReady = false;
        const retryDelay = 400; // 400ms between attempts

        while (retries > 0 && !contentScriptReady) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          try {
            // Try to ping the content script
            const pingResponse = await chrome.tabs.sendMessage(
              targetTabId,
              createMessage(MessageType.PING)
            );
            contentScriptReady = true;
            logger.info('✓ Content script is ready and responding!', pingResponse);
          } catch (e) {
            retries--;
            if (retries > 0) {
              logger.info(`  ⏳ Content script initializing... ${retries} attempts remaining`);
            }
          }
        }

        if (!contentScriptReady) {
          logger.error('✗ Content script failed to initialize after injection');
          logger.info(
            '💡 The page may have Content Security Policy restrictions or JavaScript errors.'
          );
          throw new Error(
            'Content script did not initialize. Please:\n' +
              '1. Reload this page (press F5 or Cmd+R)\n' +
              '2. Then try scanning again\n\n' +
              'If the issue persists, the page may block script injection.'
          );
        }

        // Retry sending the scan message
        logger.info('📊 Starting scan after successful injection...');
        const result = await sendToTab(targetTabId, scanMessage);
        logger.info('✓ Scan completed after injection:', result);
        return result;
      } catch (injectError) {
        logger.error('✗ Injection process failed:', injectError);
        const errorMsg = injectError instanceof Error ? injectError.message : 'Unknown error';

        // Return the error message as-is if it's already user-friendly
        if (errorMsg.includes('Cannot scan') || errorMsg.includes('Please')) {
          throw new Error(errorMsg);
        }

        // Generic fallback
        throw new Error(
          `Could not load scanner: ${errorMsg}\n\nTry reloading the page and scanning again.`
        );
      }
    }

    logger.error('Scan failed:', error);
    throw error;
  }
}

async function forwardToTargetTab(message: Message, senderTabId?: number) {
  let targetTabId = senderTabId;

  if (!targetTabId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) {
      throw new Error('No active tab found');
    }
    targetTabId = activeTab.id;
  }

  return sendToTab(targetTabId, message);
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
