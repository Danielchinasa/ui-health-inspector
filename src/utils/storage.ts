/**
 * Storage Manager
 * Secure wrapper around Chrome Storage API with validation and error handling
 */

import type { ScanResult, StorageData, UserSettings } from '@/types';
import { DEFAULT_SETTINGS, ErrorCode, ExtensionError } from '@/types';

import { STORAGE_KEYS } from './constants';
import { createLogger } from './logger';
import { sanitizeObject } from './validation';

const logger = createLogger('Storage');

/**
 * Storage Manager Class
 */
class StorageManager {
  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = result[STORAGE_KEYS.SETTINGS];

      if (!settings) {
        logger.info('No settings found, using defaults');
        return DEFAULT_SETTINGS;
      }

      const sanitized = sanitizeObject<UserSettings>(settings);
      if (!sanitized) {
        logger.warn('Invalid settings data, using defaults');
        return DEFAULT_SETTINGS;
      }

      // Merge with defaults to handle new settings
      return { ...DEFAULT_SETTINGS, ...sanitized };
    } catch (error) {
      logger.error('Failed to get settings:', error);
      throw new ExtensionError(ErrorCode.STORAGE_READ_ERROR, 'Failed to read settings', error);
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };

      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: updated,
      });

      logger.info('Settings updated:', updated);
      return updated;
    } catch (error) {
      logger.error('Failed to update settings:', error);
      throw new ExtensionError(ErrorCode.STORAGE_WRITE_ERROR, 'Failed to write settings', error);
    }
  }

  /**
   * Get scan history
   */
  async getScanHistory(): Promise<ScanResult[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SCAN_HISTORY);
      const history = result[STORAGE_KEYS.SCAN_HISTORY];

      if (!history || !Array.isArray(history)) {
        logger.info('No scan history found');
        return [];
      }

      return history;
    } catch (error) {
      logger.error('Failed to get scan history:', error);
      throw new ExtensionError(ErrorCode.STORAGE_READ_ERROR, 'Failed to read scan history', error);
    }
  }

  /**
   * Add scan result to history
   */
  async addScanResult(result: ScanResult): Promise<void> {
    try {
      const settings = await this.getSettings();
      const history = await this.getScanHistory();

      // Add new result
      history.unshift(result);

      // Trim history to max items
      const trimmed = history.slice(0, settings.maxHistoryItems);

      // Save to storage
      await chrome.storage.local.set({
        [STORAGE_KEYS.SCAN_HISTORY]: trimmed,
        [STORAGE_KEYS.LAST_SCAN]: result,
      });

      logger.info('Scan result added to history');
    } catch (error) {
      logger.error('Failed to add scan result:', error);
      throw new ExtensionError(ErrorCode.STORAGE_WRITE_ERROR, 'Failed to write scan result', error);
    }
  }

  /**
   * Get last scan result
   */
  async getLastScan(): Promise<ScanResult | null> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SCAN);
      const lastScan = result[STORAGE_KEYS.LAST_SCAN];

      if (!lastScan) {
        return null;
      }

      const sanitized = sanitizeObject<ScanResult>(lastScan);
      return sanitized;
    } catch (error) {
      logger.error('Failed to get last scan:', error);
      throw new ExtensionError(ErrorCode.STORAGE_READ_ERROR, 'Failed to read last scan', error);
    }
  }

  /**
   * Clear scan history
   */
  async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.remove([STORAGE_KEYS.SCAN_HISTORY, STORAGE_KEYS.LAST_SCAN]);
      logger.info('Scan history cleared');
    } catch (error) {
      logger.error('Failed to clear history:', error);
      throw new ExtensionError(ErrorCode.STORAGE_WRITE_ERROR, 'Failed to clear history', error);
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      logger.info('All storage cleared');
    } catch (error) {
      logger.error('Failed to clear storage:', error);
      throw new ExtensionError(ErrorCode.STORAGE_WRITE_ERROR, 'Failed to clear storage', error);
    }
  }

  /**
   * Get all storage data
   */
  async getAll(): Promise<StorageData> {
    try {
      const [settings, scanHistory] = await Promise.all([
        this.getSettings(),
        this.getScanHistory(),
      ]);

      const lastScan = await this.getLastScan();

      return {
        settings,
        scanHistory,
        lastScan: lastScan || undefined,
      };
    } catch (error) {
      logger.error('Failed to get all data:', error);
      throw new ExtensionError(ErrorCode.STORAGE_READ_ERROR, 'Failed to read storage', error);
    }
  }

  /**
   * Get storage usage
   */
  async getStorageInfo(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;

      return {
        used: bytesInUse,
        total: quota,
        percentage: (bytesInUse / quota) * 100,
      };
    } catch (error) {
      logger.error('Failed to get storage info:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Listen for storage changes
   */
  onChanged(callback: (changes: chrome.storage.StorageChange, areaName: string) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      logger.debug('Storage changed:', { changes, areaName });
      callback(changes, areaName);
    });
  }
}

// Export singleton instance
export const storageManager = new StorageManager();
