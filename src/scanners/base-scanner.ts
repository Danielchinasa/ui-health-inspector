/**
 * Base Scanner Class
 * Abstract base class that all scanners should extend
 */

import type { BaseIssue, IssueType, ScannerContract } from '@/types';

import { createLogger } from '@/utils/logger';

/**
 * Abstract base scanner that implements common functionality
 */
export abstract class BaseScanner implements ScannerContract {
  protected logger;

  constructor(
    public readonly type: IssueType,
    public readonly name: string,
    public readonly description: string,
    protected readonly estimatedTime: number = 500
  ) {
    this.logger = createLogger(`Scanner:${name}`);
  }

  /**
   * Main scan method - must be implemented by subclasses
   */
  abstract scan(): Promise<BaseIssue[]>;

  /**
   * Get estimated execution time in milliseconds
   */
  getEstimatedTime(): number {
    return this.estimatedTime;
  }

  /**
   * Pre-scan validation hook
   */
  protected async beforeScan(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Post-scan cleanup hook
   */
  protected async afterScan(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Execute scan with lifecycle hooks
   */
  protected async executeScan(): Promise<BaseIssue[]> {
    await this.beforeScan();

    try {
      const issues = await this.scan();
      await this.afterScan();
      return issues;
    } catch (error) {
      await this.afterScan();
      throw error;
    }
  }
}
