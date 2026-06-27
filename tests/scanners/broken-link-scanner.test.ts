/**
 * Tests for Broken Link Scanner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { BrokenLinkScanner } from '@/scanners/broken-link-scanner';
import { IssueType, IssueSeverity } from '@/types';

describe('BrokenLinkScanner', () => {
  let scanner: BrokenLinkScanner;
  let dom: JSDOM;

  beforeEach(() => {
    scanner = new BrokenLinkScanner();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document as any;
    global.window = dom.window as any;
    global.HTMLElement = dom.window.HTMLElement as any;
    global.URL = dom.window.URL as any;

    // Mock CSS.escape if not available
    if (!(global.window as any).CSS) {
      (global.window as any).CSS = {};
    }
    if (!(global.window as any).CSS.escape) {
      (global.window as any).CSS.escape = (str: string) => str.replace(/(["#.:,\[\]>])/g, '\\$1');
    }
    global.CSS = (global.window as any).CSS;
  });

  describe('initialization', () => {
    it('should initialize with correct properties', () => {
      expect(scanner.type).toBe(IssueType.BROKEN_LINK);
      expect(scanner.name).toBe('Broken Link Scanner');
      expect(scanner.getEstimatedTime()).toBe(250);
    });
  });

  describe('scan', () => {
    it('should return empty array when no links exist', async () => {
      const issues = await scanner.scan();
      expect(issues).toEqual([]);
    });

    it('should detect link with no href', async () => {
      document.body.innerHTML = '<a>Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe(IssueType.BROKEN_LINK);
      expect(issues[0].severity).toBe(IssueSeverity.HIGH);
      expect(issues[0].reason).toBe('empty_href');
    });

    it('should detect link with empty href', async () => {
      document.body.innerHTML = '<a href="">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('empty_href');
    });

    it('should detect link with whitespace-only href', async () => {
      document.body.innerHTML = '<a href="   ">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('empty_href');
    });

    it('should detect javascript:void(0) links', async () => {
      document.body.innerHTML = '<a href="javascript:void(0)">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('javascript_void');
    });

    it('should detect javascript:; links', async () => {
      document.body.innerHTML = '<a href="javascript:;">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('javascript_void');
    });

    it('should detect # href without handler', async () => {
      document.body.innerHTML = '<a href="#">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('anchor_only');
    });

    it('should not flag # href with onclick handler', async () => {
      document.body.innerHTML = '<a href="#" onclick="alert(\'test\')">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag valid http URLs', async () => {
      document.body.innerHTML = '<a href="http://example.com">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag valid https URLs', async () => {
      document.body.innerHTML = '<a href="https://example.com">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag relative URLs', async () => {
      document.body.innerHTML = '<a href="/path/to/page">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag relative URLs with ./', async () => {
      document.body.innerHTML = '<a href="./page.html">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag relative URLs with ../', async () => {
      document.body.innerHTML = '<a href="../page.html">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag mailto links', async () => {
      document.body.innerHTML = '<a href="mailto:test@example.com">Email me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag tel links', async () => {
      document.body.innerHTML = '<a href="tel:+1234567890">Call me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag fragment links', async () => {
      document.body.innerHTML = '<a href="#section-1">Jump to section</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect malformed URLs', async () => {
      document.body.innerHTML = '<a href="ht!tp://invalid">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('malformed_url');
    });

    it('should skip hidden links', async () => {
      document.body.innerHTML = '<a href="" style="display:none">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect multiple broken links', async () => {
      document.body.innerHTML = `
        <a href="">Link 1</a>
        <a href="javascript:void(0)">Link 2</a>
        <a href="#">Link 3</a>
      `;
      const issues = await scanner.scan();

      expect(issues.length).toBeGreaterThanOrEqual(3);
    });

    it('should include href in issue details', async () => {
      document.body.innerHTML = '<a href="javascript:void(0)">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].href).toBe('javascript:void(0)');
    });

    it('should include element info in issues', async () => {
      document.body.innerHTML = '<a id="test-link" class="nav-link" href="">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].element).toBeDefined();
      expect(issues[0].element?.tagName.toUpperCase()).toBe('A');
      expect(issues[0].element?.id).toBe('test-link');
    });

    it('should include recommendation in issues', async () => {
      document.body.innerHTML = '<a href="">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].recommendation).toBeDefined();
      expect(issues[0].recommendation?.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs for each issue', async () => {
      document.body.innerHTML = `
        <a href="">Link 1</a>
        <a href="">Link 2</a>
      `;
      const issues = await scanner.scan();

      expect(issues).toHaveLength(2);
      expect(issues[0].id).not.toBe(issues[1].id);
    });
  });

  describe('edge cases', () => {
    it('should not flag protocol-relative URLs', async () => {
      document.body.innerHTML = '<a href="//example.com/path">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should not flag data URLs', async () => {
      document.body.innerHTML = '<a href="data:text/html,<h1>Test</h1>">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should handle links with event listener property', async () => {
      document.body.innerHTML = '<a href="#" id="test">Click me</a>';
      const link = document.getElementById('test') as any;
      link.onclick = () => alert('test');

      const issues = await scanner.scan();
      expect(issues).toHaveLength(0);
    });

    it('should detect XSS-like patterns', async () => {
      document.body.innerHTML = '<a href="javascript:alert(\'xss\')"><Click me</a>';
      const issues = await scanner.scan();

      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
