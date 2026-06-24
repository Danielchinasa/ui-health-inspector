/**
 * Tests for messaging utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType } from '@/types';
import { createMessage } from '@/utils/messaging';
import { isValidMessage, isValidSender } from '@/utils/validation';

describe('Messaging Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a valid message', () => {
      const message = createMessage(MessageType.PING);

      expect(message).toHaveProperty('type', MessageType.PING);
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('id');
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.id).toMatch(/^msg_/);
    });

    it('should create message with payload', () => {
      const payload = { test: 'data' };
      const message = createMessage(MessageType.START_SCAN, payload);

      expect(message).toHaveProperty('payload', payload);
    });

    it('should generate unique IDs', () => {
      const msg1 = createMessage(MessageType.PING);
      const msg2 = createMessage(MessageType.PING);

      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('isValidMessage', () => {
    it('should validate correct message structure', () => {
      const message = createMessage(MessageType.PING);
      expect(isValidMessage(message)).toBe(true);
    });

    it('should reject invalid message', () => {
      expect(isValidMessage(null)).toBe(false);
      expect(isValidMessage(undefined)).toBe(false);
      expect(isValidMessage({})).toBe(false);
      expect(isValidMessage({ type: 'test' })).toBe(false);
    });

    it('should reject message without required fields', () => {
      expect(isValidMessage({ type: MessageType.PING })).toBe(false);
      expect(isValidMessage({ type: MessageType.PING, timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isValidSender', () => {
    it('should validate sender with tab', () => {
      const sender = {
        tab: { id: 123 },
        id: chrome.runtime.id,
      } as chrome.runtime.MessageSender;

      expect(isValidSender(sender)).toBe(true);
    });

    it('should validate sender from extension', () => {
      const sender = {
        id: chrome.runtime.id,
      } as chrome.runtime.MessageSender;

      expect(isValidSender(sender)).toBe(true);
    });

    it('should reject invalid sender', () => {
      const sender = {
        id: 'different-extension-id',
      } as chrome.runtime.MessageSender;

      expect(isValidSender(sender)).toBe(false);
    });
  });
});
