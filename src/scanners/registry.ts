/**
 * Scanner Registry
 * Manages all available scanners and their lifecycle
 */

import type { IssueType, ScannerContract } from '@/types';

import { createLogger } from '@/utils/logger';

const logger = createLogger('ScannerRegistry');

/**
 * Central registry for all scanners
 */
class ScannerRegistry {
  private scanners: Map<IssueType, ScannerContract> = new Map();
  private enabledScanners: Set<IssueType> = new Set();

  /**
   * Register a scanner
   */
  register(scanner: ScannerContract): void {
    if (this.scanners.has(scanner.type)) {
      logger.warn(`Scanner for ${scanner.type} already registered, overwriting`);
    }

    this.scanners.set(scanner.type, scanner);
    this.enabledScanners.add(scanner.type); // Enable by default
    logger.info(`Registered scanner: ${scanner.name} (${scanner.type})`);
  }

  /**
   * Unregister a scanner
   */
  unregister(type: IssueType): void {
    if (!this.scanners.has(type)) {
      logger.warn(`Scanner for ${type} not found`);
      return;
    }

    this.scanners.delete(type);
    this.enabledScanners.delete(type);
    logger.info(`Unregistered scanner: ${type}`);
  }

  /**
   * Get a specific scanner
   */
  get(type: IssueType): ScannerContract | undefined {
    return this.scanners.get(type);
  }

  /**
   * Get all registered scanners
   */
  getAll(): ScannerContract[] {
    return Array.from(this.scanners.values());
  }

  /**
   * Get enabled scanners only
   */
  getEnabled(): ScannerContract[] {
    return Array.from(this.scanners.values()).filter((scanner) =>
      this.enabledScanners.has(scanner.type)
    );
  }

  /**
   * Enable a scanner
   */
  enable(type: IssueType): void {
    if (!this.scanners.has(type)) {
      logger.warn(`Cannot enable scanner ${type}: not registered`);
      return;
    }

    this.enabledScanners.add(type);
    logger.info(`Enabled scanner: ${type}`);
  }

  /**
   * Disable a scanner
   */
  disable(type: IssueType): void {
    this.enabledScanners.delete(type);
    logger.info(`Disabled scanner: ${type}`);
  }

  /**
   * Check if a scanner is enabled
   */
  isEnabled(type: IssueType): boolean {
    return this.enabledScanners.has(type);
  }

  /**
   * Enable multiple scanners
   */
  enableMany(types: IssueType[]): void {
    types.forEach((type) => this.enable(type));
  }

  /**
   * Disable multiple scanners
   */
  disableMany(types: IssueType[]): void {
    types.forEach((type) => this.disable(type));
  }

  /**
   * Get total estimated scan time
   */
  getEstimatedTime(): number {
    return this.getEnabled().reduce((total, scanner) => {
      return total + scanner.getEstimatedTime();
    }, 0);
  }

  /**
   * Get scanner count
   */
  getCount(): { total: number; enabled: number } {
    return {
      total: this.scanners.size,
      enabled: this.enabledScanners.size,
    };
  }

  /**
   * Clear all scanners
   */
  clear(): void {
    this.scanners.clear();
    this.enabledScanners.clear();
    logger.info('Cleared all scanners');
  }
}

// Singleton instance
export const scannerRegistry = new ScannerRegistry();
