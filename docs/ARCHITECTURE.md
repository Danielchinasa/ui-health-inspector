# Architecture Documentation

## System Architecture

### Overview

UI Health Inspector is a Manifest V3 Chrome Extension built with a modular, security-first architecture.

```
┌──────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐      ┌──────────────┐      ┌────────────┐  │
│  │             │      │              │      │            │  │
│  │  Popup UI   │◄────►│  Background  │◄────►│  Content   │  │
│  │  (React)    │      │   Worker     │      │  Script    │  │
│  │             │      │              │      │            │  │
│  └─────────────┘      └──────┬───────┘      └─────┬──────┘  │
│                              │                    │         │
│                              ▼                    ▼         │
│                       ┌──────────────┐    ┌─────────────┐   │
│                       │   Storage    │    │  Scanners   │   │
│                       │   Manager    │    │  (Phase 2)  │   │
│                       └──────────────┘    └─────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### 1. Popup UI

**Location:** `popup.tsx`

**Purpose:** User interface for scan control and results display

**Responsibilities:**

- Display scan results
- Trigger scans
- Show health score
- Toggle highlights
- Access settings
- View history

**Communication:**

- Sends messages to Background Worker
- Receives scan results
- Updates UI based on storage changes

---

### 2. Background Service Worker

**Location:** `background.ts`

**Purpose:** Central coordinator and message router

**Responsibilities:**

- Route messages between popup and content scripts
- Manage extension lifecycle
- Coordinate scan operations
- Handle storage operations
- Monitor tabs
- Maintain service worker alive (MV3)

**Communication:**

- Receives messages from Popup
- Sends messages to Content Script
- Manages Chrome Storage API

---

### 3. Content Script

**Location:** `contents/index.ts`

**Purpose:** Runs in page context to analyze DOM

**Responsibilities:**

- Execute scanners
- Access page DOM
- Collect issues
- Inject highlights
- Report results
- Clean up on unload

**Communication:**

- Receives scan requests from Background
- Sends results back to Background
- Responds to highlight commands

---

## Data Flow

### Scan Workflow

```
1. User clicks "Scan" in Popup
         ↓
2. Popup sends START_SCAN to Background
         ↓
3. Background forwards to Content Script
         ↓
4. Content Script executes scanners
         ↓
5. Content Script sends SCAN_COMPLETE to Background
         ↓
6. Background saves to Storage
         ↓
7. Background sends result to Popup
         ↓
8. Popup displays results
```

### Message Flow

```typescript
// Popup → Background
sendToBackground(message) → chrome.runtime.sendMessage()

// Background → Content Script
sendToTab(tabId, message) → chrome.tabs.sendMessage()

// Bidirectional listening
onMessage(handler) → chrome.runtime.onMessage.addListener()
```

---

## Security Architecture

### Threat Model

**Threats Addressed:**

1. Malicious websites attempting to manipulate extension
2. XSS attacks through injected content
3. Data exfiltration attempts
4. Privilege escalation
5. DOM injection attacks

### Security Layers

#### Layer 1: Input Validation

- All messages validated before processing
- Type checking with TypeScript
- Size limits enforced
- Sanitization of all external data

#### Layer 2: Origin Verification

- Sender validation on all messages
- Extension ID verification
- Tab ID validation

#### Layer 3: Content Sanitization

- HTML sanitization before display
- Script tag removal
- Event handler removal
- JavaScript protocol blocking

#### Layer 4: Secure Storage

- Data validation before storage
- Object cloning to prevent pollution
- Safe serialization
- Quota management

#### Layer 5: Minimal Permissions

- `activeTab` - Only current page
- `storage` - Local storage only
- `scripting` - Content script injection

---

## Performance Architecture

### Performance Goals

- Scan time: <2 seconds
- Memory usage: <50MB
- DOM elements: Up to 10,000
- No page lag

### Performance Strategies

#### 1. Chunking

```typescript
chunkArray(elements, 100); // Process 100 elements at a time
```

#### 2. Idle Callback

```typescript
requestIdleCallback(() => {
  // Process during browser idle time
});
```

#### 3. Performance Monitoring

```typescript
perfMonitor.start('scan');
// ... work ...
const duration = perfMonitor.end('scan');
```

#### 4. Lazy Loading

- Scanners loaded on demand
- Results paginated
- History trimmed automatically

---

## Error Handling Architecture

### Error Types

```typescript
enum ErrorCode {
  SCAN_TIMEOUT,
  SCAN_FAILED,
  MESSAGE_SEND_FAILED,
  INVALID_MESSAGE,
  STORAGE_ERROR,
  PERMISSION_DENIED,
  UNKNOWN_ERROR,
}
```

### Error Flow

```
Error Occurs
     ↓
ExtensionError thrown with code
     ↓
Logger captures error
     ↓
User-friendly message shown
     ↓
Recovery attempted if possible
```

### Error Recovery

- **Message failures:** Retry with timeout
- **Storage failures:** Use defaults
- **Scan failures:** Report partial results
- **Permission errors:** Prompt user

---

## Storage Architecture

### Storage Structure

```typescript
{
  uhi_settings: UserSettings,
  uhi_scan_history: ScanResult[],
  uhi_last_scan: ScanResult
}
```

### Storage Operations

All operations go through `StorageManager`:

- Validation before write
- Sanitization on read
- Automatic quota management
- Error handling

### Storage Limits

- Max history items: 20 (configurable)
- Total quota: Chrome's 10MB limit
- Individual scan results: ~100KB average

---

## Logging Architecture

### Log Levels

1. **DEBUG** - Development details
2. **INFO** - General information
3. **WARN** - Potential issues
4. **ERROR** - Actual errors

### Log Strategy

- Development: All levels to console
- Production: Errors and warnings only
- In-memory log retention (100 entries)
- Context-based loggers

```typescript
const logger = createLogger('Component');
logger.info('Operation complete');
```

---

## Testing Architecture

### Test Strategy

1. **Unit Tests** - Individual functions
2. **Integration Tests** - Component interaction
3. **E2E Tests** - Full workflows (Phase 10)

### Test Structure

```
tests/
├── setup.ts           # Chrome API mocks
└── utils/
    ├── messaging.test.ts
    ├── validation.test.ts
    └── dom.test.ts
```

### Mocking Strategy

- Chrome APIs fully mocked
- Storage operations isolated
- Message passing simulated
- DOM operations in jsdom

---

## Extension Lifecycle

### Installation

```
Extension Installed
     ↓
onInstalled event
     ↓
Initialize default settings
     ↓
Ready for use
```

### Startup

```
Browser Starts
     ↓
onStartup event
     ↓
Background worker initializes
     ↓
Listeners registered
```

### Page Load

```
Page Navigation
     ↓
Content script injected
     ↓
Initialize scanners
     ↓
Wait for scan trigger
```

### Scan Execution

```
Scan Triggered
     ↓
Content script receives message
     ↓
Execute scanners sequentially
     ↓
Aggregate results
     ↓
Calculate health score
     ↓
Send results to background
     ↓
Save to storage
     ↓
Display in popup
```

---

## Future Architecture (Phases 2-10)

### Phase 2: Scanner Engine

- Plugin architecture
- Scanner registry
- Execution orchestration
- Result aggregation

### Phase 3: Enhanced UI

- React components library
- State management (Zustand)
- Advanced visualizations
- Settings panel

### Phase 7: Highlighting

- DOM overlay injection
- Interactive highlights
- Click-to-fix navigation

### Phase 10: Production

- Performance optimization
- Security audit
- Chrome Web Store preparation

---

## Technology Stack

- **Framework:** Plasmo (Manifest V3)
- **Language:** TypeScript
- **UI:** React
- **State:** Zustand (Phase 3)
- **Build:** Vite
- **Test:** Vitest
- **Lint:** ESLint + Security plugin
- **Format:** Prettier

---

## Compliance

### Manifest V3

- Service worker instead of background page
- chrome.action instead of browser_action
- Declarative permissions
- No remote code execution

### Chrome Web Store

- Minimal permissions requested
- Clear permission justification
- Privacy policy compliant
- No data collection in MVP

### Security Standards

- OWASP guidelines followed
- XSS prevention implemented
- CSRF not applicable (no backend)
- Input validation throughout

---

This architecture is designed for scalability, security, and maintainability while delivering excellent performance and user experience.
