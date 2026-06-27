/**
 * Accessibility Scanner
 * Detects common accessibility issues
 */

import type { AccessibilityIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { getElementInfo } from '@/utils/dom';

import { BaseScanner } from './base-scanner';

/**
 * Scanner that identifies accessibility issues
 */
export class AccessibilityScanner extends BaseScanner {
  constructor() {
    super(
      IssueType.ACCESSIBILITY,
      'Accessibility Scanner',
      'Detects accessibility issues (WCAG violations)',
      250
    );
  }

  async scan(): Promise<AccessibilityIssue[]> {
    this.logger.info('Starting accessibility scan');
    const issues: AccessibilityIssue[] = [];

    // Check images for alt text
    issues.push(...this.checkImages());

    // Check form inputs for labels
    issues.push(...this.checkFormInputs());

    // Check buttons for accessible names
    issues.push(...this.checkButtons());

    // Check headings hierarchy
    issues.push(...this.checkHeadings());

    // Check links for accessible text
    issues.push(...this.checkLinks());

    this.logger.info(`Accessibility scan complete: found ${issues.length} issues`);
    return issues;
  }

  private checkImages(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const images = document.querySelectorAll('img');

    for (const img of Array.from(images)) {
      if (!this.isVisible(img)) continue;

      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');

      // Skip decorative images (role="presentation" or role="none")
      if (role === 'presentation' || role === 'none') {
        continue;
      }

      if (alt === null) {
        issues.push(this.createIssue(img, 'missing_alt', 'Image is missing alt attribute', 'A'));
      } else if (alt.trim() === '' && !role) {
        // Empty alt without decorative role - could be missing_aria_label issue
        issues.push(
          this.createIssue(
            img,
            'missing_aria_label',
            'Image has empty alt text without decorative role',
            'A'
          )
        );
      }
    }

    return issues;
  }

  private checkFormInputs(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const inputs = document.querySelectorAll('input, textarea, select');

    for (const input of Array.from(inputs)) {
      if (!this.isVisible(input as HTMLElement)) continue;

      const element = input as HTMLInputElement;
      const type = element.type;

      // Skip hidden inputs and buttons (handled separately)
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') {
        continue;
      }

      const id = element.id;
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const title = element.getAttribute('title');

      // Check if input has an associated label
      let hasLabel = false;

      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) hasLabel = true;
      }

      // Check if wrapped in label
      const parent = element.parentElement;
      if (parent && parent.tagName === 'LABEL') {
        hasLabel = true;
      }

      // Check ARIA attributes
      if (ariaLabel || ariaLabelledBy || title) {
        hasLabel = true;
      }

      if (!hasLabel) {
        issues.push(
          this.createIssue(
            element,
            'missing_label',
            `Form ${element.tagName.toLowerCase()} is missing a label`,
            'AA'
          )
        );
      }
    }

    return issues;
  }

  private checkButtons(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const buttons = document.querySelectorAll('button, [role="button"]');

    for (const button of Array.from(buttons)) {
      if (!this.isVisible(button as HTMLElement)) continue;

      const element = button as HTMLElement;
      const text = element.textContent?.trim() || '';
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const title = element.getAttribute('title');

      // Check if button has accessible name
      if (!text && !ariaLabel && !ariaLabelledBy && !title) {
        issues.push(
          this.createIssue(
            element,
            'empty_button',
            'Button is missing accessible name (text, aria-label, or title)',
            'A'
          )
        );
      }
    }

    return issues;
  }

  private checkHeadings(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    let previousLevel = 0;

    for (const heading of Array.from(headings)) {
      if (!this.isVisible(heading as HTMLElement)) continue;

      const element = heading as HTMLElement;
      const level = parseInt(element.tagName.substring(1), 10);

      // Check for skipped heading levels - map to missing_aria_label as closest match
      if (previousLevel > 0 && level > previousLevel + 1) {
        issues.push(
          this.createIssue(
            element,
            'missing_aria_label',
            `Heading level skipped from h${previousLevel} to h${level}`,
            'A'
          )
        );
      }

      previousLevel = level;
    }

    return issues;
  }

  private checkLinks(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const links = document.querySelectorAll('a');

    for (const link of Array.from(links)) {
      if (!this.isVisible(link)) continue;

      const text = link.textContent?.trim() || '';
      const ariaLabel = link.getAttribute('aria-label');
      const title = link.getAttribute('title');

      // Check for links without text
      if (!text && !ariaLabel && !title) {
        issues.push(
          this.createIssue(link, 'missing_aria_label', 'Link has no text or accessible name', 'A')
        );
      }
    }

    return issues;
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
    reason: AccessibilityIssue['reason'],
    message: string,
    wcagLevel?: 'A' | 'AA' | 'AAA'
  ): AccessibilityIssue {
    return {
      id: `accessibility-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: IssueType.ACCESSIBILITY,
      severity: IssueSeverity.MEDIUM,
      message,
      element: getElementInfo(element),
      reason,
      wcagLevel,
      recommendation: this.getRecommendation(reason),
    };
  }

  private getRecommendation(reason: AccessibilityIssue['reason']): string {
    const recommendations: Record<AccessibilityIssue['reason'], string> = {
      missing_alt: 'Add descriptive alt text to the image',
      missing_label: 'Add a <label> element or aria-label attribute',
      empty_button: 'Add text content, aria-label, or title attribute to the button',
      missing_aria_label: 'Add aria-label attribute to provide accessible name',
      low_contrast: 'Increase color contrast to meet WCAG AA standards (4.5:1)',
    };

    return recommendations[reason] || 'Fix accessibility issue';
  }
}
