/**
 * Scanner Engine Exports
 * Public API for the scanner system
 */

// Core components
export { scannerRegistry } from './registry';
export { orchestrator } from './orchestrator';

// Executor functions
export {
  executeScanner,
  executeScannersParallel,
  executeScannersSequential,
  executeScannersChunked,
  executeWithRetry,
  type ExecutorOptions,
} from './executor';

// Aggregation functions
export {
  aggregateResults,
  deduplicateIssues,
  sortIssuesBySeverity,
  groupIssuesBySection,
  getIssueStatistics,
} from './aggregator';

// Types
export type { ScanOptions } from './orchestrator';

// Base scanner class
export { BaseScanner } from './base-scanner';

// Scanner implementations
export { DeadButtonScanner } from './dead-button-scanner';
export { BrokenLinkScanner } from './broken-link-scanner';
export { MissingImageScanner } from './missing-image-scanner';
export { OverflowScanner } from './overflow-scanner';
export { AccessibilityScanner } from './accessibility-scanner';
export { ConsoleErrorScanner } from './console-error-scanner';
