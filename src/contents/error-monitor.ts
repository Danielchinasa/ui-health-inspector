/**
 * Error Monitor Content Script (MAIN world, document_start)
 *
 * Runs inside the page's own JavaScript context before any page scripts execute,
 * so every runtime error is captured from the very first line of page code.
 *
 * Captured events are serialised into document.documentElement.dataset.uihiErrors
 * so the isolated-world ConsoleErrorScanner can read them at scan time.
 */

import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  world: 'MAIN',
  run_at: 'document_start',
};

// ─── Captured error schema ────────────────────────────────────────────

interface CapturedError {
  /** Category of the event */
  t: 'error' | 'warning' | 'unhandled_rejection' | 'network';
  /** Human-readable message */
  m: string;
  /** Stack trace (if available) */
  st?: string;
  /** Unix timestamp (ms) */
  ts: number;
  /** Source file URL — only for JS runtime errors */
  src?: string;
  /** Line number — only for JS runtime errors */
  ln?: number;
  /** Column number — only for JS runtime errors */
  col?: number;
  /** JavaScript Error subclass name, e.g. “ReferenceError”, “TypeError” */
  ename?: string;
  /** Request URL — only for network errors */
  url?: string;
  /** HTTP response status — only for network errors */
  status?: number;
  /** HTTP method — only for network errors */
  method?: string;
}

// ─── DOM storage helpers ───────────────────────────────────────────────

const ATTR = 'uihiErrors';
const MAX_ENTRIES = 200;

/** Write a captured error into the shared dataset attribute. */
function pushError(entry: CapturedError): void {
  try {
    const html = document.documentElement;
    const list: CapturedError[] = JSON.parse(html.dataset[ATTR] || '[]');
    list.push(entry);
    if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
    html.dataset[ATTR] = JSON.stringify(list);
  } catch {
    // Never let the monitor itself crash the page
  }
}

/** Stringify one console argument without throwing. */
function argToString(a: unknown): string {
  if (a instanceof Error) return a.message;
  if (typeof a === 'string') return a;
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

// ─── console.error / console.warn interception ────────────────────────────────────

const _origError = console.error.bind(console);
console.error = function (...args: unknown[]) {
  pushError({ t: 'error', m: args.map(argToString).join(' '), ts: Date.now() });
  return _origError(...args);
};

const _origWarn = console.warn.bind(console);
console.warn = function (...args: unknown[]) {
  pushError({ t: 'warning', m: args.map(argToString).join(' '), ts: Date.now() });
  return _origWarn(...args);
};

// ─── window.onerror (uncaught synchronous exceptions) ───────────────────────────

window.addEventListener('error', (event: ErrorEvent) => {
  const msg = event.message || 'Unknown error';

  // Cross-origin scripts produce a sanitised "Script error." with no details.
  // Provide a useful hint instead of a meaningless raw string.
  if (msg === 'Script error.' || msg === 'Script error') {
    pushError({
      t: 'error',
      m: 'Script error (cross-origin: add crossorigin="anonymous" to the <script> tag for full details)',
      ename: 'ScriptError',
      ts: Date.now(),
    });
    return;
  }

  pushError({
    t: 'error',
    m: msg,
    st: event.error?.stack,
    src: event.filename || undefined,
    ln: event.lineno || undefined,
    col: event.colno || undefined,
    ename: event.error?.name || undefined,
    ts: Date.now(),
  });
});

// ─── Unhandled promise rejections ────────────────────────────────────────────

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  let message: string;
  let stack: string | undefined;
  let errorName: string | undefined;

  if (event.reason instanceof Error) {
    message = event.reason.message;
    stack = event.reason.stack;
    errorName = event.reason.name; // e.g. "ReferenceError", "TypeError"
  } else if (typeof event.reason === 'string') {
    message = event.reason;
  } else if (event.reason !== null && event.reason !== undefined) {
    try {
      message = JSON.stringify(event.reason);
    } catch {
      message = String(event.reason);
    }
  } else {
    message = 'Promise rejected with no reason';
  }

  pushError({ t: 'unhandled_rejection', m: message, st: stack, ename: errorName, ts: Date.now() });
});

// ─── fetch() interception (failed network requests) ───────────────────────────────

if (typeof window.fetch === 'function') {
  const _origFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url = '';
    try {
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.toString();
      else if (input instanceof Request) url = input.url;
      else url = String(input);
    } catch {
      url = String(input);
    }

    const method = (
      init?.method || (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    try {
      const response = await _origFetch(input, init);
      if (!response.ok) {
        pushError({
          t: 'network',
          m: `${response.status} ${response.statusText || ''}`.trim(),
          url,
          status: response.status,
          method,
          ts: Date.now(),
        });
      }
      return response;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      pushError({ t: 'network', m: errMsg, url, method, ts: Date.now() });
      throw err;
    }
  };
}

// ─── XMLHttpRequest interception (failed network requests) ───────────────────────

(function interceptXHR() {
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSend = XMLHttpRequest.prototype.send;
  const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    xhrMeta.set(this, {
      method: method.toUpperCase(),
      url: typeof url === 'string' ? url : url.toString(),
    });
    // @ts-expect-error – spread over overloaded signature
    return _origOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args: unknown[]) {
    const info = xhrMeta.get(this);
    if (info) {
      this.addEventListener('load', function (this: XMLHttpRequest) {
        if (this.status >= 400) {
          pushError({
            t: 'network',
            m: `${this.status} ${this.statusText || ''}`.trim(),
            url: info.url,
            status: this.status,
            method: info.method,
            ts: Date.now(),
          });
        }
      });
      this.addEventListener('error', function (this: XMLHttpRequest) {
        pushError({
          t: 'network',
          m: 'Network request failed',
          url: info.url,
          method: info.method,
          ts: Date.now(),
        });
      });
    }
    // @ts-expect-error – spread over overloaded signature
    return _origSend.apply(this, args);
  };
})();
