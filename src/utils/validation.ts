/**
 * Message and data validation utilities
 * Security-first validation for all data flowing through the extension
 */

import type { BaseMessage, Message } from '@/types';
import { MessageType } from '@/types';
import { ErrorCode, ExtensionError } from '@/types';

import { MAX_MESSAGE_SIZE } from './constants';

/**
 * Validate message structure
 */
export function isValidMessage(data: unknown): data is Message {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const msg = data as Partial<BaseMessage>;

  return (
    typeof msg.type === 'string' &&
    typeof msg.timestamp === 'number' &&
    typeof msg.id === 'string' &&
    msg.timestamp > 0 &&
    msg.id.length > 0
  );
}

/**
 * Validate message type
 */
export function validateMessageType(type: unknown): type is MessageType {
  return typeof type === 'string' && Object.values(MessageType).includes(type as MessageType);
}

/**
 * Validate message size
 */
export function validateMessageSize(message: unknown): boolean {
  try {
    const size = JSON.stringify(message).length;
    return size <= MAX_MESSAGE_SIZE;
  } catch {
    return false;
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potential XSS vectors
  return (
    input
      // eslint-disable-next-line security/detect-unsafe-regex
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .substring(0, 10000) // Limit length
  );
}

/**
 * Validate URL
 */
export function isValidURL(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate tab ID
 */
export function isValidTabId(tabId: unknown): tabId is number {
  return typeof tabId === 'number' && tabId > 0 && Number.isInteger(tabId);
}

/**
 * Validate sender origin
 */
export function isValidSender(sender: chrome.runtime.MessageSender): boolean {
  // Must have a valid tab ID or be from the extension itself
  const hasValidTab = sender.tab?.id !== undefined && sender.tab.id > 0;
  const isExtension = sender.id === chrome.runtime.id;

  return hasValidTab || isExtension;
}

/**
 * Validate and sanitize object
 */
export function sanitizeObject<T>(obj: unknown): T | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return null;
  }

  try {
    // Deep clone to prevent prototype pollution
    const sanitized = JSON.parse(JSON.stringify(obj));
    return sanitized as T;
  } catch {
    return null;
  }
}

/**
 * Create validation error
 */
export function createValidationError(field: string, reason: string): ExtensionError {
  return new ExtensionError(ErrorCode.INVALID_MESSAGE, `Validation failed for ${field}: ${reason}`);
}

/**
 * Assert condition with error
 */
export function assert(condition: boolean, message: string, code = ErrorCode.UNKNOWN_ERROR): void {
  if (!condition) {
    throw new ExtensionError(code, message);
  }
}

/**
 * Validate number range
 */
export function isInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max && !isNaN(value);
}

/**
 * Validate array
 */
export function isValidArray(value: unknown, maxLength: number = 1000): boolean {
  return Array.isArray(value) && value.length <= maxLength;
}
