/**
 * Content Script
 * Runs in the context of web pages
 * Executes scanners and manages highlights
 */

import type {
  BaseIssue,
  FocusIssueMessage,
  IssueType,
  Message,
  ScanResult,
  ToggleHighlightsMessage,
} from '@/types';
import { MessageType } from '@/types';

import { createLogger, perfMonitor } from '@/utils/logger';
import { createMessage, onMessage, sendToBackground } from '@/utils/messaging';
import { getElementByXPath, getPageMetadata, safeQuerySelector } from '@/utils/dom';
import { STORAGE_KEYS } from '@/utils/constants';
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
let lastScanResult: ScanResult | null = null;
let focusedElement: HTMLElement | null = null;
let focusResetTimer: number | null = null;

const FOCUS_CLASS = 'uihi-focused-issue';
const FOCUS_STYLE_ID = 'uihi-focused-issue-style';

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
    // Read which scanners the user has enabled
    const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const enabledScanners: IssueType[] | undefined = stored[STORAGE_KEYS.SETTINGS]?.enabledScanners;

    // Execute scan — pass enabledScanners so disabled ones are skipped
    const result = await orchestrator.scan({
      strategy: 'parallel',
      ...(enabledScanners?.length ? { scanners: enabledScanners } : {}),
    });

    lastScanResult = result;

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
  clearFocusedElement();
}

/**
 * Handle focus issue
 */
function handleFocusIssue(payload: FocusIssueMessage['payload']): {
  focused: boolean;
  error?: string;
} {
  logger.info('Focusing issue:', payload);

  try {
    ensureFocusStyle();

    const issue = findIssueById(payload.issueId, payload.issueType);
    const element =
      resolveElement(payload.element?.selector, payload.element?.xpath) ||
      resolveElement(issue?.element?.selector, issue?.element?.xpath);

    if (!element) {
      return { focused: false, error: 'Issue element was not found on this page.' };
    }

    clearFocusedElement();

    focusedElement = element;
    focusedElement.classList.add(FOCUS_CLASS);
    focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    if (focusResetTimer) {
      window.clearTimeout(focusResetTimer);
    }
    focusResetTimer = window.setTimeout(() => {
      clearFocusedElement();
    }, 6000);

    return { focused: true };
  } catch (error) {
    logger.error('Failed to focus issue:', error);
    return {
      focused: false,
      error: error instanceof Error ? error.message : 'Failed to focus issue',
    };
  }
}

function findIssueById(issueId: string, issueType: string): BaseIssue | undefined {
  if (!lastScanResult) {
    return undefined;
  }

  const issueGroups: Record<string, BaseIssue[]> = {
    DEAD_BUTTON: lastScanResult.issues.deadButtons,
    BROKEN_LINK: lastScanResult.issues.brokenLinks,
    MISSING_IMAGE: lastScanResult.issues.missingImages,
    OVERFLOW: lastScanResult.issues.overflowIssues,
    ACCESSIBILITY: lastScanResult.issues.accessibility,
    CONSOLE_ERROR: lastScanResult.issues.consoleErrors,
  };

  return issueGroups[issueType]?.find((issue) => issue.id === issueId);
}

function resolveElement(selector?: string, xpath?: string): HTMLElement | null {
  const selectorMatch = selector ? safeQuerySelector(selector) : null;
  if (selectorMatch instanceof HTMLElement) {
    return selectorMatch;
  }

  const xpathMatch = xpath ? getElementByXPath(xpath) : null;
  if (xpathMatch instanceof HTMLElement) {
    return xpathMatch;
  }

  return null;
}

function ensureFocusStyle(): void {
  if (document.getElementById(FOCUS_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = FOCUS_STYLE_ID;
  style.textContent = `
    .${FOCUS_CLASS} {
      outline: 3px solid #ff5b5f !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 4px rgba(255, 91, 95, 0.28) !important;
      transition: box-shadow 0.2s ease;
      animation: uihi-focus-pulse 1s ease-in-out 2;
    }

    @keyframes uihi-focus-pulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 91, 95, 0.55); }
      100% { box-shadow: 0 0 0 8px rgba(255, 91, 95, 0); }
    }
  `;

  document.head.appendChild(style);
}

function clearFocusedElement(): void {
  if (focusedElement) {
    focusedElement.classList.remove(FOCUS_CLASS);
    focusedElement = null;
  }

  if (focusResetTimer) {
    window.clearTimeout(focusResetTimer);
    focusResetTimer = null;
  }
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
