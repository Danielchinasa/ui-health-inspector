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
  private errors: Array<{
    type: 'error' | 'warning';
    message: string;
    stack?: string;
    timestamp: number;
  }> = [];

  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private originalConsoleLog: typeof console.log;
  private isSetup = false;
  private isCapturing = false; // Prevent infinite recursion

  constructor() {
    super(
      IssueType.CONSOLE_ERROR,
      'Console Error Scanner',
      'Captures JavaScript errors and warnings',
      100
    );

    // Store original console methods BEFORE any interception
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
    this.originalConsoleLog = console.log.bind(console);

    // Set up error listeners immediately
    this.setupErrorListeners();
  }

  private setupErrorListeners() {
    if (this.isSetup) {
      return;
    }
    this.isSetup = true;

    // Intercept console.error
    console.error = (...args: any[]) => {
      if (!this.isCapturing) {
        this.captureError('error', args);
      }
      this.originalConsoleError(...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      if (!this.isCapturing) {
        this.captureError('warning', args);
      }
      this.originalConsoleWarn(...args);
    };

    // DON'T intercept console.log - too risky for infinite loops
    // Only capture actual errors and warnings

    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      if (!this.isCapturing) {
        this.isCapturing = true;
        this.errors.push({
          type: 'error',
          message: event.message,
          stack: event.error?.stack,
          timestamp: Date.now(),
        });
        this.isCapturing = false;
      }
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (!this.isCapturing) {
        this.isCapturing = true;

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

        this.errors.push({
          type: 'error',
          message,
          stack,
          timestamp: Date.now(),
        });

        this.isCapturing = false;
      }
    });
  }

  private captureError(type: 'error' | 'warning', args: any[]) {
    // Prevent infinite recursion
    if (this.isCapturing) {
      return;
    }

    this.isCapturing = true;

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

      this.errors.push({
        type,
        message,
        stack,
        timestamp: Date.now(),
      });
    } finally {
      this.isCapturing = false;
    }
  }

  async scan(): Promise<ConsoleErrorIssue[]> {
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
      id: `console-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
