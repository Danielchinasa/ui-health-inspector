/**
 * Message passing system
 * Secure communication between popup, background, and content scripts
 */

import type { Message, MessageHandler, Unsubscribe } from '@/types';
import { ErrorCode, ExtensionError, MessageType } from '@/types';

import { MESSAGE_TIMEOUT, PING_TIMEOUT } from './constants';
import { createLogger } from './logger';
import { isValidMessage, isValidSender, validateMessageSize } from './validation';

const logger = createLogger('Messaging');

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a base message
 */
export function createMessage<T extends Message>(type: MessageType, payload?: unknown): T {
  return {
    type,
    timestamp: Date.now(),
    id: generateMessageId(),
    payload,
  } as T;
}

/**
 * Send message to background script
 */
export async function sendToBackground<T = unknown>(message: Message): Promise<T> {
  if (!isValidMessage(message)) {
    throw new ExtensionError(ErrorCode.INVALID_MESSAGE, 'Invalid message structure');
  }

  if (!validateMessageSize(message)) {
    throw new ExtensionError(ErrorCode.MESSAGE_SEND_FAILED, 'Message too large');
  }

  try {
    logger.debug('Sending to background:', message);
    const response = await chrome.runtime.sendMessage(message);
    return response as T;
  } catch (error) {
    logger.error('Failed to send message to background:', error);
    throw new ExtensionError(
      ErrorCode.MESSAGE_SEND_FAILED,
      'Failed to send message to background',
      error
    );
  }
}

/**
 * Send message to content script in active tab
 */
export async function sendToContentScript<T = unknown>(message: Message): Promise<T> {
  if (!isValidMessage(message)) {
    throw new ExtensionError(ErrorCode.INVALID_MESSAGE, 'Invalid message structure');
  }

  if (!validateMessageSize(message)) {
    throw new ExtensionError(ErrorCode.MESSAGE_SEND_FAILED, 'Message too large');
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new ExtensionError(ErrorCode.NO_ACTIVE_TAB, 'No active tab found');
    }

    logger.debug('Sending to content script:', message);
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response as T;
  } catch (error) {
    logger.error('Failed to send message to content script:', error);
    throw new ExtensionError(
      ErrorCode.MESSAGE_SEND_FAILED,
      'Failed to send message to content script',
      error
    );
  }
}

/**
 * Send message to specific tab
 */
export async function sendToTab<T = unknown>(tabId: number, message: Message): Promise<T> {
  if (!isValidMessage(message)) {
    throw new ExtensionError(ErrorCode.INVALID_MESSAGE, 'Invalid message structure');
  }

  if (!validateMessageSize(message)) {
    throw new ExtensionError(ErrorCode.MESSAGE_SEND_FAILED, 'Message too large');
  }

  try {
    logger.debug(`Sending to tab ${tabId}:`, message);
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response as T;
  } catch (error) {
    logger.error(`Failed to send message to tab ${tabId}:`, error);
    throw new ExtensionError(ErrorCode.MESSAGE_SEND_FAILED, 'Failed to send message to tab', error);
  }
}

/**
 * Listen for messages
 */
export function onMessage(handler: MessageHandler): Unsubscribe {
  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    // Validate message
    if (!isValidMessage(message)) {
      logger.warn('Received invalid message:', message);
      sendResponse({ error: 'Invalid message' });
      return false;
    }

    // Validate sender
    if (!isValidSender(sender)) {
      logger.warn('Received message from invalid sender:', sender);
      sendResponse({ error: 'Invalid sender' });
      return false;
    }

    logger.debug('Received message:', message);

    // Handle message
    const result = handler(message, sender);

    // Handle async responses
    if (result instanceof Promise) {
      result
        .then((response) => {
          sendResponse({ success: true, data: response });
        })
        .catch((error) => {
          logger.error('Message handler error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
      return true; // Keep channel open for async response
    }

    // Handle sync responses
    sendResponse({ success: true, data: result });
    return false;
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Send message with timeout
 */
export async function sendWithTimeout<T = unknown>(
  sendFn: () => Promise<T>,
  timeout: number = MESSAGE_TIMEOUT
): Promise<T> {
  return Promise.race([
    sendFn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new ExtensionError(ErrorCode.SCAN_TIMEOUT, 'Message timeout')),
        timeout
      )
    ),
  ]);
}

/**
 * Ping content script to check if it's ready
 */
export async function pingContentScript(): Promise<boolean> {
  try {
    const message = createMessage(MessageType.PING);
    await sendWithTimeout(() => sendToContentScript(message), PING_TIMEOUT);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for content script to be ready
 */
export async function waitForContentScript(maxAttempts: number = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const isReady = await pingContentScript();
    if (isReady) {
      logger.info('Content script is ready');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new ExtensionError(
    ErrorCode.CONTENT_SCRIPT_NOT_READY,
    'Content script not ready after multiple attempts'
  );
}

/**
 * Broadcast message to all tabs
 */
export async function broadcast(message: Message): Promise<void> {
  const tabs = await chrome.tabs.query({});

  const promises = tabs
    .filter((tab) => tab.id !== undefined)
    .map((tab) =>
      sendToTab(tab.id!, message).catch((error) => {
        logger.warn(`Failed to send to tab ${tab.id}:`, error);
      })
    );

  await Promise.allSettled(promises);
}
