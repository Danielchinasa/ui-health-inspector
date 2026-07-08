/**
 * Missing Image Scanner
 * Detects image elements with broken sources or failed loads
 */

import type { MissingImageIssue } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

import { getElementInfo } from '@/utils/dom';

import { BaseScanner } from './base-scanner';

/**
 * Scanner that identifies missing or broken images
 */
export class MissingImageScanner extends BaseScanner {
  constructor() {
    super(
      IssueType.MISSING_IMAGE,
      'Missing Image Scanner',
      'Detects images with broken sources or failed loads',
      200
    );
  }

  async scan(): Promise<MissingImageIssue[]> {
    this.logger.info('Starting missing image scan');
    const issues: MissingImageIssue[] = [];

    // Find all image elements
    const images = document.querySelectorAll('img');

    for (const img of Array.from(images)) {
      const issue = this.checkImage(img);
      if (issue) {
        issues.push(issue);
      }
    }

    // Also check for background images with broken URLs (optional enhancement)
    const backgroundImageIssues = this.checkBackgroundImages();
    issues.push(...backgroundImageIssues);

    this.logger.info(`Missing image scan complete: found ${issues.length} issues`);
    return issues;
  }

  private checkImage(img: HTMLImageElement): MissingImageIssue | null {
    const src = img.getAttribute('src');

    // Check for missing src attribute entirely
    if (src === null || src === undefined) {
      return this.createIssue(img, undefined, 'missing_src', 'Image has no src attribute');
    }

    // Check for empty src (JSDOM sometimes sets empty src to page URL)
    const trimmedSrc = src.trim();
    if (trimmedSrc === '' || trimmedSrc === 'about:blank') {
      return this.createIssue(img, src, 'empty_src', 'Image has empty src attribute');
    }

    // If image is still loading, don't classify it as broken yet.
    if (!img.complete) {
      return null;
    }

    // Check if image failed to load
    if (img.naturalWidth === 0 && trimmedSrc !== '') {
      return this.createIssue(img, src, 'failed_load', 'Image failed to load');
    }

    return null;
  }

  private checkBackgroundImages(): MissingImageIssue[] {
    const issues: MissingImageIssue[] = [];

    // Find elements with background images
    const allElements = document.querySelectorAll<HTMLElement>('[style*="background"], [class]');

    for (const element of Array.from(allElements)) {
      if (!this.isElementLikelyVisible(element)) {
        continue;
      }

      const style = window.getComputedStyle(element);
      const backgroundImage = style.backgroundImage;

      if (backgroundImage && backgroundImage !== 'none') {
        // Extract URL from background-image CSS
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          const url = urlMatch[1];

          // Check for data URLs (they're valid)
          if (url.startsWith('data:')) {
            continue;
          }

          // Check for empty or invalid URLs
          if (url.trim() === '' || url === 'about:blank') {
            issues.push(
              this.createIssueForElement(
                element as HTMLElement,
                url,
                'empty_src',
                'Element has empty background-image URL'
              )
            );
          }
        }
      }
    }

    return issues;
  }

  private isElementLikelyVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  private createIssue(
    img: HTMLImageElement,
    src: string | undefined,
    reason: MissingImageIssue['reason'],
    message: string
  ): MissingImageIssue {
    return {
      id: `missing-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: IssueType.MISSING_IMAGE,
      severity: IssueSeverity.MEDIUM,
      message,
      element: getElementInfo(img),
      src,
      reason,
      recommendation: this.getRecommendation(reason),
    };
  }

  private createIssueForElement(
    element: HTMLElement,
    src: string | undefined,
    reason: MissingImageIssue['reason'],
    message: string
  ): MissingImageIssue {
    return {
      id: `missing-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: IssueType.MISSING_IMAGE,
      severity: IssueSeverity.MEDIUM,
      message,
      element: getElementInfo(element),
      src,
      reason,
      recommendation: this.getRecommendation(reason),
    };
  }

  private getRecommendation(reason: MissingImageIssue['reason']): string {
    const recommendations: Record<MissingImageIssue['reason'], string> = {
      missing_src: 'Add a valid src attribute to the image element',
      failed_load: 'Verify the image URL is correct and the file exists',
      empty_src: 'Provide a valid image source URL',
    };

    return recommendations[reason];
  }
}
