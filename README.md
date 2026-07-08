# UI Health Inspector

**One-Click Website Quality Scanner**

A production-ready Chrome Extension that scans web pages for UI, UX, accessibility, and frontend quality issues.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-orange.svg)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start dev server
pnpm dev

# 3. Load extension in Chrome:
#    - Open chrome://extensions
#    - Enable "Developer mode"
#    - Click "Load unpacked"
#    - Select: build/chrome-mv3-dev/
```

The extension popup will show Phase 1 status. Hot reload is enabled for development!

## Features

- 🔴 **Dead Button Detection** - Find interactive elements that do nothing
- 🔗 **Broken Link Scanner** - Identify invalid and malformed links
- 🖼️ **Missing Image Detection** - Catch failed image loads
- 📐 **Overflow Analysis** - Detect layout and scrolling issues
- ♿ **Accessibility Checker** - Quick WCAG compliance scan
- 🐛 **Console Error Monitoring** - Capture runtime JavaScript errors
- 📊 **Health Score** - Get an instant quality rating (0-100)
- 🎨 **Visual Highlighting** - See issues directly on the page

## Installation

### Development Setup

```bash
# Clone or navigate to the project directory
cd /path/to/ui-health-inspector

# Install dependencies
pnpm install

# Run development server with live reload
pnpm dev

# The dev server will build to: build/chrome-mv3-dev/
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **"Developer mode"** (toggle in top right corner)
3. Click **"Load unpacked"**
4. Navigate to and select the `build/chrome-mv3-dev/` directory
5. The extension icon will appear in your toolbar
6. Click the extension icon to open the popup interface

The dev server watches for file changes and automatically rebuilds. Just refresh the extension in Chrome to see updates!

### Additional Commands

```bash
# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Format code
pnpm format

# Security audit
pnpm security-audit

# Build for production
pnpm build

# Package extension for distribution
pnpm package
```

## Development Status

**Current Phase:** Phase 2 - Scanner Engine ✅ **COMPLETE**

### ✅ Phase 1: Core Infrastructure & Messaging

- [x] Project scaffolding (Plasmo + TypeScript + React)
- [x] Type system (530+ lines of comprehensive type definitions)
- [x] Utility modules (logger, DOM, validation, messaging, storage)
- [x] Background service worker with message routing
- [x] Content script infrastructure
- [x] Popup UI foundation
- [x] Testing framework (Vitest)
- [x] Security implementation (validation, sanitization, XSS prevention)
- [x] Documentation (Architecture, API specs)

### ✅ Phase 2: Scanner Engine & Contract System

- [x] Scanner contract interface (`ScannerContract`)
- [x] Scanner registry (enable/disable, singleton pattern)
- [x] Executor with parallel, sequential, and chunked strategies
- [x] Result aggregator (deduplication, severity sorting)
- [x] Orchestrator for high-level scan coordination
- [x] All 6 scanners implemented (Dead Buttons, Broken Links, Missing Images, Overflow, Accessibility, Console Errors)
- [x] Health score engine (severity-weighted, 0–100)
- [x] 132 passing unit tests

### 📋 Upcoming Phases

- [ ] **Phase 3:** Scan History View
- [ ] **Phase 4:** Visual Highlights (outline issues on-page)
- [ ] **Phase 5:** Export / Share Results
- [ ] **Phase 6:** Chrome Web Store Deployment

## Project Structure

```
ui-health-inspector/
├── src/
│   ├── background.ts          # Background service worker
│   ├── popup.tsx              # Popup UI component
│   ├── popup.css              # Popup styles
│   ├── contents/
│   │   └── index.ts           # Content script
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/
│       ├── constants.ts       # App constants
│       ├── logger.ts          # Logging & performance monitoring
│       ├── dom.ts             # DOM utilities & XSS prevention
│       ├── validation.ts      # Input validation & sanitization
│       ├── messaging.ts       # Message passing system
│       └── storage.ts         # Chrome Storage wrapper
├── tests/                     # Vitest unit tests
├── docs/                      # Technical documentation
├── assets/                    # Extension icons
└── build/                     # Build output
    └── chrome-mv3-dev/        # Development build (load this in Chrome)
```

## Security

Security is our highest priority:

- ✅ Manifest V3 compliance
- ✅ Strict Content Security Policy
- ✅ Minimal permissions (activeTab, storage, scripting)
- ✅ Input validation and sanitization
- ✅ No unsafe eval or inline scripts
- ✅ XSS and injection protection
- ✅ Privacy-by-default design

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- 🐛 **Report bugs** - Open issues for bugs you find
- 💡 **Suggest features** - Share ideas for new scanners or improvements
- 📝 **Improve docs** - Help make documentation clearer
- 🧪 **Write tests** - Increase test coverage
- 🔧 **Submit PRs** - Implement features from the roadmap

Before contributing, please review our [phased approach](./docs/PHASE_1_REPORT.md) and ensure your work aligns with the current phase.

## Documentation

- [Phase 1 Report](./docs/PHASE_1_REPORT.md) - Core infrastructure details
- [Phase 2 Report](./PHASE_2_REPORT.md) - Scanner engine details
- [Architecture](./docs/ARCHITECTURE.md) - System design and technical architecture

---

**Phase 2 Complete** - July 2026  
Built with [Plasmo](https://www.plasmo.com/) • Powered by [React](https://react.dev/) • Secured by Design
