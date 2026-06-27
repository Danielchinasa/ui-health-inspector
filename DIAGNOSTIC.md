# Extension Diagnostic Guide

## Current Status

The extension is built and ready, but the content script injection may be failing on certain pages.

## How to Diagnose

### 1. Open Browser Console

- Open the page you want to scan
- Press F12 or Cmd+Option+I
- Click "Console" tab

### 2. Check What Page Type

The extension CANNOT scan these pages:

- ❌ `chrome://` pages (Chrome settings, extensions, etc.)
- ❌ `chrome-extension://` pages (Extension pages)
- ❌ `edge://` pages (Edge browser pages)
- ❌ `about:` pages (About pages)
- ❌ Local file:// pages (without special permissions)
- ❌ Chrome Web Store pages

The extension CAN scan:

- ✅ Regular websites (`https://` or `http://`)
- ✅ `localhost` or `127.0.0.1` pages

### 3. Reload Extension Steps

1. Go to `chrome://extensions/`
2. Find "UI Health Inspector"
3. Click the refresh/reload icon ♻️
4. **IMPORTANT:** Go back to the page you want to scan
5. **Reload that page too** (Cmd+R or F5)
6. Now click the extension icon and try scanning

### 4. Check Console Logs

After clicking "Scan", you should see:

**In Page Console (the page being scanned):**

```
[Content] Initializing content script
[Content] Registered 6 scanners: DeadButton, BrokenLink, MissingImage, Overflow, Accessibility, ConsoleError
[Content] Content script ready
[Content] Received message: START_SCAN
[Content] Starting page scan
```

**In Extension Background Console:**

1. Go to `chrome://extensions/`
2. Find "UI Health Inspector"
3. Click "service worker" link
4. You should see:

```
[Background] Received START_SCAN message
[Background] Sending to tab: <tab-id>
```

### 5. If You See "Could not load scanner"

This means the content script isn't loaded. Solutions:

**Option A - Reload the Page (Easiest)**

1. Press F5 or Cmd+R to reload the page
2. Try scanning again

**Option B - Check for Errors**

1. Open page console (F12)
2. Look for red errors
3. If there are Content Security Policy (CSP) errors, the page blocks script injection
4. Try on a different website

**Option C - Verify Extension Installation**

1. Go to `chrome://extensions/`
2. Make sure "UI Health Inspector" is enabled
3. Make sure it has permission for "Access your data for all websites"
4. Click reload icon
5. Reload the page you want to scan

### 6. Common Issues

**Issue: "Cannot scan chrome:// pages"**

- Solution: Navigate to a regular website (e.g., https://example.com)

**Issue: Content script logs don't appear**

- Solution: The content script isn't loaded. Reload the page.

**Issue: "Receiving end does not exist"**

- Solution: The content script isn't initialized. Either:
  - Reload the page
  - Or wait 2-3 seconds and try again (content script is loading)

**Issue: Works on some pages but not others**

- Cause: Some websites have strict Content Security Policies
- Solution: This is a security feature of the website, can't be bypassed

## Expected Behavior

1. ✅ Extension loads on page reload
2. ✅ Scan button shows "Scan Page"
3. ✅ Click scan → shows "Scanning..."
4. ✅ After ~2-3 seconds → shows results
5. ✅ Health score displays with color
6. ✅ Issue counts show in tabs

## Emergency Reset

If nothing works:

1. Go to `chrome://extensions/`
2. Remove "UI Health Inspector"
3. Reload the extensions page
4. Drag the `build/chrome-mv3-dev` folder back to extensions page
5. Enable it
6. Navigate to a test page (e.g., https://example.com)
7. Try scanning
