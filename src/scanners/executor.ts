/**
 * Scanner Executor
 * Executes scanners with performance monitoring and error handling
 */

import type { ScannerContract, ScannerResult } from '@/types';
import { ErrorCode, ExtensionError } from '@/types';

import { MAX_SCAN_TIME } from '@/utils/constants';
import { createLogger, perfMonitor } from '@/utils/logger';

const logger = createLogger('ScannerExecutor');

export interface ExecutorOptions {
  timeout?: number;
  abortSignal?: AbortSignal;
}

/**
 * Execute a single scanner with monitoring and error handling
 */
export async function executeScanner(
  scanner: ScannerContract,
  options: ExecutorOptions = {}
): Promise<ScannerResult> {
  const { timeout = MAX_SCAN_TIME, abortSignal } = options;

  const startTime = Date.now();
  const perfLabel = `scanner:${scanner.type}`;

  perfMonitor.start(perfLabel);

  try {
    logger.info(`Executing scanner: ${scanner.name}`);

    // Check if aborted before starting
    if (abortSignal?.aborted) {
      throw new ExtensionError(ErrorCode.SCAN_FAILED, 'Scan aborted');
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;

    // Execute with timeout and abort support, with explicit cleanup to avoid leaking listeners.
    const issues = await Promise.race([
      scanner.scan(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new ExtensionError(ErrorCode.SCAN_TIMEOUT, 'Scanner timeout'));
        }, timeout);
      }),
      ...(abortSignal
        ? [
            new Promise<never>((_, reject) => {
              abortListener = () => {
                reject(new ExtensionError(ErrorCode.SCAN_FAILED, 'Scan aborted'));
              };

              abortSignal.addEventListener('abort', abortListener as EventListener, {
                once: true,
              });
            }),
          ]
        : []),
    ]).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (abortSignal && abortListener) {
        abortSignal.removeEventListener('abort', abortListener as EventListener);
      }
    });

    const executionTime = perfMonitor.end(perfLabel);

    logger.info(
      `Scanner ${scanner.name} completed in ${executionTime}ms, found ${issues.length} issues`
    );

    return {
      scanner: scanner.name,
      issues,
      executionTime,
      success: true,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    perfMonitor.end(perfLabel);

    logger.error(`Scanner ${scanner.name} failed:`, error);

    return {
      scanner: scanner.name,
      issues: [],
      executionTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple scanners in parallel
 */
export async function executeScannersParallel(
  scanners: ScannerContract[],
  options: ExecutorOptions = {}
): Promise<ScannerResult[]> {
  logger.info(`Executing ${scanners.length} scanners in parallel`);

  const results = await Promise.all(scanners.map((scanner) => executeScanner(scanner, options)));

  const successful = results.filter((r) => r.success).length;
  logger.info(`Completed ${successful}/${scanners.length} scanners successfully`);

  return results;
}

/**
 * Execute multiple scanners sequentially
 */
export async function executeScannersSequential(
  scanners: ScannerContract[],
  options: ExecutorOptions = {}
): Promise<ScannerResult[]> {
  logger.info(`Executing ${scanners.length} scanners sequentially`);

  const results: ScannerResult[] = [];

  for (const scanner of scanners) {
    // Check if aborted between scanners
    if (options.abortSignal?.aborted) {
      logger.warn('Scan aborted, stopping execution');
      break;
    }

    const result = await executeScanner(scanner, options);
    results.push(result);
  }

  const successful = results.filter((r) => r.success).length;
  logger.info(`Completed ${successful}/${scanners.length} scanners successfully`);

  return results;
}

/**
 * Execute scanners with chunking for better performance
 */
export async function executeScannersChunked(
  scanners: ScannerContract[],
  chunkSize: number = 3,
  options: ExecutorOptions = {}
): Promise<ScannerResult[]> {
  logger.info(`Executing ${scanners.length} scanners in chunks of ${chunkSize}`);

  const results: ScannerResult[] = [];

  for (let i = 0; i < scanners.length; i += chunkSize) {
    // Check if aborted between chunks
    if (options.abortSignal?.aborted) {
      logger.warn('Scan aborted, stopping execution');
      break;
    }

    const chunk = scanners.slice(i, i + chunkSize);
    const chunkResults = await executeScannersParallel(chunk, options);
    results.push(...chunkResults);

    logger.debug(`Completed chunk ${Math.floor(i / chunkSize) + 1}`);
  }

  const successful = results.filter((r) => r.success).length;
  logger.info(`Completed ${successful}/${scanners.length} scanners successfully`);

  return results;
}

/**
 * Retry failed scanner execution
 */
export async function executeWithRetry(
  scanner: ScannerContract,
  maxRetries: number = 2,
  options: ExecutorOptions = {}
): Promise<ScannerResult> {
  let lastResult: ScannerResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (options.abortSignal?.aborted) {
      break;
    }

    if (attempt > 0) {
      logger.info(`Retrying scanner ${scanner.name}, attempt ${attempt + 1}`);
    }

    lastResult = await executeScanner(scanner, options);

    if (lastResult.success) {
      return lastResult;
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }

  return (
    lastResult || {
      scanner: scanner.name,
      issues: [],
      executionTime: 0,
      success: false,
      error: 'Failed after retries',
    }
  );
}
