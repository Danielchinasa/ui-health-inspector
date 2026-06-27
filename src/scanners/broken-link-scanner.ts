/**
 * Broken Link Scanner
 * Detects anchor tags with invalid or problematic href attributes
 */

import type { BrokenLinkIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { getElementInfo } from '@/utils/dom';

import { BaseScanner } from './base-scanner';

/**
 * Scanner that identifies broken or invalid links
 */
export class BrokenLinkScanner extends BaseScanner {
  constructor() {
    super(
      IssueType.BROKEN_LINK,
      'Broken Link Scanner',
      'Detects invalid, empty, or malformed links',
      250
    );
  }

  async scan(): Promise<BrokenLinkIssue[]> {
    this.logger.info('Starting broken link scan');
    const issues: BrokenLinkIssue[] = [];

    // Find all anchor tags
    const links = document.querySelectorAll('a');

    for (const link of Array.from(links)) {
      const issue = this.checkLink(link);
      if (issue) {
        issues.push(issue);
      }
    }

    this.logger.info(`Broken link scan complete: found ${issues.length} issues`);
    return issues;
  }

  private checkLink(link: HTMLAnchorElement): BrokenLinkIssue | null {
    // Skip if link is not visible
    if (!this.isVisible(link)) {
      return null;
    }

    const href = link.getAttribute('href');

    // Check for missing href
    if (!href) {
      return this.createIssue(link, '', 'empty_href', 'Link has no href attribute');
    }

    // Check for empty href
    if (href.trim() === '') {
      return this.createIssue(link, href, 'empty_href', 'Link has empty href attribute');
    }

    // Check for javascript:void(0) or similar
    if (href === 'javascript:void(0)' || href === 'javascript:;' || href === 'javascript:') {
      return this.createIssue(
        link,
        href,
        'javascript_void',
        'Link uses javascript:void instead of proper navigation'
      );
    }

    // Check for anchor-only links (just #)
    if (href === '#') {
      // Only flag if there's no click handler
      if (!this.hasEventHandler(link)) {
        return this.createIssue(
          link,
          href,
          'anchor_only',
          'Link href is just "#" with no event handler'
        );
      }
    }

    // Check for malformed URLs
    if (this.isMalformedUrl(href)) {
      return this.createIssue(link, href, 'malformed_url', 'Link has malformed URL');
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

  private hasEventHandler(element: HTMLElement): boolean {
    // Check for onclick attribute
    if (element.hasAttribute('onclick')) {
      return true;
    }

    // Check for event listener properties
    const eventProperties = ['onclick', 'onmousedown', 'onmouseup'];
    for (const prop of eventProperties) {
      if ((element as any)[prop]) {
        return true;
      }
    }

    return false;
  }

  private isMalformedUrl(href: string): boolean {
    // Skip fragment-only links, they're valid
    if (href.startsWith('#')) {
      return false;
    }

    // Skip mailto:, tel:, and other protocols
    if (
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('sms:') ||
      href.startsWith('data:')
    ) {
      return false;
    }

    // Check for relative URLs (they're valid)
    if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
      return false;
    }

    // Check for absolute URLs
    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        new URL(href);
        return false; // Valid URL
      } catch {
        return true; // Malformed URL
      }
    }

    // Check for protocol-relative URLs
    if (href.startsWith('//')) {
      try {
        new URL(`https:${href}`);
        return false;
      } catch {
        return true;
      }
    }

    // If it contains invalid characters or patterns
    if (href.includes('><') || href.includes('javascript:alert') || /^ht[^t]/.test(href)) {
      return true;
    }

    return false;
  }

  private createIssue(
    link: HTMLAnchorElement,
    href: string,
    reason: BrokenLinkIssue['reason'],
    message: string
  ): BrokenLinkIssue {
    return {
      id: `broken-link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: IssueType.BROKEN_LINK,
      severity: IssueSeverity.HIGH,
      message,
      element: getElementInfo(link),
      href,
      reason,
      recommendation: this.getRecommendation(reason),
    };
  }

  private getRecommendation(reason: BrokenLinkIssue['reason']): string {
    const recommendations: Record<BrokenLinkIssue['reason'], string> = {
      empty_href: 'Add a valid href attribute or use a button element instead',
      malformed_url: 'Fix the URL format or remove the link',
      anchor_only: 'Add a valid href or implement a click handler',
      javascript_void: 'Use a button element or add a proper navigation target',
    };

    return recommendations[reason];
  }
}
