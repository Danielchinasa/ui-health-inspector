/**
 * Application-wide constants
 */

export const APP_NAME = 'UI Health Inspector';
export const APP_VERSION = '1.0.0';

// Performance thresholds
export const MAX_SCAN_TIME = 10000; // 10 seconds
export const TARGET_SCAN_TIME = 2000; // 2 seconds
export const MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB
export const MAX_DOM_ELEMENTS = 10000;

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'uhi_settings',
  SCAN_HISTORY: 'uhi_scan_history',
  LAST_SCAN: 'uhi_last_scan',
} as const;

// Message timeout
export const MESSAGE_TIMEOUT = 5000; // 5 seconds
export const PING_TIMEOUT = 1000; // 1 second

// Scan configuration
export const SCAN_CONFIG = {
  chunkSize: 100, // Process DOM in chunks
  idleTimeout: 50, // ms to wait between chunks
  maxHistoryItems: 20,
} as const;

// Highlight styles
export const HIGHLIGHT_STYLES = {
  DEAD_BUTTON: {
    outline: '3px solid #ef4444',
    zIndex: '999999',
    position: 'relative',
  },
  BROKEN_LINK: {
    outline: '3px solid #ef4444',
    zIndex: '999999',
    position: 'relative',
  },
  MISSING_IMAGE: {
    outline: '3px solid #f59e0b',
    zIndex: '999999',
    position: 'relative',
  },
  OVERFLOW: {
    outline: '3px solid #f59e0b',
    zIndex: '999999',
    position: 'relative',
  },
  ACCESSIBILITY: {
    outline: '3px solid #eab308',
    zIndex: '999999',
    position: 'relative',
  },
  CONSOLE_ERROR: {
    outline: '3px solid #6b7280',
    zIndex: '999999',
    position: 'relative',
  },
} as const;

// Health score thresholds
export const HEALTH_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 0,
} as const;

// Security
export const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const;
export const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB

// Regex patterns (validated for safety)
export const PATTERNS = {
  HASH_HREF: /^#$/,
  VOID_HREF: /^javascript:void\(0\);?$/i,
  EMPTY_HREF: /^\s*$/,
  VALID_URL: /^https?:\/\/.+/,
} as const;

// Extension metadata
export const EXTENSION_ID = chrome?.runtime?.id || 'development';

// Development mode
export const IS_DEV = process.env.NODE_ENV === 'development';
