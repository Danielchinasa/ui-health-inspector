/**
 * Console Error Scanner
 * Captures console errors and warnings
 */

import type { ConsoleErrorIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { BaseScanner } from './base-scanner';

/**
 * Scanner that captures console errors and warnings
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

    // DON'T intercept console.log - too risky for infinite loops
    // Only capture actual errors and warnings

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
    // Prevent infinite recursion
    if (ConsoleErrorScanner.capturing) {
      return;
    }

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

      // Get stack trace if available
      let stack: string | undefined;
      const errorArg = args.find((arg) => arg instanceof Error);
      if (errorArg) {
        stack = errorArg.stack;
      }

      ConsoleErrorScanner.globalErrors.push({
        type,
        message,
        stack,
        timestamp: Date.now(),
      });
    } finally {
      ConsoleErrorScanner.capturing = false;
    }
  }

  async scan(): Promise<ConsoleErrorIssue[]> {
    this.errors = [...ConsoleErrorScanner.globalErrors];

    const issues: ConsoleErrorIssue[] = [];

    // Group similar errors
    const errorMap = new Map<string, (typeof this.errors)[0][]>();

    for (const error of this.errors) {
      const key = this.normalizeErrorMessage(error.message);
      if (!errorMap.has(key)) {
        errorMap.set(key, []);
      }
      errorMap.get(key)!.push(error);
    }

    // Create issues from grouped errors
    for (const [, errorGroup] of errorMap.entries()) {
      const firstError = errorGroup[0];
      const count = errorGroup.length;

      issues.push(
        this.createIssue(
          this.mapErrorType(firstError.type),
          firstError.message,
          count,
          firstError.stack
        )
      );
    }

    return issues;
  }

  private normalizeErrorMessage(message: string): string {
    // Remove timestamps, line numbers, and dynamic data to group similar errors
    return message
      .replace(/:\d+:\d+/g, '') // Remove line:column
      .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove dates
      .replace(/\d{13,}/g, '') // Remove timestamps
      .substring(0, 200); // Limit length
  }

  private mapErrorType(type: 'error' | 'warning'): 'exception' | 'network' | 'security' | 'other' {
    return type === 'error' ? 'exception' : 'other';
  }

  private createIssue(
    errorType: 'exception' | 'network' | 'security' | 'other',
    message: string,
    count: number,
    stack?: string
  ): ConsoleErrorIssue {
    const truncatedMessage = message.length > 200 ? message.substring(0, 197) + '...' : message;
    const displayMessage = count > 1 ? `${truncatedMessage} (${count}x)` : truncatedMessage;

    return {
      id: `console-error-${Date.now()}-${
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      }`,
      type: IssueType.CONSOLE_ERROR,
      severity: errorType === 'exception' ? IssueSeverity.HIGH : IssueSeverity.LOW,
      message: displayMessage,
      errorMessage: message,
      errorType,
      stack,
      recommendation: this.getRecommendation(errorType),
    };
  }

  private getRecommendation(errorType: string): string {
    switch (errorType) {
      case 'exception':
        return 'Fix JavaScript errors in your code. Check the browser console for stack traces.';
      case 'network':
        return 'Check network requests and API endpoints. Verify CORS configuration.';
      case 'security':
        return 'Review Content Security Policy and permissions. Check for mixed content issues.';
      default:
        return 'Review browser console for warnings and potential issues.';
    }
  }
}
