/**
 * Logging and monitoring utilities
 * Provides structured logging with different levels
 */

import { IS_DEV } from './constants';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  timestamp: number;
  message: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private context: string;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      message,
      context: this.context,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Only log to console in development or for errors/warnings
    if (IS_DEV || level === LogLevel.ERROR || level === LogLevel.WARN) {
      this.printToConsole(entry);
    }
  }

  private printToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level}] [${this.context}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.log(message, entry.data || '');
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.log(message, entry.data || '');
        break;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(message, entry.data || '');
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: unknown): void {
    this.log(LogLevel.ERROR, message, error);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private markers = new Map<string, number>();

  start(label: string): void {
    this.markers.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.markers.get(label);
    if (!startTime) {
      console.warn(`No start marker found for: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.markers.delete(label);
    return duration;
  }

  measure(label: string): number | null {
    const startTime = this.markers.get(label);
    return startTime ? performance.now() - startTime : null;
  }
}

export const perfMonitor = new PerformanceMonitor();
