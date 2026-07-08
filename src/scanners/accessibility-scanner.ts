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

    // Document-level checks
    issues.push(...this.checkDocumentLang());

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

    // Detect duplicate id attributes
    issues.push(...this.checkDuplicateIds());

    // Contrast ratio checks (WCAG AA)
    issues.push(...this.checkLowContrast());

    // Focus indicator checks
    issues.push(...this.checkFocusIndicators());

    this.logger.info(`Accessibility scan complete: found ${issues.length} issues`);
    return issues;
  }

  /**
   * Check that the root <html> element has a lang attribute.
   * WCAG 3.1.1 (Level A)
   */
  private checkDocumentLang(): AccessibilityIssue[] {
    const html = document.documentElement;
    const lang = html.getAttribute('lang');
    if (!lang || lang.trim() === '') {
      return [
        this.createIssue(
          html as unknown as HTMLElement,
          'missing_lang',
          'The <html> element is missing a lang attribute. Screen readers need this to select the correct language engine.',
          'A'
        ),
      ];
    }
    return [];
  }

  /**
   * Detect elements sharing the same id attribute.
   * Duplicate ids break label associations, ARIA relationships and in-page anchors.
   * WCAG 4.1.1 (Level A)
   */
  private checkDuplicateIds(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const idMap = new Map<string, HTMLElement[]>();

    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[id]'))) {
      const id = el.id;
      if (!id) continue;
      const list = idMap.get(id) ?? [];
      list.push(el);
      idMap.set(id, list);
    }

    for (const [id, elements] of idMap.entries()) {
      if (elements.length < 2) continue;
      // Report only the duplicate occurrences (skip the first/original)
      for (const el of elements.slice(1)) {
        if (!this.isVisible(el)) continue;
        issues.push(
          this.createIssue(
            el,
            'duplicate_id',
            `Duplicate id "${id}" found on ${elements.length} elements. IDs must be unique per page.`,
            'A'
          )
        );
      }
    }

    return issues;
  }

  /**
   * Check text elements for insufficient colour contrast (WCAG 1.4.3 AA).
   * Examines the first 100 visible text-bearing elements to balance coverage and speed.
   */
  private checkLowContrast(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'p, h1, h2, h3, h4, h5, h6, a, li, span, label, button, td, th'
      )
    )
      .filter((el) => this.isVisible(el) && (el.textContent?.trim().length ?? 0) > 0)
      .slice(0, 100);

    const seenPairs = new Set<string>();

    for (const element of elements) {
      try {
        const style = window.getComputedStyle(element);
        const fgColor = style.color;
        const bgColor = this.getEffectiveBackground(element);

        if (!fgColor || !bgColor) continue;

        const fg = this.parseRGB(fgColor);
        const bg = this.parseRGB(bgColor);

        if (!fg || !bg) continue;

        const key = `${fgColor}|${bgColor}`;
        if (seenPairs.has(key)) continue; // Skip identical colour pairs already reported
        seenPairs.add(key);

        const fgLum = this.relativeLuminance(...fg);
        const bgLum = this.relativeLuminance(...bg);
        const ratio = this.contrastRatio(fgLum, bgLum);

        if (ratio < 0.1) continue; // Likely transparent / unparseable colours

        const fontSize = parseFloat(style.fontSize);
        const isLargeText =
          fontSize >= 18 || (fontSize >= 14 && parseInt(style.fontWeight, 10) >= 700);
        const required = isLargeText ? 3.0 : 4.5;

        if (ratio < required) {
          issues.push(
            this.createIssue(
              element,
              'low_contrast',
              `Contrast ratio ${ratio.toFixed(1)}:1 is below the WCAG AA minimum of ${required}:1 for ${isLargeText ? 'large' : 'normal'} text`,
              'AA'
            )
          );
        }
      } catch {
        // Computed style unavailable — skip
      }
    }

    return issues;
  }

  /**
   * Detect CSS rules that remove the keyboard focus outline without providing
   * a visible alternative (e.g. box-shadow). WCAG 2.4.7 (Level AA).
   */
  private checkFocusIndicators(): AccessibilityIssue[] {
    let offendingSelector = '';

    try {
      for (const sheet of Array.from(document.styleSheets)) {
        if (offendingSelector) break;
        try {
          for (const rule of Array.from(sheet.cssRules ?? [])) {
            if (!(rule instanceof CSSStyleRule)) continue;
            const sel = rule.selectorText ?? '';
            if (!sel.includes(':focus')) continue;

            const outline = rule.style.outline;
            const outlineStyle = rule.style.outlineStyle;
            const isRemoved = outline === 'none' || outline === '0' || outlineStyle === 'none';

            if (isRemoved) {
              // Allow removal when a box-shadow alternative is provided
              const boxShadow = rule.style.boxShadow;
              if (!boxShadow || boxShadow === 'none') {
                offendingSelector = sel;
                break;
              }
            }
          }
        } catch {
          // Cross-origin stylesheet — skip
        }
      }
    } catch {
      // styleSheets access failed
    }

    if (!offendingSelector) return [];

    return [
      this.createIssue(
        document.body,
        'focus_indicator_removed',
        `Focus outline suppressed in CSS rule "${offendingSelector}" with no visible alternative — keyboard navigation is impaired`,
        'AA'
      ),
    ];
  }

  // ─── Colour contrast helpers ────────────────────────────────────────────────

  private parseRGB(color: string): [number, number, number] | null {
    const match = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  }

  private relativeLuminance(r: number, g: number, b: number): number {
    const toLinear = (c: number): number => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  private contrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private getEffectiveBackground(element: HTMLElement): string | null {
    let el: HTMLElement | null = element;
    while (el && el !== document.documentElement) {
      try {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
      } catch {
        // skip
      }
      el = el.parentElement;
    }
    return 'rgb(255, 255, 255)'; // Default: white background
  }

  // ─── Existing checks ────────────────────────────────────────────────────────

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
      const wrappedLabel = element.closest('label');
      if (wrappedLabel) {
        hasLabel = true;
      }

      // Check ARIA attributes
      if (ariaLabel || title) {
        hasLabel = true;
      }

      if (ariaLabelledBy) {
        const ids = ariaLabelledBy
          .split(/\s+/)
          .map((idRef) => idRef.trim())
          .filter(Boolean);
        hasLabel = ids.some((idRef) => document.getElementById(idRef) !== null);
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
      const hasNamedIcon =
        element.querySelector('svg[aria-label], img[alt]:not([alt=""])') !== null;

      // Check if button has accessible name
      if (!text && !ariaLabel && !ariaLabelledBy && !title && !hasNamedIcon) {
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
      const hasNamedImage = link.querySelector('img[alt]:not([alt=""])') !== null;
      const hasNamedSvg = link.querySelector('svg[aria-label], svg title') !== null;

      // Check for links without text
      if (!text && !ariaLabel && !title && !hasNamedImage && !hasNamedSvg) {
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
      low_contrast:
        'Increase color contrast to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)',
      duplicate_id: 'Ensure all id attributes are unique within the page',
      missing_lang: 'Add a lang attribute to the <html> element (e.g. lang="en")',
      focus_indicator_removed:
        'Remove "outline: none" from :focus rules or provide a visible alternative such as box-shadow',
    };

    return recommendations[reason] ?? 'Fix accessibility issue';
  }
}
