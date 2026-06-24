/**
 * Mock Scanner for Testing
 * Simple scanner implementation for Phase 2 testing
 */

import type { BaseIssue } from '@/types';
import { IssueType } from '@/types';

import { getElementInfo } from '@/utils/dom';

import { BaseScanner } from './base-scanner';

/**
 * Mock scanner that finds test issues
 */
export class MockScanner extends BaseScanner {
  constructor(
    private issueCount: number = 3,
    private delay: number = 100
  ) {
    super(IssueType.DEAD_BUTTON, 'Mock Scanner', 'Mock scanner for testing scanner engine', delay);
  }

  async scan(): Promise<BaseIssue[]> {
    this.logger.info(`Running mock scan (will find ${this.issueCount} issues)`);

    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    const issues: BaseIssue[] = [];

    // Find some buttons on the page
    const buttons = document.querySelectorAll('button, [role="button"]');

    for (let i = 0; i < Math.min(this.issueCount, buttons.length); i++) {
      const button = buttons[i];

      issues.push({
        id: `mock-${Date.now()}-${i}`,
        type: IssueType.DEAD_BUTTON,
        severity: 'MEDIUM',
        message: `Mock issue ${i + 1}: Potential dead button detected`,
        element: getElementInfo(button),
        timestamp: Date.now(),
        recommendation: 'This is a mock issue for testing purposes',
      } as BaseIssue);
    }

    this.logger.info(`Mock scan complete, found ${issues.length} issues`);
    return issues;
  }
}

/**
 * Fast mock scanner for performance testing
 */
export class FastMockScanner extends MockScanner {
  constructor() {
    super(1, 10); // 1 issue, 10ms delay
  }
}

/**
 * Slow mock scanner for timeout testing
 */
export class SlowMockScanner extends MockScanner {
  constructor() {
    super(5, 2000); // 5 issues, 2 second delay
  }
}

/**
 * Failing mock scanner for error handling testing
 */
export class FailingMockScanner extends BaseScanner {
  constructor() {
    super(IssueType.CONSOLE_ERROR, 'Failing Mock Scanner', 'Mock scanner that always fails', 100);
  }

  async scan(): Promise<BaseIssue[]> {
    this.logger.warn('This scanner will fail intentionally');
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('Mock scanner failure for testing error handling');
  }
}
