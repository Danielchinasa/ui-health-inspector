/**
 * Overflow Scanner
 * Detects elements with overflow issues that create unwanted scrollbars
 */

import type { OverflowIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { getElementInfo } from '@/utils/dom';

import { BaseScanner } from './base-scanner';

/**
 * Scanner that identifies elements with horizontal overflow
 */
export class OverflowScanner extends BaseScanner {
  constructor() {
    super(
      IssueType.OVERFLOW,
      'Overflow Scanner',
      'Detects elements causing horizontal scrollbars',
      200
    );
  }

  async scan(): Promise<OverflowIssue[]> {
    this.logger.info('Starting overflow scan');
    const issues: OverflowIssue[] = [];

    // Get all elements
    const elements = document.querySelectorAll('*');

    for (const element of Array.from(elements)) {
      const issue = this.checkElement(element as HTMLElement);
      if (issue) {
        issues.push(issue);
      }
    }

    this.logger.info(`Overflow scan complete: found ${issues.length} issues`);
    return issues;
  }

  private checkElement(element: HTMLElement): OverflowIssue | null {
    // Skip invisible elements
    if (!this.isVisible(element)) {
      return null;
    }

    // Skip certain elements that commonly have overflow by design
    const tagName = element.tagName.toLowerCase();
    if (['html', 'body', 'script', 'style', 'meta', 'link', 'head'].includes(tagName)) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    // Check for horizontal overflow
    if (element.scrollWidth > element.clientWidth) {
      const overflowAmount = element.scrollWidth - element.clientWidth;

      // Only report if overflow is significant (more than 5px) and not intentional
      if (
        overflowAmount > 5 &&
        style.overflowX !== 'auto' &&
        style.overflowX !== 'scroll' &&
        style.overflowX !== 'hidden'
      ) {
        return this.createIssue(
          element,
          'horizontal',
          `Element width exceeds container by ${overflowAmount}px`,
          element.scrollWidth,
          element.clientWidth,
          overflowAmount
        );
      }
    }

    // Check if element extends beyond viewport
    const viewportWidth = window.innerWidth;
    if (rect.right > viewportWidth + 10) {
      const overflowAmount = Math.round(rect.right - viewportWidth);
      return this.createIssue(
        element,
        'viewport',
        `Element extends ${overflowAmount}px beyond viewport`,
        Math.round(rect.width),
        viewportWidth,
        overflowAmount
      );
    }

    return null;
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return true;
  }

  private createIssue(
    element: HTMLElement,
    overflowType: 'horizontal' | 'viewport',
    message: string,
    scrollWidth: number,
    clientWidth: number,
    overflowAmount: number
  ): OverflowIssue {
    return {
      id: `overflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: IssueType.OVERFLOW,
      severity: IssueSeverity.MEDIUM,
      message,
      element: getElementInfo(element),
      scrollWidth,
      clientWidth,
      overflowAmount,
      recommendation: this.getRecommendation(overflowType),
    };
  }

  private getRecommendation(overflowType: 'horizontal' | 'viewport'): string {
    if (overflowType === 'horizontal') {
      return 'Add overflow-x: hidden or adjust element width to fit container';
    }
    return 'Use responsive design (max-width: 100%) or media queries to fit viewport';
  }
}
