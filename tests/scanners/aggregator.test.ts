/**
 * Tests for Result Aggregator
 */

import { describe, it, expect } from 'vitest';
import type { ScannerResult } from '@/types';
import { IssueType, IssueSeverity } from '@/types';
import { aggregateResults, deduplicateIssues, sortIssuesBySeverity } from '@/scanners/aggregator';
import { getElementInfo } from '@/utils/dom';

describe('Result Aggregator', () => {
  describe('aggregateResults', () => {
    it('should aggregate scanner results into scan result', () => {
      const scannerResults: ScannerResult[] = [
        {
          scanner: 'Test Scanner',
          issues: [
            {
              id: '1',
              type: IssueType.DEAD_BUTTON,
              severity: IssueSeverity.HIGH,
              message: 'Test issue',
              element: getElementInfo(document.body),
            },
          ],
          executionTime: 100,
          success: true,
        },
      ];

      const result = aggregateResults(scannerResults, 150);

      expect(result.url).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
      expect(result.issues).toBeDefined();
      expect(result.metadata.totalIssues).toBe(1);
      expect(result.metadata.executionTime).toBe(150);
    });

    it('should calculate health score based on issues', () => {
      const noIssues: ScannerResult[] = [
        {
          scanner: 'Clean Scanner',
          issues: [],
          executionTime: 50,
          success: true,
        },
      ];

      const resultClean = aggregateResults(noIssues, 50);
      expect(resultClean.healthScore).toBe(100);

      const withIssues: ScannerResult[] = [
        {
          scanner: 'Issue Scanner',
          issues: [
            {
              id: '1',
              type: IssueType.DEAD_BUTTON,
              severity: IssueSeverity.HIGH,
              message: 'Issue 1',
              element: getElementInfo(document.body),
            },
          ],
          executionTime: 50,
          success: true,
        },
      ];

      const resultWithIssues = aggregateResults(withIssues, 50);
      expect(resultWithIssues.healthScore).toBeLessThan(100);
    });
  });

  describe('deduplicateIssues', () => {
    it('should remove duplicate issues', () => {
      const element = getElementInfo(document.body);
      const issues = [
        {
          id: '1',
          type: IssueType.DEAD_BUTTON,
          severity: IssueSeverity.HIGH,
          message: 'Same issue',
          element,
        },
        {
          id: '2',
          type: IssueType.DEAD_BUTTON,
          severity: IssueSeverity.HIGH,
          message: 'Same issue',
          element,
        },
      ];

      const unique = deduplicateIssues(issues);
      expect(unique).toHaveLength(1);
    });
  });

  describe('sortIssuesBySeverity', () => {
    it('should sort issues by severity (HIGH, MEDIUM, LOW)', () => {
      const element = getElementInfo(document.body);
      const issues = [
        {
          id: '1',
          type: IssueType.DEAD_BUTTON,
          severity: IssueSeverity.LOW,
          message: 'Low',
          element,
        },
        {
          id: '2',
          type: IssueType.DEAD_BUTTON,
          severity: IssueSeverity.HIGH,
          message: 'High',
          element,
        },
        {
          id: '3',
          type: IssueType.DEAD_BUTTON,
          severity: IssueSeverity.MEDIUM,
          message: 'Medium',
          element,
        },
      ];

      const sorted = sortIssuesBySeverity(issues);
      expect(sorted[0].severity).toBe(IssueSeverity.HIGH);
      expect(sorted[1].severity).toBe(IssueSeverity.MEDIUM);
      expect(sorted[2].severity).toBe(IssueSeverity.LOW);
    });
  });
});
