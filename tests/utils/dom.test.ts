/**
 * Tests for DOM utilities
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHTML, chunkArray } from '@/utils/dom';

describe('DOM Utilities', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const html = '<div>Hello <script>alert("xss")</script> World</div>';
      const result = sanitizeHTML(html);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove event handlers', () => {
      const html = '<button onclick="alert(1)">Click</button>';
      const result = sanitizeHTML(html);

      expect(result).not.toContain('onclick=');
    });

    it('should remove javascript: protocol', () => {
      const html = '<a href="javascript:void(0)">Link</a>';
      const result = sanitizeHTML(html);

      expect(result).not.toContain('javascript:');
    });
  });

  describe('chunkArray', () => {
    it('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const chunks = chunkArray(array, 3);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
    });

    it('should handle remainder', () => {
      const array = [1, 2, 3, 4, 5];
      const chunks = chunkArray(array, 2);

      expect(chunks).toHaveLength(3);
      expect(chunks[2]).toEqual([5]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const array = [1, 2, 3];
      const chunks = chunkArray(array, 10);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });
  });
});
