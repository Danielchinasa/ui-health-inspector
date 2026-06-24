/**
 * Tests for Scanner Registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IssueType } from '@/types';
import { scannerRegistry } from '@/scanners/registry';
import { MockScanner } from '@/scanners/mock-scanner';

describe('Scanner Registry', () => {
  beforeEach(() => {
    scannerRegistry.clear();
  });

  describe('register', () => {
    it('should register a scanner', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);

      const retrieved = scannerRegistry.get(IssueType.DEAD_BUTTON);
      expect(retrieved).toBe(scanner);
    });

    it('should enable scanner by default when registered', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);

      expect(scannerRegistry.isEnabled(IssueType.DEAD_BUTTON)).toBe(true);
    });

    it('should overwrite existing scanner', () => {
      const scanner1 = new MockScanner();
      const scanner2 = new MockScanner();

      scannerRegistry.register(scanner1);
      scannerRegistry.register(scanner2);

      expect(scannerRegistry.get(IssueType.DEAD_BUTTON)).toBe(scanner2);
    });
  });

  describe('unregister', () => {
    it('should unregister a scanner', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);
      scannerRegistry.unregister(IssueType.DEAD_BUTTON);

      expect(scannerRegistry.get(IssueType.DEAD_BUTTON)).toBeUndefined();
    });

    it('should handle unregistering non-existent scanner', () => {
      expect(() => {
        scannerRegistry.unregister(IssueType.BROKEN_LINK);
      }).not.toThrow();
    });
  });

  describe('getAll / getEnabled', () => {
    it('should return all registered scanners', () => {
      const scanner1 = new MockScanner();
      const scanner2 = new MockScanner();

      scannerRegistry.register(scanner1);
      scannerRegistry.register(scanner2);

      const all = scannerRegistry.getAll();
      expect(all).toHaveLength(1); // Same type, so only 1
    });

    it('should return only enabled scanners', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);
      scannerRegistry.disable(IssueType.DEAD_BUTTON);

      const enabled = scannerRegistry.getEnabled();
      expect(enabled).toHaveLength(0);
    });
  });

  describe('enable / disable', () => {
    it('should enable a scanner', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);
      scannerRegistry.disable(IssueType.DEAD_BUTTON);
      scannerRegistry.enable(IssueType.DEAD_BUTTON);

      expect(scannerRegistry.isEnabled(IssueType.DEAD_BUTTON)).toBe(true);
    });

    it('should disable a scanner', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);
      scannerRegistry.disable(IssueType.DEAD_BUTTON);

      expect(scannerRegistry.isEnabled(IssueType.DEAD_BUTTON)).toBe(false);
    });

    it('should handle enabling non-existent scanner', () => {
      expect(() => {
        scannerRegistry.enable(IssueType.BROKEN_LINK);
      }).not.toThrow();
    });
  });

  describe('getEstimatedTime', () => {
    it('should calculate total estimated time for enabled scanners', () => {
      const scanner1 = new MockScanner(3, 100); // 100ms

      scannerRegistry.register(scanner1);

      const time = scannerRegistry.getEstimatedTime();
      expect(time).toBe(100);
    });
  });

  describe('getCount', () => {
    it('should return correct counts', () => {
      const scanner = new MockScanner();
      scannerRegistry.register(scanner);
      scannerRegistry.disable(IssueType.DEAD_BUTTON);

      const counts = scannerRegistry.getCount();
      expect(counts.total).toBe(1);
      expect(counts.enabled).toBe(0);
    });
  });
});
