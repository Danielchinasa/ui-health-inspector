/**
 * Core type definitions for UI Health Inspector
 * All message types, data structures, and interfaces
 */

// ============================================================================
// Message Types
// ============================================================================

export enum MessageType {
  // Scan operations
  START_SCAN = 'START_SCAN',
  SCAN_PROGRESS = 'SCAN_PROGRESS',
  SCAN_COMPLETE = 'SCAN_COMPLETE',
  SCAN_ERROR = 'SCAN_ERROR',

  // Highlight operations
  TOGGLE_HIGHLIGHTS = 'TOGGLE_HIGHLIGHTS',
  CLEAR_HIGHLIGHTS = 'CLEAR_HIGHLIGHTS',
  FOCUS_ISSUE = 'FOCUS_ISSUE',

  // Storage operations
  GET_SCAN_HISTORY = 'GET_SCAN_HISTORY',
  SAVE_SCAN_RESULT = 'SAVE_SCAN_RESULT',
  GET_SETTINGS = 'GET_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',

  // Health check
  PING = 'PING',
  PONG = 'PONG',
}

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  id: string;
}

export interface ScanStartMessage extends BaseMessage {
  type: MessageType.START_SCAN;
}

export interface ScanProgressMessage extends BaseMessage {
  type: MessageType.SCAN_PROGRESS;
  payload: {
    currentScanner: string;
    progress: number; // 0-100
  };
}

export interface ScanCompleteMessage extends BaseMessage {
  type: MessageType.SCAN_COMPLETE;
  payload: ScanResult;
}

export interface ScanErrorMessage extends BaseMessage {
  type: MessageType.SCAN_ERROR;
  payload: {
    error: string;
    code: ErrorCode;
  };
}

export interface ToggleHighlightsMessage extends BaseMessage {
  type: MessageType.TOGGLE_HIGHLIGHTS;
  payload: {
    enabled: boolean;
  };
}

export interface ClearHighlightsMessage extends BaseMessage {
  type: MessageType.CLEAR_HIGHLIGHTS;
}

export interface FocusIssueMessage extends BaseMessage {
  type: MessageType.FOCUS_ISSUE;
  payload: {
    issueId: string;
    issueType: IssueType;
  };
}

export type Message =
  | ScanStartMessage
  | ScanProgressMessage
  | ScanCompleteMessage
  | ScanErrorMessage
  | ToggleHighlightsMessage
  | ClearHighlightsMessage
  | FocusIssueMessage
  | BaseMessage;

// ============================================================================
// Scan Results
// ============================================================================

export interface ScanResult {
  url: string;
  timestamp: number;
  healthScore: number;
  issues: IssueCollection;
  metadata: ScanMetadata;
}

export interface IssueCollection {
  deadButtons: DeadButtonIssue[];
  brokenLinks: BrokenLinkIssue[];
  missingImages: MissingImageIssue[];
  overflowIssues: OverflowIssue[];
  accessibility: AccessibilityIssue[];
  consoleErrors: ConsoleErrorIssue[];
}

export interface ScanMetadata {
  scanDuration: number; // milliseconds
  domElementCount: number;
  scannersExecuted: string[];
  browserInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
  };
  totalIssues: number;
  executionTime: number; // milliseconds
}

// ============================================================================
// Issue Types
// ============================================================================

export enum IssueType {
  DEAD_BUTTON = 'DEAD_BUTTON',
  BROKEN_LINK = 'BROKEN_LINK',
  MISSING_IMAGE = 'MISSING_IMAGE',
  OVERFLOW = 'OVERFLOW',
  ACCESSIBILITY = 'ACCESSIBILITY',
  CONSOLE_ERROR = 'CONSOLE_ERROR',
}

export enum IssueSeverity {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface BaseIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  element?: ElementInfo;
  recommendation?: string;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  xpath: string;
  selector: string;
  outerHTML: string; // First 200 chars
  textContent?: string;
}

export interface DeadButtonIssue extends BaseIssue {
  type: IssueType.DEAD_BUTTON;
  severity: IssueSeverity.HIGH;
  reason:
    | 'empty_onclick'
    | 'hash_href'
    | 'void_href'
    | 'no_handler'
    | 'disabled'
    | 'role_without_handler';
}

export interface BrokenLinkIssue extends BaseIssue {
  type: IssueType.BROKEN_LINK;
  severity: IssueSeverity.HIGH;
  href: string;
  reason: 'empty_href' | 'malformed_url' | 'anchor_only' | 'javascript_void';
}

export interface MissingImageIssue extends BaseIssue {
  type: IssueType.MISSING_IMAGE;
  severity: IssueSeverity.MEDIUM;
  src?: string;
  reason: 'missing_src' | 'failed_load' | 'empty_src';
}

export interface OverflowIssue extends BaseIssue {
  type: IssueType.OVERFLOW;
  severity: IssueSeverity.MEDIUM;
  scrollWidth: number;
  clientWidth: number;
  overflowAmount: number;
}

export interface AccessibilityIssue extends BaseIssue {
  type: IssueType.ACCESSIBILITY;
  severity: IssueSeverity.MEDIUM;
  reason: 'missing_alt' | 'missing_label' | 'empty_button' | 'missing_aria_label' | 'low_contrast';
  wcagLevel?: 'A' | 'AA' | 'AAA';
}

export interface ConsoleErrorIssue extends BaseIssue {
  type: IssueType.CONSOLE_ERROR;
  severity: IssueSeverity.LOW;
  errorMessage: string;
  errorType: 'exception' | 'network' | 'security' | 'other';
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
}

// ============================================================================
// Storage
// ============================================================================

export interface StorageData {
  settings: UserSettings;
  scanHistory: ScanResult[];
  lastScan?: ScanResult;
}

export interface UserSettings {
  autoScan: boolean;
  highlightByDefault: boolean;
  maxHistoryItems: number;
  enabledScanners: IssueType[];
  theme: 'light' | 'dark' | 'auto';
}

export const DEFAULT_SETTINGS: UserSettings = {
  autoScan: false,
  highlightByDefault: false,
  maxHistoryItems: 20,
  enabledScanners: Object.values(IssueType),
  theme: 'auto',
};

// ============================================================================
// Error Handling
// ============================================================================

export enum ErrorCode {
  // Scan errors
  SCAN_TIMEOUT = 'SCAN_TIMEOUT',
  SCAN_FAILED = 'SCAN_FAILED',
  SCANNER_ERROR = 'SCANNER_ERROR',

  // Communication errors
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  NO_ACTIVE_TAB = 'NO_ACTIVE_TAB',
  CONTENT_SCRIPT_NOT_READY = 'CONTENT_SCRIPT_NOT_READY',

  // Storage errors
  STORAGE_READ_ERROR = 'STORAGE_READ_ERROR',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // General
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ExtensionError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

// ============================================================================
// Scanner Contract
// ============================================================================

export interface ScannerContract {
  readonly type: IssueType;
  readonly name: string;
  readonly description: string;

  /**
   * Execute the scanner and return found issues
   */
  scan(): Promise<BaseIssue[]>;

  /**
   * Get the estimated time for this scanner (ms)
   */
  getEstimatedTime(): number;
}

export interface ScannerResult {
  scanner: string;
  issues: BaseIssue[];
  executionTime: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// Health Score
// ============================================================================

export interface ScoreDeductions {
  [IssueType.DEAD_BUTTON]: number;
  [IssueType.BROKEN_LINK]: number;
  [IssueType.MISSING_IMAGE]: number;
  [IssueType.OVERFLOW]: number;
  [IssueType.ACCESSIBILITY]: number;
  [IssueType.CONSOLE_ERROR]: number;
}

export const SCORE_DEDUCTIONS: ScoreDeductions = {
  [IssueType.DEAD_BUTTON]: 5,
  [IssueType.BROKEN_LINK]: 5,
  [IssueType.MISSING_IMAGE]: 3,
  [IssueType.OVERFLOW]: 4,
  [IssueType.ACCESSIBILITY]: 2,
  [IssueType.CONSOLE_ERROR]: 1,
};

export type HealthScoreRating = 'excellent' | 'good' | 'fair' | 'poor';

export interface HealthScoreInfo {
  score: number;
  rating: HealthScoreRating;
  totalDeductions: number;
  issueBreakdown: Partial<Record<IssueType, number>>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type MessageHandler<T extends Message = Message> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => Promise<unknown> | unknown;

export type Unsubscribe = () => void;
