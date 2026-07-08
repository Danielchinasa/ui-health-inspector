/**
 * Tests for Dead Button Scanner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { DeadButtonScanner } from '@/scanners/dead-button-scanner';
import { IssueType, IssueSeverity } from '@/types';

describe('DeadButtonScanner', () => {
  let scanner: DeadButtonScanner;
  let dom: JSDOM;

  beforeEach(() => {
    scanner = new DeadButtonScanner();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document as any;
    global.window = dom.window as any;
    global.HTMLElement = dom.window.HTMLElement as any;

    // Mock CSS.escape if not available
    if (!(global.window as any).CSS) {
      (global.window as any).CSS = {};
    }
    if (!(global.window as any).CSS.escape) {
      (global.window as any).CSS.escape = (str: string) => str.replace(/(["#.:,[]>])/g, '\\$1');
    }
    global.CSS = (global.window as any).CSS;
  });

  describe('initialization', () => {
    it('should initialize with correct properties', () => {
      expect(scanner.type).toBe(IssueType.DEAD_BUTTON);
      expect(scanner.name).toBe('Dead Button Scanner');
      expect(scanner.getEstimatedTime()).toBe(300);
    });
  });

  describe('scan', () => {
    it('should return empty array when no buttons exist', async () => {
      const issues = await scanner.scan();
      expect(issues).toEqual([]);
    });

    it('should detect button with no handler', async () => {
      document.body.innerHTML = '<button>Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe(IssueType.DEAD_BUTTON);
      expect(issues[0].severity).toBe(IssueSeverity.HIGH);
      expect(issues[0].reason).toBe('no_handler');
    });

    it('should not flag button with onclick handler', async () => {
      document.body.innerHTML = '<button onclick="alert(\'test\')">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect disabled button', async () => {
      document.body.innerHTML = '<button disabled onclick="alert(\'test\')">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('disabled');
    });

    it('should detect button with aria-disabled', async () => {
      document.body.innerHTML =
        '<button aria-disabled="true" onclick="alert(\'test\')">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('disabled');
    });

    it('should detect element with role=button but no handler', async () => {
      document.body.innerHTML = '<div role="button">Click me</div>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('role_without_handler');
    });

    it('should not flag role=button with handler', async () => {
      document.body.innerHTML = '<div role="button" onclick="alert(\'test\')">Click me</div>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect anchor with javascript:void(0) and no handler', async () => {
      document.body.innerHTML = '<a href="javascript:void(0)">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('void_href');
    });

    it('should not flag javascript:void with handler', async () => {
      document.body.innerHTML =
        '<a href="javascript:void(0)" onclick="alert(\'test\')">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect anchor with # href and no handler', async () => {
      document.body.innerHTML = '<a href="#">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('hash_href');
    });

    it('should not flag # href with handler', async () => {
      document.body.innerHTML = '<a href="#" onclick="alert(\'test\')">Click me</a>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect empty onclick handler', async () => {
      document.body.innerHTML = '<button onclick="">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('empty_onclick');
    });

    it('should detect void(0) onclick handler', async () => {
      document.body.innerHTML = '<button onclick="void(0);">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('empty_onclick');
    });

    it('should not flag button inside form with action', async () => {
      document.body.innerHTML =
        '<form action="/submit"><button type="submit">Submit</button></form>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should skip hidden buttons (display:none)', async () => {
      document.body.innerHTML = '<button style="display:none">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should skip hidden buttons (visibility:hidden)', async () => {
      document.body.innerHTML = '<button style="visibility:hidden">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(0);
    });

    it('should detect multiple dead buttons', async () => {
      document.body.innerHTML = `
        <button>Button 1</button>
        <button>Button 2</button>
        <div role="button">Button 3</div>
      `;
      const issues = await scanner.scan();

      expect(issues.length).toBeGreaterThanOrEqual(3);
    });

    it('should include element info in issues', async () => {
      document.body.innerHTML = '<button id="test-btn" class="btn-primary">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].element).toBeDefined();
      expect(issues[0].element?.tagName.toUpperCase()).toBe('BUTTON');
      expect(issues[0].element?.id).toBe('test-btn');
    });

    it('should include recommendation in issues', async () => {
      document.body.innerHTML = '<button>Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].recommendation).toBeDefined();
      expect(issues[0].recommendation?.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs for each issue', async () => {
      document.body.innerHTML = `
        <button>Button 1</button>
        <button>Button 2</button>
      `;
      const issues = await scanner.scan();

      expect(issues).toHaveLength(2);
      expect(issues[0].id).not.toBe(issues[1].id);
    });
  });

  describe('edge cases', () => {
    it('should handle input[type="button"] without handler', async () => {
      document.body.innerHTML = '<input type="button" value="Click me" />';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('no_handler');
    });

    it('should handle input[type="submit"] without form', async () => {
      document.body.innerHTML = '<input type="submit" value="Submit" />';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
    });

    it('should not flag button with event listener property', async () => {
      document.body.innerHTML = '<button id="test">Click me</button>';
      const button = document.getElementById('test') as any;
      button.onclick = () => alert('test');

      const issues = await scanner.scan();
      expect(issues).toHaveLength(0);
    });

    it('should handle elements with pointer-events:none as disabled', async () => {
      document.body.innerHTML =
        '<button style="pointer-events:none" onclick="alert(\'test\')">Click me</button>';
      const issues = await scanner.scan();

      expect(issues).toHaveLength(1);
      expect(issues[0].reason).toBe('disabled');
    });
  });
});
