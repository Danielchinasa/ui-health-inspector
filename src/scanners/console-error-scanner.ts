/**
 * Console Error Scanner
 * Captures console errors and warnings
 */

import type { ConsoleErrorIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { BaseScanner } from './base-scanner';

// ─── Internal enriched error representation ──────────────────────────────────

interface EnrichedError {
  /** Event category from the error-monitor bridge */
  category: 'error' | 'warning' | 'unhandled_rejection' | 'network';
  /** Raw error/rejection/console message */
  message: string;
  stack?: string;
  timestamp: number;
  /** Source script URL (exceptions only) */
  source?: string;
  line?: number;
  column?: number;
  /** JavaScript Error subclass, e.g. "ReferenceError" */
  errorName?: string;
  /** Request URL (network errors only) */
  requestUrl?: string;
  /** HTTP status code (network errors only) */
  httpStatus?: number;
  /** HTTP method (network errors only) */
  httpMethod?: string;
}

/**
 * Scanner that captures JavaScript runtime errors, unhandled promise rejections,
 * console warnings, and failed network requests from the page.
 */
export class ConsoleErrorScanner extends BaseScanner {
  private static globalErrors: Array<{
    type: 'error' | 'warning';
    message: string;
    stack?: string;
    timestamp: number;
  }> = [];
  private static listenersSetup = false;
  private static capturing = false;
  private static originalConsoleError: typeof console.error;
  private static originalConsoleWarn: typeof console.warn;

  private errors: Array<{
    type: 'error' | 'warning';
    message: string;
    stack?: string;
    timestamp: number;
  }> = [];

  constructor() {
    super(
      IssueType.CONSOLE_ERROR,
      'Console Error Scanner',
      'Captures JavaScript errors and warnings',
      100
    );

    // Set up shared listeners once, then all scanner instances read from shared state.
    this.setupErrorListeners();
  }

  private setupErrorListeners() {
    if (ConsoleErrorScanner.listenersSetup) {
      return;
    }
    ConsoleErrorScanner.listenersSetup = true;

    ConsoleErrorScanner.originalConsoleError = console.error.bind(console);
    ConsoleErrorScanner.originalConsoleWarn = console.warn.bind(console);

    // Intercept console.error
    console.error = (...args: any[]) => {
      if (!ConsoleErrorScanner.capturing) {
        this.captureError('error', args);
      }
      ConsoleErrorScanner.originalConsoleError(...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      if (!ConsoleErrorScanner.capturing) {
        this.captureError('warning', args);
      }
      ConsoleErrorScanner.originalConsoleWarn(...args);
    };

    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      if (!ConsoleErrorScanner.capturing) {
        ConsoleErrorScanner.capturing = true;
        ConsoleErrorScanner.globalErrors.push({
          type: 'error',
          message: event.message,
          stack: event.error?.stack,
          timestamp: Date.now(),
        });
        ConsoleErrorScanner.capturing = false;
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (!ConsoleErrorScanner.capturing) {
        ConsoleErrorScanner.capturing = true;

        let message = 'Unhandled Promise Rejection';
        let stack: string | undefined;

        if (event.reason instanceof Error) {
          message = `Unhandled Promise: ${event.reason.message}`;
          stack = event.reason.stack;
        } else if (typeof event.reason === 'string') {
          message = `Unhandled Promise: ${event.reason}`;
        } else if (event.reason && typeof event.reason === 'object') {
          try {
            message = `Unhandled Promise: ${JSON.stringify(event.reason)}`;
          } catch {
            message = `Unhandled Promise: ${String(event.reason)}`;
          }
        }

        ConsoleErrorScanner.globalErrors.push({
          type: 'error',
          message,
          stack,
          timestamp: Date.now(),
        });

        ConsoleErrorScanner.capturing = false;
      }
    });
  }

  private captureError(type: 'error' | 'warning', args: any[]) {
    if (ConsoleErrorScanner.capturing) return;
    ConsoleErrorScanner.capturing = true;
    try {
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      let stack: string | undefined;
      const errorArg = args.find((arg) => arg instanceof Error);
      if (errorArg) stack = errorArg.stack;

      ConsoleErrorScanner.globalErrors.push({ type, message, stack, timestamp: Date.now() });
    } finally {
      ConsoleErrorScanner.capturing = false;
    }
  }

  // ─── Page-world bridge ────────────────────────────────────────────────────

  /**
   * Read the rich error entries written by the MAIN-world error-monitor script
   * into document.documentElement.dataset.uihiErrors.
   */
  private readPageWorldErrors(): EnrichedError[] {
    try {
      const json = document.documentElement?.dataset?.uihiErrors;
      if (!json) return [];
      const raw: unknown[] = JSON.parse(json);
      if (!Array.isArray(raw)) return [];

      return raw
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .filter((e) => typeof e['m'] === 'string')
        .map((e) => ({
          category: (['error', 'warning', 'unhandled_rejection', 'network'].includes(String(e['t']))
            ? e['t']
            : 'error') as EnrichedError['category'],
          message: e['m'] as string,
          stack: typeof e['st'] === 'string' ? e['st'] : undefined,
          timestamp: typeof e['ts'] === 'number' ? e['ts'] : Date.now(),
          source: typeof e['src'] === 'string' ? e['src'] : undefined,
          line: typeof e['ln'] === 'number' ? e['ln'] : undefined,
          column: typeof e['col'] === 'number' ? e['col'] : undefined,
          errorName: typeof e['ename'] === 'string' ? e['ename'] : undefined,
          requestUrl: typeof e['url'] === 'string' ? e['url'] : undefined,
          httpStatus: typeof e['status'] === 'number' ? e['status'] : undefined,
          httpMethod: typeof e['method'] === 'string' ? e['method'] : undefined,
        }));
    } catch {
      return [];
    }
  }

  // ─── Scan ─────────────────────────────────────────────────────────────────

  async scan(): Promise<ConsoleErrorIssue[]> {
    // Convert legacy isolated-world errors to EnrichedError format
    const pageWorldErrors = this.readPageWorldErrors();
    this.errors = [...ConsoleErrorScanner.globalErrors];

    const isolatedErrors: EnrichedError[] = this.errors.map((e) => ({
      category: e.type === 'error' ? 'error' : 'warning',
      message: e.message,
      stack: e.stack,
      timestamp: e.timestamp,
    }));

    // Page-world errors take precedence; isolated-world errors are a fallback
    // for any warnings the extension itself emits.
    const all: EnrichedError[] = [...pageWorldErrors, ...isolatedErrors];

    // Deduplicate by a stable key (category + normalised message)
    const seen = new Set<string>();
    const unique = all.filter((e) => {
      const key = `${e.category}|${this.normalizeMessage(e.message)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.map((e) => this.createRichIssue(e));
  }

  // ─── Issue creation ───────────────────────────────────────────────────────

  /**
   * Build a structured ConsoleErrorIssue from one enriched error entry.
   * The `message` field (shown in the collapsed issue row) is a human-readable
   * one-liner; `errorMessage` holds the raw detail.
   */
  private createRichIssue(error: EnrichedError): ConsoleErrorIssue {
    const errorType = this.mapCategory(error);
    const severity = this.mapSeverity(error);
    const headline = this.buildHeadline(error);

    // For exceptions: url = source file. For network: url = request URL.
    const url = error.category === 'network' ? error.requestUrl : error.source;

    return {
      id: `console-error-${Date.now()}-${
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      }`,
      type: IssueType.CONSOLE_ERROR,
      severity,
      message: headline,
      errorMessage: error.message,
      errorType,
      errorName: error.errorName,
      stack: error.stack,
      url,
      line: error.line,
      column: error.column,
      httpMethod: error.httpMethod,
      httpStatus: error.httpStatus,
      recommendation: this.buildRecommendation(error),
    };
  }

  /**
   * One-line headline shown in the collapsed issue row.
   *
   * Examples:
   *   ReferenceError: nonExistingFunction is not defined
   *   Unhandled Promise Rejection: Intentional rejection
   *   Failed Fetch: GET /api/missing.json → 404
   *   Console Warning: Deprecated API usage
   */
  private buildHeadline(error: EnrichedError): string {
    switch (error.category) {
      case 'network': {
        const method = error.httpMethod || 'Request';
        const path = error.requestUrl ? this.shortUrl(error.requestUrl) : 'unknown';
        const status = error.httpStatus ? ` → ${error.httpStatus}` : '';
        return `Failed ${method}: ${path}${status}`;
      }
      case 'unhandled_rejection': {
        const prefix = error.errorName
          ? `Unhandled ${error.errorName}`
          : 'Unhandled Promise Rejection';
        return error.message ? `${prefix}: ${this.truncate(error.message, 120)}` : prefix;
      }
      case 'warning':
        return `Console Warning: ${this.truncate(error.message, 120)}`;
      default: {
        // 'error' category
        if (error.errorName && error.errorName !== 'Error') {
          return `${error.errorName}: ${this.truncate(error.message, 120)}`;
        }
        return `Console Error: ${this.truncate(error.message, 120)}`;
      }
    }
  }

  /** Shorten a URL to the last path segment + query string for display. */
  private shortUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.href);
      const path = parsed.pathname.split('/').pop() || parsed.pathname;
      const qs = parsed.search ? parsed.search.substring(0, 30) : '';
      return path + qs || url;
    } catch {
      return url.split('/').pop() || url;
    }
  }

  private truncate(s: string, max: number): string {
    return s.length <= max ? s : s.substring(0, max - 1) + '…';
  }

  /** Map enriched category + errorName to the ConsoleErrorIssue errorType enum. */
  private mapCategory(error: EnrichedError): ConsoleErrorIssue['errorType'] {
    if (error.category === 'network') return 'network';
    if (error.errorName === 'SecurityError') return 'security';
    if (error.category === 'warning') return 'other';
    return 'exception'; // 'error' or 'unhandled_rejection'
  }

  private mapSeverity(error: EnrichedError): IssueSeverity {
    switch (error.category) {
      case 'unhandled_rejection':
      case 'error':
        return IssueSeverity.HIGH;
      case 'network':
        return IssueSeverity.MEDIUM;
      case 'warning':
      default:
        return IssueSeverity.LOW;
    }
  }

  private buildRecommendation(error: EnrichedError): string {
    switch (error.category) {
      case 'network':
        return `Check that the endpoint "${error.requestUrl || 'unknown'}" exists and returns a successful status. Verify CORS headers if the request is cross-origin.`;
      case 'unhandled_rejection':
        return 'Add a .catch() handler or try/catch around the Promise to handle rejections gracefully.';
      case 'warning':
        return 'Review the browser console for full warning context. Some warnings indicate deprecated APIs.';
      default: {
        if (error.errorName === 'ReferenceError') {
          return 'A variable or function is used before it is defined. Check spelling and ensure it is declared in the correct scope.';
        }
        if (error.errorName === 'TypeError') {
          return 'A value is being used in an incompatible way (e.g. calling null as a function). Add null/undefined checks.';
        }
        return 'Fix the JavaScript error. Open the browser DevTools console for a full stack trace.';
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private normalizeMessage(message: string): string {
    return message
      .replace(/:\d+:\d+/g, '') // strip line:column
      .replace(/\d{13,}/g, '') // strip timestamps
      .substring(0, 200);
  }
}
