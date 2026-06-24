/**
 * Test setup file
 */

import { vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock Chrome API
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    getManifest: vi.fn(() => ({
      version: '1.0.0',
      manifest_version: 3,
    })),
    getPlatformInfo: vi.fn((callback) => callback?.({ os: 'mac' })),
  } as any,
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
    },
  } as any,
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getBytesInUse: vi.fn(() => Promise.resolve(0)),
      QUOTA_BYTES: 10485760,
    },
    onChanged: {
      addListener: vi.fn(),
    },
  } as any,
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  } as any,
} as any;
/* eslint-enable @typescript-eslint/no-explicit-any */
