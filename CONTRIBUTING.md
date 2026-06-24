# Contributing to UI Health Inspector

Thank you for your interest in contributing to UI Health Inspector! This document provides guidelines and instructions for contributing.

## 🎯 Project Vision

UI Health Inspector is a production-ready Chrome Extension that helps developers identify UI, UX, accessibility, and frontend quality issues with a single click. We're building this in phases with security as a first-class concern.

## 📋 Current Status

**Phase 1: Complete** ✅ - Core Infrastructure & Messaging  
**Phase 2: In Planning** - Scanner Engine & Contract System

See the [README](./README.md) for detailed phase breakdown.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Chrome browser for testing

### Development Setup

```bash
# Clone the repository
git clone <your-fork-url>
cd ui-health-inspector

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `build/chrome-mv3-dev/`

## 🛠️ Development Workflow

### Branch Naming

- `feature/scanner-dead-buttons` - New features
- `fix/message-validation` - Bug fixes
- `docs/api-documentation` - Documentation
- `refactor/storage-manager` - Code refactoring
- `test/messaging-unit-tests` - Test additions

### Code Standards

1. **TypeScript** - All code must be strongly typed
2. **ESLint** - Code must pass linting (`pnpm lint`)
3. **Prettier** - Code must be formatted (`pnpm format`)
4. **Tests** - New features require tests
5. **Security** - Follow security-first principles

### Security Requirements

All contributions must:
- ✅ Validate and sanitize all inputs
- ✅ Prevent XSS and injection attacks
- ✅ Follow Manifest V3 best practices
- ✅ Avoid `eval()`, `innerHTML`, and unsafe patterns
- ✅ Use the existing validation utilities

## 📝 Pull Request Process

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run the full test suite**: `pnpm test && pnpm type-check && pnpm lint`
6. **Commit with clear messages**:
   ```
   feat(scanner): add dead button detection algorithm
   
   - Implement click event listener detection
   - Add tests for edge cases
   - Update documentation
   ```
7. **Push to your fork** and submit a pull request
8. **Respond to feedback** from maintainers

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding tests
- `chore` - Maintain

**Example:**
```
feat(scanner): add overflow detection

Implement algorithm to detect elements with overflow issues.
Includes horizontal and vertical scroll detection.

Closes #42
```

## 🏗️ Project Structure

```
src/
├── background.ts          # Background service worker
├── popup.tsx              # Popup UI
├── contents/              # Content scripts
├── types/                 # TypeScript definitions
└── utils/                 # Shared utilities
    ├── constants.ts       # App constants
    ├── logger.ts          # Logging
    ├── dom.ts             # DOM utilities
    ├── validation.ts      # Validation & sanitization
    ├── messaging.ts       # Message passing
    └── storage.ts         # Chrome Storage
```

## 🧪 Testing

- **Unit Tests**: `pnpm test`
- **Type Check**: `pnpm type-check`
- **Linting**: `pnpm lint`
- **Coverage**: `pnpm test:coverage`

All tests must pass before merging.

## 📚 Documentation

When adding features:
- Update relevant docs in `docs/`
- Add JSDoc comments to functions
- Update README if needed
- Create examples for complex features

## 🐛 Bug Reports

Use GitHub Issues with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, Chrome version)

## 💡 Feature Requests

Before proposing features:
- Check existing issues and roadmap
- Align with phased approach
- Consider security implications
- Describe the problem it solves

## 🔒 Security

Found a security vulnerability? Please email the maintainers privately rather than opening a public issue.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Project documentation

## ❓ Questions?

- Open a GitHub Discussion
- Check existing documentation
- Review Phase 1 Report in `docs/`

---

**Thank you for contributing to UI Health Inspector!** 🎉
