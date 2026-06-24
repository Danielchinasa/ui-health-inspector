/**
 * Content Script
 * Runs in the context of web pages
 * Executes scanners and manages highlights
 */

import type { Message, ScanResult, ToggleHighlightsMessage, FocusIssueMessage } from '@/types';
import { MessageType } from '@/types';

import { createLogger } from '@/utils/logger';
import { createMessage, onMessage, sendToBackground } from '@/utils/messaging';
import { perfMonitor } from '@/utils/logger';
import { getPageMetadata } from '@/utils/dom';

const logger = createLogger('Content');

// Track if content script is initialized
let isInitialized = false;

/**
 * Initialize content script
 */
function initialize() {
  if (isInitialized) {
    logger.warn('Content script already initialized');
    return;
  }

  logger.info('Initializing content script');
  isInitialized = true;

  // Set up message listeners
  setupMessageListeners();

  // Log page info
  const metadata = getPageMetadata();
  logger.info('Page metadata:', metadata);

  logger.info('Content script ready');
}

/**
 * Set up message listeners
 */
function setupMessageListeners() {
  onMessage(async (message: Message) => {
    logger.info('Received message:', message.type);

    switch (message.type) {
      case MessageType.PING:
        return createMessage(MessageType.PONG);

      case MessageType.START_SCAN:
        return await handleScan();

      case MessageType.TOGGLE_HIGHLIGHTS:
        return handleToggleHighlights((message as ToggleHighlightsMessage).payload.enabled);

      case MessageType.CLEAR_HIGHLIGHTS:
        return handleClearHighlights();

      case MessageType.FOCUS_ISSUE:
        return handleFocusIssue((message as FocusIssueMessage).payload);

      default:
        logger.warn('Unknown message type:', message.type);
        return null;
    }
  });
}

/**
 * Handle scan execution
 */
async function handleScan(): Promise<ScanResult> {
  logger.info('Starting scan...');
  perfMonitor.start('full_scan');

  try {
    // TODO: Phase 2 - Scanner execution will be implemented here
    // For now, return mock data for infrastructure testing

    const metadata = getPageMetadata();

    const mockResult: ScanResult = {
      url: metadata.url,
      timestamp: Date.now(),
      healthScore: 100,
      issues: {
        deadButtons: [],
        brokenLinks: [],
        missingImages: [],
        overflowIssues: [],
        accessibility: [],
        consoleErrors: [],
      },
      metadata: {
        scanDuration: 0,
        domElementCount: metadata.domElementCount,
        scannersExecuted: [],
        browserInfo: {
          userAgent: metadata.userAgent,
          viewport: metadata.viewport,
        },
      },
    };

    const duration = perfMonitor.end('full_scan');
    mockResult.metadata.scanDuration = duration;

    logger.info(`Scan completed in ${duration.toFixed(2)}ms`);

    // Save result to storage
    await sendToBackground(createMessage(MessageType.SAVE_SCAN_RESULT, mockResult));

    return mockResult;
  } catch (error) {
    logger.error('Scan failed:', error);
    throw error;
  }
}

/**
 * Handle highlight toggle
 */
function handleToggleHighlights(enabled: boolean): void {
  logger.info(`${enabled ? 'Enabling' : 'Disabling'} highlights`);
  // TODO: Phase 7 - Track highlight state and apply highlights

  if (!enabled) {
    handleClearHighlights();
  }

  // TODO: Phase 7 - Highlight implementation
}

/**
 * Handle clear highlights
 */
function handleClearHighlights(): void {
  logger.info('Clearing highlights');
  // TODO: Phase 7 - Remove all highlights from DOM
}

/**
 * Handle focus issue
 */
function handleFocusIssue(payload: { issueId: string; issueType: string }): void {
  logger.info('Focusing issue:', payload);

  // TODO: Phase 7 - Scroll to and highlight specific issue
}

/**
 * Clean up on unload
 */
window.addEventListener('beforeunload', () => {
  logger.info('Page unloading, cleaning up');
  handleClearHighlights();
});

// Initialize immediately
initialize();

logger.info('Content script loaded');

export {};
