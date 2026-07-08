import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  ShieldCheck,
  Settings,
  Moon,
  Sun,
  Activity,
  CircleX,
  Link2Off,
  ImageOff,
  Maximize,
  Accessibility,
  TerminalSquare,
  ExternalLink,
} from 'lucide-react';
import './popup.css';

import { createLogger } from '@/utils/logger';
import { usePopupInit, useScanAction } from '@/hooks/popup';
import { usePopupStore } from '@/store/popup';
import type {
  AccessibilityIssue,
  BaseIssue,
  BrokenLinkIssue,
  ConsoleErrorIssue,
  DeadButtonIssue,
  MissingImageIssue,
  OverflowIssue,
  UserSettings,
} from '@/types';
import { DEFAULT_SETTINGS, IssueType, MessageType } from '@/types';
import { createMessage, sendToBackground } from '@/utils/messaging';

const logger = createLogger('Popup');

/**
 * Get health status message based on score
 */
function getHealthStatus(score: number | undefined): {
  label: string;
  emoji: string;
  message: string;
  className: string;
} {
  if (score === undefined) {
    return {
      label: 'Unknown',
      emoji: '🔍',
      message: 'Scan this page to check its health.',
      className: 'unknown',
    };
  }

  if (score >= 90) {
    return {
      label: 'Excellent',
      emoji: '🎉',
      message: 'Your page is in great shape! Minimal issues found.',
      className: 'excellent',
    };
  } else if (score >= 70) {
    return {
      label: 'Good',
      emoji: '😊',
      message: 'Your page is healthy, but some issues need attention.',
      className: 'good',
    };
  } else if (score >= 50) {
    return {
      label: 'Fair',
      emoji: '😐',
      message: 'Several issues detected that could impact user experience.',
      className: 'fair',
    };
  } else if (score >= 30) {
    return {
      label: 'Poor',
      emoji: '😟',
      message: 'Multiple issues found that need immediate attention.',
      className: 'poor',
    };
  } else {
    return {
      label: 'Critical',
      emoji: '🔴',
      message: 'Significant issues detected affecting page quality.',
      className: 'critical',
    };
  }
}

function getIssueSeverity(
  issueKey: string,
  count: number | undefined
): 'Good' | 'Medium' | 'Critical' | null {
  if (count === undefined) return null;
  if (count === 0) return 'Good';

  if (issueKey === 'missing-images' || issueKey === 'overflow' || issueKey === 'console-errors') {
    return 'Medium';
  }

  return 'Critical';
}

function IndexPopup() {
  usePopupInit();

  const { scanError, theme, setTheme } = usePopupStore();
  const [view, setView] = useState<'scan' | 'settings'>('scan');

  // Read extension version from the manifest
  const manifest = (
    typeof chrome !== 'undefined' ? (chrome as any).runtime?.getManifest?.() : null
  ) as any;
  const version = manifest?.version || 'dev';

  useEffect(() => {
    logger.info('Popup mounted');
  }, []);

  return (
    <div className="popup-container" data-theme={theme}>
      <header className="popup-header">
        <div className="header-left">
          <div className="title-wrap">
            <h1>UI Health</h1>

            <div className="subtitle-row">
              <span>Design Quality Inspector</span>
              <div className="app-version">v{version}</div>
            </div>
            <div className="byline">by Cornerpis</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="theme-toggle">
            <button
              type="button"
              aria-label="Switch to light theme"
              aria-pressed={theme === 'light'}
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={17} />
            </button>

            <button
              type="button"
              aria-label="Switch to dark theme"
              aria-pressed={theme === 'dark'}
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={17} />
            </button>
          </div>

          <button
            className={`icon-button ${view === 'settings' ? 'active' : ''}`}
            aria-label="Toggle settings"
            aria-pressed={view === 'settings'}
            onClick={() => setView((v) => (v === 'settings' ? 'scan' : 'settings'))}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="popup-main">{view === 'settings' ? <SettingsView /> : <ScanView />}</main>

      {scanError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-content">{scanError}</div>
        </div>
      )}

      <footer className="popup-footer">
        Built with <span className="footer-heart">❤️</span> for developers
      </footer>
    </div>
  );
}

function ScanView() {
  const { scanState, currentScan, setScanError, settings } = usePopupStore();
  const { startScan } = useScanAction();
  const [activeIssueType, setActiveIssueType] = useState<IssueType | null>(null);
  const [focusingIssueId, setFocusingIssueId] = useState<string | null>(null);
  const drilldownRef = useRef<HTMLDivElement>(null);
  const autoScanFired = useRef(false);

  useEffect(() => {
    if (!autoScanFired.current && settings?.autoScan && scanState === 'idle' && !currentScan) {
      autoScanFired.current = true;
      void startScan();
    }
  }, [settings, scanState, currentScan, startScan]);

  useEffect(() => {
    if (activeIssueType && drilldownRef.current) {
      drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIssueType]);

  const healthStatus = getHealthStatus(currentScan?.healthScore);
  const hasScan = currentScan !== null;
  const issueSummary = useMemo(
    () => [
      {
        key: 'dead-buttons',
        label: 'Dead Buttons',
        count: currentScan?.issues.deadButtons.length,
        type: 'DEAD_BUTTON' as IssueType,
        issues: currentScan?.issues.deadButtons || [],
        icon: CircleX,
        tone: 'red',
      },
      {
        key: 'broken-links',
        label: 'Broken Links',
        count: currentScan?.issues.brokenLinks.length,
        type: 'BROKEN_LINK' as IssueType,
        issues: currentScan?.issues.brokenLinks || [],
        icon: Link2Off,
        tone: 'orange',
      },
      {
        key: 'missing-images',
        label: 'Missing Images',
        count: currentScan?.issues.missingImages.length,
        type: 'MISSING_IMAGE' as IssueType,
        issues: currentScan?.issues.missingImages || [],
        icon: ImageOff,
        tone: 'purple',
      },
      {
        key: 'overflow',
        label: 'Overflow Issues',
        count: currentScan?.issues.overflowIssues.length,
        type: 'OVERFLOW' as IssueType,
        issues: currentScan?.issues.overflowIssues || [],
        icon: Maximize,
        tone: 'cyan',
      },
      {
        key: 'accessibility',
        label: 'Accessibility',
        count: currentScan?.issues.accessibility.length,
        type: 'ACCESSIBILITY' as IssueType,
        issues: currentScan?.issues.accessibility || [],
        icon: Accessibility,
        tone: 'green',
      },
      {
        key: 'console-errors',
        label: 'Console Errors',
        count: currentScan?.issues.consoleErrors.length,
        type: 'CONSOLE_ERROR' as IssueType,
        issues: currentScan?.issues.consoleErrors || [],
        icon: TerminalSquare,
        tone: 'blue',
      },
    ],
    [currentScan]
  );

  const selectedIssueGroup = useMemo(
    () => issueSummary.find((issue) => issue.type === activeIssueType) || null,
    [issueSummary, activeIssueType]
  );

  const onIssueCardClick = async (issueType: IssueType, count?: number) => {
    if (!hasScan) {
      setScanError('Run a scan first, then click a card to inspect exact failed elements.');
      return;
    }

    setScanError(null);
    setActiveIssueType(issueType);

    // If this category has issues, immediately guide the user to the first failed element.
    if (count && count > 0) {
      const firstIssue = issueSummary.find((issue) => issue.type === issueType)?.issues[0];
      if (firstIssue?.element) {
        await focusIssue(firstIssue);
      }
    }
  };

  const getIssueDetails = (
    issue: BaseIssue
  ): { label: string; value: string; mono?: boolean }[] => {
    const details: { label: string; value: string; mono?: boolean }[] = [];

    if (issue.element?.textContent?.trim()) {
      details.push({ label: 'Text', value: `"${issue.element.textContent.trim().slice(0, 60)}"` });
    }
    if (issue.element?.id) {
      details.push({ label: 'ID', value: `#${issue.element.id}`, mono: true });
    }
    if (issue.element?.tagName) {
      details.push({ label: 'Tag', value: `<${issue.element.tagName.toLowerCase()}>`, mono: true });
    }

    switch (issue.type) {
      case 'DEAD_BUTTON': {
        const i = issue as DeadButtonIssue;
        const deadReasons: Record<string, string> = {
          empty_onclick: 'onclick handler is empty',
          hash_href: 'href points to # only',
          void_href: 'href uses javascript:void',
          no_handler: 'No click handler attached',
          disabled: 'Element is disabled',
          role_without_handler: 'ARIA role with no handler',
        };
        details.push({ label: 'Reason', value: deadReasons[i.reason] ?? i.reason });
        break;
      }
      case 'BROKEN_LINK': {
        const i = issue as BrokenLinkIssue;
        if (i.href) details.push({ label: 'href', value: i.href, mono: true });
        const linkReasons: Record<string, string> = {
          empty_href: 'href attribute is empty',
          malformed_url: 'URL is malformed or invalid',
          anchor_only: 'Anchor-only link with no target',
          javascript_void: 'Uses javascript:void(0)',
        };
        details.push({ label: 'Reason', value: linkReasons[i.reason] ?? i.reason });
        break;
      }
      case 'MISSING_IMAGE': {
        const i = issue as MissingImageIssue;
        if (i.src) details.push({ label: 'src', value: i.src, mono: true });
        const imgReasons: Record<string, string> = {
          missing_src: 'src attribute is absent',
          failed_load: 'Image failed to load (404 or network error)',
          empty_src: 'src attribute is empty',
        };
        details.push({ label: 'Reason', value: imgReasons[i.reason] ?? i.reason });
        break;
      }
      case 'OVERFLOW': {
        const i = issue as OverflowIssue;
        details.push({
          label: 'Overflow',
          value: `${i.overflowAmount}px past container (${i.scrollWidth}px vs ${i.clientWidth}px)`,
        });
        break;
      }
      case 'ACCESSIBILITY': {
        const i = issue as AccessibilityIssue;
        const a11yReasons: Record<string, string> = {
          missing_alt: 'Image is missing alt text',
          missing_label: 'Form element has no label',
          empty_button: 'Button has no visible text',
          missing_aria_label: 'Missing aria-label attribute',
          low_contrast: 'Text contrast ratio is too low',
        };
        details.push({ label: 'Reason', value: a11yReasons[i.reason] ?? i.reason });
        if (i.wcagLevel) details.push({ label: 'WCAG', value: `Level ${i.wcagLevel}` });
        break;
      }
      case 'CONSOLE_ERROR': {
        const i = issue as ConsoleErrorIssue;
        details.push({ label: 'Error', value: i.errorMessage });
        details.push({ label: 'Type', value: i.errorType });
        if (i.url)
          details.push({ label: 'File', value: i.url.split('/').pop() || i.url, mono: true });
        if (i.line != null)
          details.push({
            label: 'Location',
            value: `Line ${i.line}${i.column != null ? `, Col ${i.column}` : ''}`,
            mono: true,
          });
        break;
      }
    }

    return details;
  };

  const focusIssue = async (issue: BaseIssue) => {
    setFocusingIssueId(issue.id);
    setScanError(null);

    try {
      const response = (await sendToBackground(
        createMessage(MessageType.FOCUS_ISSUE, {
          issueId: issue.id,
          issueType: issue.type,
          element: issue.element,
        })
      )) as {
        success?: boolean;
        data?: { success?: boolean; data?: { focused?: boolean; error?: string } };
        error?: string;
      };

      const focusPayload = response?.data?.data;
      if (response?.success === false || response?.error || focusPayload?.focused === false) {
        throw new Error(response?.error || focusPayload?.error || 'Unable to locate issue element');
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Unable to locate issue element');
    } finally {
      setFocusingIssueId(null);
    }
  };

  const displayScore = currentScan?.healthScore;
  const circumference = 427;
  const ringDash = `${(displayScore ?? 0) * 4.27} ${circumference}`;
  const pageHost = currentScan?.url
    ? new URL(currentScan.url).hostname.replace(/^www\./, '')
    : null;

  return (
    <div className="scan-view">
      <section className="hero-panel">
        <div className="score-card-content">
          <div className="score-left">
            <svg className="score-ring" width="150" height="150" viewBox="0 0 170 170">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fb4347" />
                  <stop offset="48%" stopColor="#f7db1c" />
                  <stop offset="100%" stopColor="#38d654" />
                </linearGradient>
              </defs>

              <circle cx="85" cy="85" r="68" stroke="#202227" strokeWidth="13" fill="none" />

              <circle
                cx="85"
                cy="85"
                r="68"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={ringDash}
                transform="rotate(-90 85 85)"
              />
            </svg>
            <div className="score-number">{displayScore ?? '--'}</div>
            <div className="score-max">/100</div>
          </div>

          <div className="score-right">
            <div className={`score-status ${healthStatus.className}`}>
              {healthStatus.label}
              <span>{healthStatus.emoji}</span>
            </div>
            <div className="score-desc">{healthStatus.message}</div>

            {hasScan && (
              <div className="scan-delta">
                <strong>Scan complete</strong>
                <span>{currentScan.metadata.totalIssues} issues found</span>
              </div>
            )}

            {hasScan && pageHost && (
              <div className="scan-meta">
                <span>Scanned just now</span>
                <span>
                  {pageHost}
                  <ExternalLink size={12} />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="scan-art">
          <div className="art-grid" />
          <div className="monitor">
            <ShieldCheck size={42} strokeWidth={1.9} />
          </div>
          <div className="monitor-stand" />

          <button className="primary-btn" onClick={startScan} disabled={scanState === 'scanning'}>
            {scanState === 'scanning' ? (
              <span className="spinner" />
            ) : (
              <>
                <Activity size={17} strokeWidth={2.5} />
                {hasScan ? 'Rescan Page' : 'Scan Page'}
              </>
            )}
          </button>
          <p>Quick • Accurate • Actionable</p>
        </div>
      </section>

      <section className="overview-panel">
        <div className="overview-header">
          <div className="overview-title">
            <span className="overview-dot" />
            <strong>Overview</strong>
          </div>
        </div>

        <div className="issues-grid">
          {issueSummary.map((issue) => {
            const Icon = issue.icon;
            const issueSeverity = getIssueSeverity(issue.key, issue.count);
            const isActive = activeIssueType === issue.type;

            return (
              <button
                className={`issue-card ${isActive ? 'active' : ''}`}
                key={issue.key}
                type="button"
                onClick={() => void onIssueCardClick(issue.type, issue.count)}
                aria-pressed={isActive}
              >
                <div className={`issue-icon ${issue.tone}`}>
                  <Icon size={19} />
                </div>
                <div className="issue-count">{issue.count ?? '--'}</div>
                <div className="issue-label">{issue.label}</div>
                {issueSeverity && (
                  <div className={`issue-badge ${issueSeverity.toLowerCase()}`}>
                    {issueSeverity}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedIssueGroup && (
          <div className="issue-drilldown" ref={drilldownRef}>
            <div className="issue-drilldown-header">
              <strong>{selectedIssueGroup.label}</strong>
              <span>{selectedIssueGroup.issues.length} issues</span>
            </div>

            <div className="issue-drilldown-list">
              {selectedIssueGroup.issues.length === 0 && (
                <article className="issue-drilldown-empty">
                  <p>No failed issues in this category for the current scan.</p>
                </article>
              )}

              {selectedIssueGroup.issues.map((issue) => {
                const details = getIssueDetails(issue);
                return (
                  <article key={issue.id} className="issue-drilldown-item">
                    <div className="issue-drilldown-message">{issue.message}</div>

                    {details.length > 0 && (
                      <div className="issue-detail-rows">
                        {details.map((d) => (
                          <div key={d.label} className="issue-detail-row">
                            <span className="issue-detail-label">{d.label}</span>
                            <span className={`issue-detail-value${d.mono ? ' mono' : ''}`}>
                              {d.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {issue.element?.selector && (
                      <div className="issue-drilldown-selector">📍 {issue.element.selector}</div>
                    )}

                    {issue.recommendation && (
                      <p className="issue-drilldown-recommendation">{issue.recommendation}</p>
                    )}

                    {issue.element && (
                      <button
                        type="button"
                        className="locate-btn"
                        onClick={() => void focusIssue(issue)}
                        disabled={focusingIssueId === issue.id}
                      >
                        {focusingIssueId === issue.id ? 'Locating...' : 'Locate on page'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Settings View ──────────────────────────────────────────────────────────

function SettingsView() {
  const SCANNER_CONFIG: {
    type: IssueType;
    label: string;
    icon: React.ElementType;
    tone: string;
  }[] = [
    { type: IssueType.DEAD_BUTTON, label: 'Dead Buttons', icon: CircleX, tone: 'red' },
    { type: IssueType.BROKEN_LINK, label: 'Broken Links', icon: Link2Off, tone: 'orange' },
    { type: IssueType.MISSING_IMAGE, label: 'Missing Images', icon: ImageOff, tone: 'purple' },
    { type: IssueType.OVERFLOW, label: 'Overflow', icon: Maximize, tone: 'cyan' },
    {
      type: IssueType.ACCESSIBILITY,
      label: 'Accessibility',
      icon: Accessibility,
      tone: 'green',
    },
    { type: IssueType.CONSOLE_ERROR, label: 'Console Errors', icon: TerminalSquare, tone: 'blue' },
  ];

  const { settings, setSettings } = usePopupStore();
  const current: UserSettings = settings ?? DEFAULT_SETTINGS;

  const save = async (patch: Partial<UserSettings>) => {
    const optimistic = { ...current, ...patch };
    setSettings(optimistic);
    try {
      const res = (await sendToBackground(
        createMessage(MessageType.UPDATE_SETTINGS, patch)
      )) as UserSettings | null;
      if (res && typeof res === 'object' && 'autoScan' in res) setSettings(res);
    } catch {
      setSettings(current);
    }
  };

  const toggleScanner = (type: IssueType) => {
    const next = current.enabledScanners.includes(type)
      ? current.enabledScanners.filter((t) => t !== type)
      : [...current.enabledScanners, type];
    void save({ enabledScanners: next });
  };

  return (
    <div className="settings-view">
      <section className="settings-section">
        <div className="settings-section-title">Active Scanners</div>
        {SCANNER_CONFIG.map(({ type, label, icon: Icon, tone }) => {
          const on = current.enabledScanners.includes(type);
          return (
            <div
              key={type}
              className="settings-row"
              role="switch"
              aria-checked={on}
              tabIndex={0}
              onClick={() => toggleScanner(type)}
              onKeyDown={(e) => e.key === 'Enter' && toggleScanner(type)}
            >
              <div className={`issue-icon settings-icon ${tone}`}>
                <Icon size={14} />
              </div>
              <span className="settings-row-label">{label}</span>
              <div className={`settings-toggle ${on ? 'on' : ''}`} />
            </div>
          );
        })}
      </section>

      <section className="settings-section">
        <div className="settings-section-title">Behaviour</div>
        <div
          className="settings-row"
          role="switch"
          aria-checked={current.autoScan}
          tabIndex={0}
          onClick={() => void save({ autoScan: !current.autoScan })}
          onKeyDown={(e) => e.key === 'Enter' && void save({ autoScan: !current.autoScan })}
        >
          <span className="settings-row-label">
            Auto-scan when popup opens
            <span className="settings-row-hint">
              Scan the page automatically each time you open the extension
            </span>
          </span>
          <div className={`settings-toggle ${current.autoScan ? 'on' : ''}`} />
        </div>
      </section>
    </div>
  );
}

export default IndexPopup;
