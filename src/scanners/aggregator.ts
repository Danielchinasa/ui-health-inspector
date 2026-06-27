/**
 * Result Aggregator
 * Combines and processes results from multiple scanners
 */

import type {
  BaseIssue,
  IssueCollection,
  IssueType,
  ScanMetadata,
  ScannerResult,
  ScanResult,
  DeadButtonIssue,
  BrokenLinkIssue,
  MissingImageIssue,
  OverflowIssue,
  AccessibilityIssue,
  ConsoleErrorIssue,
} from '@/types';

import { createLogger } from '@/utils/logger';
import { getPageMetadata } from '@/utils/dom';

const logger = createLogger('ResultAggregator');

/**
 * Aggregate scanner results into a complete scan result
 */
export function aggregateResults(
  scannerResults: ScannerResult[],
  totalExecutionTime: number
): ScanResult {
  logger.info(`Aggregating ${scannerResults.length} scanner results`);

  // Collect all issues by type
  const issuesByType: Partial<Record<IssueType, BaseIssue[]>> = {};

  scannerResults.forEach((result) => {
    if (result.success && result.issues.length > 0) {
      result.issues.forEach((issue) => {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type]!.push(issue);
      });
    }
  });

  // Build issue collection
  const issues: IssueCollection = {
    deadButtons: (issuesByType.DEAD_BUTTON || []) as DeadButtonIssue[],
    brokenLinks: (issuesByType.BROKEN_LINK || []) as BrokenLinkIssue[],
    missingImages: (issuesByType.MISSING_IMAGE || []) as MissingImageIssue[],
    overflowIssues: (issuesByType.OVERFLOW || []) as OverflowIssue[],
    accessibility: (issuesByType.ACCESSIBILITY || []) as AccessibilityIssue[],
    consoleErrors: (issuesByType.CONSOLE_ERROR || []) as ConsoleErrorIssue[],
  };

  // Calculate metadata
  const pageMetadata = getPageMetadata();
  const metadata: ScanMetadata = {
    scanDuration: totalExecutionTime,
    domElementCount: pageMetadata.domElementCount,
    scannersExecuted: scannerResults.filter((r) => r.success).map((r) => r.scanner),
    browserInfo: {
      userAgent: pageMetadata.userAgent,
      viewport: pageMetadata.viewport,
    },
    totalIssues: Object.values(issuesByType).reduce((sum, arr) => sum + arr.length, 0),
    executionTime: totalExecutionTime,
  };

  // Calculate health score (will be enhanced in Phase 6)
  const healthScore = calculateHealthScore(issues);

  const result: ScanResult = {
    url: pageMetadata.url,
    timestamp: Date.now(),
    healthScore,
    issues,
    metadata,
  };

  logger.info(`Aggregation complete: ${metadata.totalIssues} issues, health score: ${healthScore}`);

  return result;
}

/**
 * Calculate preliminary health score
 * Enhanced scoring based on issue severity
 */
function calculateHealthScore(issues: IssueCollection): number {
  // Start with perfect score
  let score = 100;

  // Calculate severity-weighted deductions
  const calculateDeductions = (issueList: BaseIssue[]) => {
    return issueList.reduce((total, issue) => {
      switch (issue.severity) {
        case 'HIGH':
          return total + 2;
        case 'MEDIUM':
          return total + 1;
        case 'LOW':
          return total + 0.5;
        default:
          return total + 1;
      }
    }, 0);
  };

  // Apply severity-based deductions for each issue type
  score -= calculateDeductions(issues.deadButtons);
  score -= calculateDeductions(issues.brokenLinks);
  score -= calculateDeductions(issues.missingImages);
  score -= calculateDeductions(issues.overflowIssues);
  score -= calculateDeductions(issues.accessibility);
  score -= calculateDeductions(issues.consoleErrors);

  // Set a minimum score threshold to avoid overly harsh scores
  // Even sites with many issues should show some score above 0
  const minimumScore = 30;

  // Ensure score stays in valid range
  return Math.max(minimumScore, Math.min(100, Math.round(score)));
}

/**
 * Deduplicate issues based on element info
 */
export function deduplicateIssues(issues: BaseIssue[]): BaseIssue[] {
  const seen = new Set<string>();
  const unique: BaseIssue[] = [];

  for (const issue of issues) {
    // Create a unique key based on element info
    const key = `${issue.type}:${issue.element?.xpath ?? 'no-element'}:${issue.message}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(issue);
    }
  }

  if (issues.length !== unique.length) {
    logger.debug(`Deduplicated ${issues.length - unique.length} duplicate issues`);
  }

  return unique;
}

/**
 * Sort issues by severity
 */
export function sortIssuesBySeverity(issues: BaseIssue[]): BaseIssue[] {
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return [...issues].sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Group issues by page section
 */
export function groupIssuesBySection(issues: BaseIssue[]): Map<string, BaseIssue[]> {
  const groups = new Map<string, BaseIssue[]>();

  issues.forEach((issue) => {
    // Extract section from xpath (simple heuristic)
    const section = extractSection(issue.element?.xpath ?? '');

    if (!groups.has(section)) {
      groups.set(section, []);
    }
    groups.get(section)!.push(issue);
  });

  return groups;
}

/**
 * Extract section from xpath
 */
function extractSection(xpath: string): string {
  // Simple heuristic: use the first major element
  const match = xpath.match(/\/\/(header|nav|main|section|article|aside|footer)/i);
  return match ? match[1] : 'other';
}

/**
 * Get issue statistics
 */
export function getIssueStatistics(issues: IssueCollection): {
  total: number;
  bySeverity: { high: number; medium: number; low: number };
  byType: Record<string, number>;
} {
  const allIssues = [
    ...issues.deadButtons,
    ...issues.brokenLinks,
    ...issues.missingImages,
    ...issues.overflowIssues,
    ...issues.accessibility,
    ...issues.consoleErrors,
  ];

  const bySeverity = {
    high: allIssues.filter((i) => i.severity === 'HIGH').length,
    medium: allIssues.filter((i) => i.severity === 'MEDIUM').length,
    low: allIssues.filter((i) => i.severity === 'LOW').length,
  };

  const byType: Record<string, number> = {
    DEAD_BUTTON: issues.deadButtons.length,
    BROKEN_LINK: issues.brokenLinks.length,
    MISSING_IMAGE: issues.missingImages.length,
    OVERFLOW: issues.overflowIssues.length,
    ACCESSIBILITY: issues.accessibility.length,
    CONSOLE_ERROR: issues.consoleErrors.length,
  };

  return {
    total: allIssues.length,
    bySeverity,
    byType,
  };
}
