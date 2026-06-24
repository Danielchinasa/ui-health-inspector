/**
 * DOM utility functions
 * Safe DOM manipulation and querying utilities
 */

import type { ElementInfo } from '@/types';

/**
 * Generate XPath for an element
 * Used for precise element identification
 */
export function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    parts.unshift(tagName + pathIndex);

    current = current.parentElement;
  }

  return parts.length ? '/' + parts.join('/') : '';
}

/**
 * Generate a unique CSS selector for an element
 */
export function getSelector(element: Element): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();

    if (current.className) {
      const classes = Array.from(current.classList)
        .filter((cls) => cls && /^[a-zA-Z]/.test(cls))
        .slice(0, 2)
        .map((cls) => `.${CSS.escape(cls)}`)
        .join('');
      selector += classes;
    }

    path.unshift(selector);

    if (current.id || path.length > 5) {
      break;
    }

    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Extract safe element information
 * Sanitizes and limits data to prevent security issues
 */
export function getElementInfo(element: Element): ElementInfo {
  const outerHTML = element.outerHTML || '';
  const textContent = element.textContent || '';

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    xpath: getXPath(element),
    selector: getSelector(element),
    outerHTML: sanitizeHTML(outerHTML.substring(0, 200)),
    textContent: textContent.trim().substring(0, 100) || undefined,
  };
}

/**
 * Sanitize HTML to prevent XSS
 * Removes dangerous attributes and scripts
 */
export function sanitizeHTML(html: string): string {
  return (
    html
      // eslint-disable-next-line security/detect-unsafe-regex
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/javascript:/gi, '')
  );
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Get all interactive elements
 */
export function getInteractiveElements(): Element[] {
  const selectors = [
    'button',
    'a',
    '[role="button"]',
    '[role="link"]',
    'input[type="button"]',
    'input[type="submit"]',
    '[onclick]',
  ];

  return Array.from(document.querySelectorAll(selectors.join(', ')));
}

/**
 * Safely query selector with error handling
 */
export function safeQuerySelector(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.warn('Invalid selector:', selector, error);
    return null;
  }
}

/**
 * Safely query all with error handling
 */
export function safeQuerySelectorAll(selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (error) {
    console.warn('Invalid selector:', selector, error);
    return [];
  }
}

/**
 * Get element by XPath
 */
export function getElementByXPath(xpath: string): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue as Element | null;
  } catch (error) {
    console.warn('Invalid XPath:', xpath, error);
    return null;
  }
}

/**
 * Chunk array for processing
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Wait for idle time before executing
 */
export function waitForIdle(timeout: number = 50): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout });
    } else {
      setTimeout(resolve, timeout);
    }
  });
}

/**
 * Get page metadata
 */
export function getPageMetadata() {
  return {
    url: window.location.href,
    title: document.title,
    domElementCount: document.querySelectorAll('*').length,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: navigator.userAgent,
  };
}
