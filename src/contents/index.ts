/**
 * Content Script
 * Runs in the context of web pages
 * Executes scanners and manages highlights
 */

import type { Message, ScanResult, ToggleHighlightsMessage, FocusIssueMessage } from '@/types';
import { MessageType } from '@/types';

import { createLogger, perfMonitor } from '@/utils/logger';
import { createMessage, onMessage, sendToBackground } from '@/utils/messaging';
import { getPageMetadata } from '@/utils/dom';
import {
  orchestrator,
  DeadButtonScanner,
  BrokenLinkScanner,
  MissingImageScanner,
  OverflowScanner,
  AccessibilityScanner,
  ConsoleErrorScanner,
} from '@/scanners';

const logger = createLogger('Content');

// Track if content script is initialized
let isInitialized = false;

/**
 * Initialize content script
 */
function initialize() {
  if (isInitialized) {
    logger.warn('Content script already initialized, skipping');
    return;
  }

  try {
    logger.info('Initializing content script');
    isInitialized = true;

    // Register all scanners
    orchestrator.registerScanner(new DeadButtonScanner());
    orchestrator.registerScanner(new BrokenLinkScanner());
    orchestrator.registerScanner(new MissingImageScanner());
    orchestrator.registerScanner(new OverflowScanner());
    orchestrator.registerScanner(new AccessibilityScanner());
    orchestrator.registerScanner(new ConsoleErrorScanner());

    logger.info(
      'Registered 6 scanners: DeadButton, BrokenLink, MissingImage, Overflow, Accessibility, ConsoleError'
    );

    // Set up message listeners
    setupMessageListeners();

    // Log page info
    const metadata = getPageMetadata();
    logger.info('Page metadata:', metadata);

    logger.info('Content script ready');
  } catch (error) {
    logger.error('Failed to initialize content script:', error);
    isInitialized = false;
    throw error;
  }
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
  logger.info('Starting page scan');
  perfMonitor.start('full_scan');

  try {
    // Execute scan using orchestrator (Phase 2 implementation)
    const result = await orchestrator.scan({
      strategy: 'parallel',
    });

    const duration = perfMonitor.end('full_scan');
    logger.info(
      `Scan completed in ${duration.toFixed(2)}ms - Found ${result.metadata.totalIssues} issues, health score: ${result.healthScore}`
    );

    // Save result to storage
    await sendToBackground(createMessage(MessageType.SAVE_SCAN_RESULT, result));

    return result;
  } catch (error) {
    perfMonitor.end('full_scan');
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
try {
  initialize();
  logger.info('Content script loaded successfully');
} catch (error) {
  logger.error('Content script failed to load:', error);
}

export {};
