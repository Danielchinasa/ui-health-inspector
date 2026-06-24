/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  isValidURL,
  isValidTabId,
  isInRange,
  isValidArray,
  sanitizeObject,
} from '@/utils/validation';

describe('Validation Utilities', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeString(input);

      expect(result).not.toContain('<script>');
      expect(result).toBe('Hello  World');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeString(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Test</div>';
      const result = sanitizeString(input);

      expect(result).not.toContain('onclick=');
    });

    it('should trim and limit length', () => {
      const input = '  test  ';
      const result = sanitizeString(input);

      expect(result).toBe('test');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('isValidURL', () => {
    it('should validate http URLs', () => {
      expect(isValidURL('http://example.com')).toBe(true);
    });

    it('should validate https URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not-a-url')).toBe(false);
      expect(isValidURL('javascript:void(0)')).toBe(false);
      expect(isValidURL('file:///etc/passwd')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(isValidURL(null)).toBe(false);
      expect(isValidURL(undefined)).toBe(false);
      expect(isValidURL(123)).toBe(false);
    });
  });

  describe('isValidTabId', () => {
    it('should validate positive integers', () => {
      expect(isValidTabId(1)).toBe(true);
      expect(isValidTabId(123)).toBe(true);
    });

    it('should reject invalid tab IDs', () => {
      expect(isValidTabId(0)).toBe(false);
      expect(isValidTabId(-1)).toBe(false);
      expect(isValidTabId(1.5)).toBe(false);
      expect(isValidTabId('1')).toBe(false);
      expect(isValidTabId(null)).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should validate numbers in range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(0, 0, 10)).toBe(true);
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('should reject numbers out of range', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
      expect(isInRange(11, 0, 10)).toBe(false);
      expect(isInRange(NaN, 0, 10)).toBe(false);
    });

    it('should reject non-numbers', () => {
      expect(isInRange('5', 0, 10)).toBe(false);
      expect(isInRange(null, 0, 10)).toBe(false);
    });
  });

  describe('isValidArray', () => {
    it('should validate arrays', () => {
      expect(isValidArray([])).toBe(true);
      expect(isValidArray([1, 2, 3])).toBe(true);
    });

    it('should enforce max length', () => {
      expect(isValidArray([1, 2, 3], 5)).toBe(true);
      expect(isValidArray([1, 2, 3], 2)).toBe(false);
    });

    it('should reject non-arrays', () => {
      expect(isValidArray(null)).toBe(false);
      expect(isValidArray({})).toBe(false);
      expect(isValidArray('array')).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize and clone objects', () => {
      const input = { name: 'test', value: 123 };
      const result = sanitizeObject(input);

      expect(result).toEqual(input);
      expect(result).not.toBe(input); // Different reference
    });

    it('should reject invalid inputs', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(null);
      expect(sanitizeObject('string')).toBe(null);
      expect(sanitizeObject([])).toBe(null);
    });

    it('should handle nested objects', () => {
      const input = {
        nested: {
          value: 'test',
        },
      };
      const result = sanitizeObject(input);

      expect(result).toEqual(input);
    });
  });
});
