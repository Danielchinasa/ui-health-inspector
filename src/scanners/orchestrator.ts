/**
 * Scanner Orchestrator
 * High-level API for running scans and managing the scanner lifecycle
 */

import type { IssueType, ScanResult, ScannerContract } from '@/types';
import { ErrorCode, ExtensionError } from '@/types';

import { TARGET_SCAN_TIME } from '@/utils/constants';
import { createLogger, perfMonitor } from '@/utils/logger';

import { aggregateResults } from './aggregator';
import {
  executeScannersChunked,
  executeScannersParallel,
  executeScannersSequential,
  type ExecutorOptions,
} from './executor';
import { scannerRegistry } from './registry';

const logger = createLogger('ScannerOrchestrator');

export interface ScanOptions {
  /**
   * Execution strategy
   */
  strategy?: 'parallel' | 'sequential' | 'chunked';

  /**
   * Chunk size for chunked execution
   */
  chunkSize?: number;

  /**
   * Scanner types to run (if not provided, runs all enabled)
   */
  scanners?: IssueType[];

  /**
   * Abort signal to cancel scan
   */
  abortSignal?: AbortSignal;

  /**
   * Timeout for entire scan operation
   */
  timeout?: number;
}

/**
 * Scanner Orchestrator Class
 */
class ScannerOrchestrator {
  private isRunning = false;
  private currentAbortController: AbortController | null = null;

  /**
   * Run a complete scan
   */
  async scan(options: ScanOptions = {}): Promise<ScanResult> {
    if (this.isRunning) {
      throw new ExtensionError(ErrorCode.SCAN_FAILED, 'Scan already in progress');
    }

    this.isRunning = true;
    const perfLabel = 'full-scan';
    perfMonitor.start(perfLabel);

    try {
      logger.info('Starting scan with options:', options);

      // Get scanners to run
      const scannersToRun = this.getScannersToRun(options.scanners);

      if (scannersToRun.length === 0) {
        throw new ExtensionError(ErrorCode.SCAN_FAILED, 'No scanners available to run');
      }

      logger.info(`Running ${scannersToRun.length} scanners`);

      // Set up abort controller
      this.currentAbortController = new AbortController();
      const abortSignal = options.abortSignal || this.currentAbortController.signal;

      // Determine execution strategy
      const strategy = options.strategy || this.determineStrategy(scannersToRun);
      logger.debug(`Using execution strategy: ${strategy}`);

      // Execute scanners
      const executorOptions: ExecutorOptions = {
        abortSignal,
        timeout: options.timeout,
      };

      let scannerResults;
      switch (strategy) {
        case 'parallel':
          scannerResults = await executeScannersParallel(scannersToRun, executorOptions);
          break;
        case 'sequential':
          scannerResults = await executeScannersSequential(scannersToRun, executorOptions);
          break;
        case 'chunked':
          scannerResults = await executeScannersChunked(
            scannersToRun,
            options.chunkSize || 3,
            executorOptions
          );
          break;
      }

      // Get total execution time
      const totalExecutionTime = perfMonitor.end(perfLabel);

      // Aggregate results
      const result = aggregateResults(scannerResults, totalExecutionTime);

      logger.info(
        `Scan complete: ${result.metadata.totalIssues} issues found in ${totalExecutionTime}ms`
      );

      return result;
    } catch (error) {
      perfMonitor.end(perfLabel);
      logger.error('Scan failed:', error);

      if (error instanceof ExtensionError) {
        throw error;
      }

      throw new ExtensionError(
        ErrorCode.SCAN_FAILED,
        'Scan failed',
        error instanceof Error ? error : undefined
      );
    } finally {
      this.isRunning = false;
      this.currentAbortController = null;
    }
  }

  /**
   * Cancel current scan
   */
  cancelScan(): void {
    if (this.currentAbortController) {
      logger.info('Cancelling scan');
      this.currentAbortController.abort();
    }
  }

  /**
   * Check if scan is running
   */
  isScanRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Register a scanner
   */
  registerScanner(scanner: ScannerContract): void {
    scannerRegistry.register(scanner);
  }

  /**
   * Get scanners to run based on options
   */
  private getScannersToRun(types?: IssueType[]): ScannerContract[] {
    if (types && types.length > 0) {
      // Run specific scanners
      return types
        .map((type) => scannerRegistry.get(type))
        .filter((scanner): scanner is ScannerContract => scanner !== undefined);
    }

    // Run all enabled scanners
    return scannerRegistry.getEnabled();
  }

  /**
   * Determine best execution strategy based on scanners
   */
  private determineStrategy(
    scanners: ScannerContract[]
  ): 'parallel' | 'sequential' | 'chunked' {
    const totalEstimatedTime = scanners.reduce(
      (sum, scanner) => sum + scanner.getEstimatedTime(),
      0
    );

    // If scanners are fast, run in parallel
    if (totalEstimatedTime < TARGET_SCAN_TIME) {
      return 'parallel';
    }

    // If many scanners, use chunked execution
    if (scanners.length > 5) {
      return 'chunked';
    }

    // Otherwise sequential for better control
    return 'sequential';
  }

  /**
   * Get scanner statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    estimatedTime: number;
  } {
    const { total, enabled } = scannerRegistry.getCount();
    const estimatedTime = scannerRegistry.getEstimatedTime();

    return { total, enabled, estimatedTime };
  }

  /**
   * Enable/disable scanners
   */
  enableScanner(type: IssueType): void {
    scannerRegistry.enable(type);
  }

  disableScanner(type: IssueType): void {
    scannerRegistry.disable(type);
  }

  /**
   * Get list of available scanners
   */
  getAvailableScanners(): ScannerContract[] {
    return scannerRegistry.getAll();
  }

  /**
   * Clear all scanners (for testing)
   */
  clearScanners(): void {
    scannerRegistry.clear();
  }
}

// Singleton instance
export const orchestrator = new ScannerOrchestrator();
