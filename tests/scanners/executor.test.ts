/**
 * Tests for Scanner Executor
 */

import { describe, it, expect } from 'vitest';
import { executeScanner, executeScannersParallel } from '@/scanners/executor';
import { MockScanner, FastMockScanner, FailingMockScanner } from '@/scanners/mock-scanner';

describe('Scanner Executor', () => {
  describe('executeScanner', () => {
    it('should execute a scanner successfully', async () => {
      const scanner = new FastMockScanner();
      const result = await executeScanner(scanner);

      expect(result.success).toBe(true);
      expect(result.scanner).toBe(scanner.name);
      expect(result.issues).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle scanner errors', async () => {
      const scanner = new FailingMockScanner();
      const result = await executeScanner(scanner);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.issues).toHaveLength(0);
    });

    it('should respect timeout', async () => {
      const scanner = new MockScanner(5, 2000); // 2 second scanner
      const result = await executeScanner(scanner, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      const scanner = new MockScanner(5, 1000);

      setTimeout(() => controller.abort(), 50);

      const result = await executeScanner(scanner, { abortSignal: controller.signal });

      expect(result.success).toBe(false);
      expect(result.error).toContain('abort');
    });
  });

  describe('executeScannersParallel', () => {
    it('should execute multiple scanners in parallel', async () => {
      const scanners = [new FastMockScanner(), new FastMockScanner(), new FastMockScanner()];

      const results = await executeScannersParallel(scanners);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle mix of successful and failed scanners', async () => {
      const scanners = [new FastMockScanner(), new FailingMockScanner(), new FastMockScanner()];

      const results = await executeScannersParallel(scanners);

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.success)).toHaveLength(2);
      expect(results.filter((r) => !r.success)).toHaveLength(1);
    });
  });
});
