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
