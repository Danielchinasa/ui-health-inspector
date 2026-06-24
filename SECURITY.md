# Security Policy

## 🔒 Reporting a Vulnerability

The UI Health Inspector team takes security seriously. We appreciate your efforts to responsibly disclose your findings.

### Please DO NOT:

- ❌ Open a public GitHub issue for security vulnerabilities
- ❌ Disclose the vulnerability publicly before it has been addressed
- ❌ Test the vulnerability on websites you don't own or have permission to test

### Please DO:

✅ **Report security vulnerabilities privately**

If you discover a security vulnerability, please contact the maintainers via:

1. **GitHub Security Advisories** (preferred):
   - Go to the [Security tab](https://github.com/YOUR_USERNAME/ui-health-inspector/security)
   - Click "Report a vulnerability"
   - Fill out the private vulnerability report form

2. **Direct Email** (if GitHub Security Advisories is not available):
   - Email: [Your security email - add this]
   - Include "[SECURITY]" in the subject line

### What to Include

Please provide the following information:

- **Description**: Clear description of the vulnerability
- **Impact**: What could an attacker accomplish?
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: Code or screenshots demonstrating the vulnerability
- **Affected Versions**: Which versions are affected?
- **Suggested Fix**: If you have ideas on how to fix it (optional)

## 🛡️ Security Measures

UI Health Inspector implements multiple security layers:

### Manifest V3 Compliance

- Service workers instead of background pages
- Declarative permissions
- No remote code execution
- Strict Content Security Policy

### Input Validation

- All inputs validated and sanitized
- Type checking with TypeScript
- Runtime validation for messages and data
- Maximum size limits enforced

### XSS Prevention

- HTML sanitization in DOM utilities
- No use of `innerHTML` with user data
- No `eval()` or `Function()` constructors
- Script tag removal in content processing

### Permissions

- Minimal permissions requested
- `activeTab` for current page access only
- `storage` for local data only
- `scripting` for content script injection only
- No `<all_urls>` in permissions (only in host_permissions for scanning)

### Data Privacy

- No data sent to external servers
- All processing done locally in browser
- Storage only in Chrome's local storage
- No tracking or analytics
- No third-party dependencies in runtime code

### Origin Verification

- All messages verified for sender origin
- Tab ID validation
- Extension ID verification
- Protection against malicious websites

## 🔄 Security Update Process

1. **Receipt**: We acknowledge receipt within 48 hours
2. **Assessment**: We assess the severity and impact
3. **Fix Development**: We develop and test a fix
4. **Disclosure**: We coordinate disclosure with the reporter
5. **Release**: We release a security patch
6. **Announcement**: We publish a security advisory

## ⏱️ Response Timeline

- **Critical vulnerabilities**: Fix within 7 days
- **High severity**: Fix within 14 days
- **Medium severity**: Fix within 30 days
- **Low severity**: Fix in next regular release

## 🏆 Recognition

We believe in recognizing security researchers who help make UI Health Inspector safer:

- Public acknowledgment in release notes (if you wish)
- Listed in our security hall of fame
- Mentioned in the security advisory

## 🚫 Out of Scope

The following are **not** considered security vulnerabilities:

- Issues in third-party dependencies (report to the dependency maintainers)
- Social engineering attacks
- Denial of service from excessive scanning
- Issues that require physical access to the user's device
- Browser bugs (report to Chrome/browser vendors)

## 📚 Security Best Practices for Users

As a user of UI Health Inspector:

- ✅ Install from official sources only
- ✅ Keep the extension updated
- ✅ Review permissions before installing
- ✅ Report suspicious behavior
- ✅ Don't run untrusted scanners or modifications

## 🔐 Secure Development

For contributors:

- All code must pass security linting (`eslint-plugin-security`)
- Security review required for PRs touching:
  - Message handling
  - Data storage
  - DOM manipulation
  - Permission changes
- See [CONTRIBUTING.md](CONTRIBUTING.md) for security requirements

## 📜 Security Changelog

| Date       | Version | Severity | Description                                |
| ---------- | ------- | -------- | ------------------------------------------ |
| 2026-06-24 | 1.0.0   | -        | Initial release with security-first design |

## 📧 Contact

For security-related questions that are not vulnerabilities, you can:

- Open a GitHub Discussion
- Check the documentation
- Contact the maintainers

---

**Thank you for helping keep UI Health Inspector secure!** 🙏
