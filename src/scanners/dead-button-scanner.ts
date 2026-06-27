/**
 * Dead Button Scanner
 * Detects interactive elements (buttons, clickable divs) that appear non-functional
 */

import type { DeadButtonIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { getElementInfo } from '@/utils/dom';

import { BaseScanner } from './base-scanner';

/**
 * Scanner that identifies dead or non-functional interactive elements
 */
export class DeadButtonScanner extends BaseScanner {
  constructor() {
    super(
      IssueType.DEAD_BUTTON,
      'Dead Button Scanner',
      'Detects buttons and interactive elements without handlers',
      300
    );
  }

  async scan(): Promise<DeadButtonIssue[]> {
    this.logger.info('Starting dead button scan');
    const issues: DeadButtonIssue[] = [];

    // Find all potential interactive elements
    const selectors = [
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      '[role="button"]',
      '[onclick]',
      'a', // Check all anchors for problematic hrefs
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    for (const element of Array.from(elements)) {
      const issue = this.checkElement(element as HTMLElement);
      if (issue) {
        issues.push(issue);
      }
    }

    this.logger.info(`Dead button scan complete: found ${issues.length} issues`);
    return issues;
  }

  private checkElement(element: HTMLElement): DeadButtonIssue | null {
    // Skip if element is not visible
    if (!this.isVisible(element)) {
      return null;
    }

    // Skip if element appears to be managed by modern frameworks
    if (this.isFrameworkManaged(element)) {
      return null;
    }

    // Check for disabled state - but with lower severity as it might be intentional
    if (this.isDisabled(element)) {
      // Only flag if it seems unintentional (no aria-label explaining why)
      if (!element.hasAttribute('aria-label') && !element.hasAttribute('title')) {
        return this.createIssue(
          element,
          'disabled',
          'Element is disabled and non-interactive',
          IssueSeverity.LOW
        );
      }
      return null; // Skip intentionally disabled buttons with labels
    }

    // Check for elements with role="button" but no handlers
    if (element.getAttribute('role') === 'button' && !this.hasEventHandler(element)) {
      return this.createIssue(
        element,
        'role_without_handler',
        'Element has role="button" but no click handler',
        IssueSeverity.MEDIUM
      );
    }

    // Check buttons without handlers
    if (
      (element.tagName === 'BUTTON' ||
        element.tagName === 'INPUT' ||
        element.getAttribute('role') === 'button') &&
      !this.hasEventHandler(element) &&
      !this.hasFormAction(element)
    ) {
      return this.createIssue(
        element,
        'no_handler',
        'Interactive element has no click handler or form action',
        IssueSeverity.HIGH
      );
    }

    // Check for onclick with empty or void content
    const onclick = element.getAttribute('onclick');
    if (onclick !== null && this.isEmptyHandler(onclick)) {
      return this.createIssue(
        element,
        'empty_onclick',
        'Element has empty onclick handler',
        IssueSeverity.HIGH
      );
    }

    // Check for anchor tags with void javascript
    if (element.tagName === 'A') {
      const href = (element as HTMLAnchorElement).getAttribute('href');

      // Skip anchors with valid navigation targets
      if (!href || href.trim() === '') {
        // Empty href is handled by BrokenLinkScanner
        return null;
      }

      if (href === 'javascript:void(0)' || href === 'javascript:;') {
        if (!this.hasEventHandler(element)) {
          return this.createIssue(
            element,
            'void_href',
            'Link has javascript:void href but no event handler',
            IssueSeverity.MEDIUM
          );
        }
      } else if (href === '#' && !this.hasEventHandler(element)) {
        return this.createIssue(
          element,
          'hash_href',
          'Link has # href but no event handler',
          IssueSeverity.LOW
        );
      }

      // Skip other anchors (valid hrefs, or with handlers)
      return null;
    }

    return null;
  }

  private isVisible(element: HTMLElement): boolean {
    // Check inline styles first (more reliable in tests)
    const inlineStyle = element.style;
    if (
      inlineStyle.display === 'none' ||
      inlineStyle.visibility === 'hidden' ||
      inlineStyle.opacity === '0'
    ) {
      return false;
    }

    // Try computed styles if available
    try {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    } catch (e) {
      // getComputedStyle might not be available in some environments
    }

    return true;
  }

  private isDisabled(element: HTMLElement): boolean {
    // Check disabled attribute
    if ((element as HTMLButtonElement | HTMLInputElement).disabled) {
      return true;
    }

    // Check aria-disabled
    if (element.getAttribute('aria-disabled') === 'true') {
      return true;
    }

    // Check pointer-events
    const style = window.getComputedStyle(element);
    if (style.pointerEvents === 'none') {
      return true;
    }

    return false;
  }

  /**
   * Check if element is managed by modern frameworks (React, Vue, Angular, etc.)
   * These frameworks attach event handlers programmatically via addEventListener
   */
  private isFrameworkManaged(element: HTMLElement): boolean {
    // Check for React fiber internals
    const reactKeys = Object.keys(element).filter(
      (key) => key.startsWith('__react') || key.startsWith('_react')
    );
    if (reactKeys.length > 0) {
      return true;
    }

    // Check for Vue internals
    if ((element as any).__vue__ || (element as any).__vueParentComponent) {
      return true;
    }

    // Check for Angular attributes
    if (
      element.hasAttribute('ng-click') ||
      element.hasAttribute('(click)') ||
      element.hasAttribute('ng-bind') ||
      element.hasAttribute('[click]')
    ) {
      return true;
    }

    // Check for framework-specific data attributes
    if (
      element.hasAttribute('data-react-') ||
      element.hasAttribute('data-vue-') ||
      element.hasAttribute('data-ng-')
    ) {
      return true;
    }

    return false;
  }

  private hasEventHandler(element: HTMLElement): boolean {
    // Check for onclick attribute
    if (element.hasAttribute('onclick')) {
      return true;
    }

    // Check for attached event listeners (limited to detecting via properties)
    // Note: We can't detect addEventListener listeners, but we can check common patterns
    const eventProperties = ['onclick', 'onmousedown', 'onmouseup', 'onpointerdown'];
    for (const prop of eventProperties) {
      if ((element as any)[prop]) {
        return true;
      }
    }

    // Check if element is inside a form with action
    if (this.isInsideFormWithAction(element)) {
      return true;
    }

    return false;
  }

  private hasFormAction(element: HTMLElement): boolean {
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
      const form = (element as HTMLButtonElement | HTMLInputElement).form;
      if (form && form.action) {
        return true;
      }
    }
    return false;
  }

  private isInsideFormWithAction(element: HTMLElement): boolean {
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'FORM' && (parent as HTMLFormElement).action) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  private isEmptyHandler(handler: string): boolean {
    const trimmed = handler.trim();
    return (
      trimmed === '' ||
      trimmed === 'return false' ||
      trimmed === 'void(0)' ||
      trimmed === 'void(0);'
    );
  }

  private createIssue(
    element: HTMLElement,
    reason: DeadButtonIssue['reason'],
    message: string,
    severity: IssueSeverity = IssueSeverity.HIGH
  ): DeadButtonIssue {
    return {
      id: `dead-button-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: IssueType.DEAD_BUTTON,
      severity,
      message,
      element: getElementInfo(element),
      reason,
      recommendation: this.getRecommendation(reason),
    };
  }

  private getRecommendation(reason: DeadButtonIssue['reason']): string {
    const recommendations: Record<DeadButtonIssue['reason'], string> = {
      empty_onclick: 'Remove the empty onclick handler or add meaningful functionality',
      hash_href: 'Add a click event handler or change href to a valid URL',
      void_href: 'Add a click event handler or use a button element instead',
      no_handler: 'Add a click event handler or remove the interactive appearance',
      disabled: 'Consider removing disabled elements or provide user feedback',
      role_without_handler:
        'Add a click event handler and keyboard support (tabindex, Enter/Space keys)',
    };

    return recommendations[reason];
  }
}
