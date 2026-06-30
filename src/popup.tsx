import { useEffect } from 'react';

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

  const { scanError } = usePopupStore();

  // Read extension version from the manifest
  const manifest = (
    typeof chrome !== 'undefined' ? (chrome as any).runtime?.getManifest?.() : null
  ) as any;
  const version = manifest?.version || 'dev';

  useEffect(() => {
    logger.info('Popup mounted');
  }, []);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="header-left">
          <div className="title-wrap">
            <h1>UI Health</h1>

            <div className="subtitle-row">
              <span>Design Quality Inspector</span>
              <div className="app-version">v{version}</div>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <div className="theme-toggle">
            <button className="theme-option">
              <Sun size={17} />
            </button>

            <button className="theme-option active">
              <Moon size={17} />
            </button>
          </div>

          <button className="icon-button">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="popup-main">
        <ScanView />
      </main>

      {scanError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-content">{scanError}</div>
        </div>
      )}

      <footer className="popup-footer">Built with <span className="footer-heart">❤️</span> for developers</footer>
    </div>
  );
}

function ScanView() {
  const { scanState, currentScan } = usePopupStore();
  const { startScan } = useScanAction();

  const healthStatus = getHealthStatus(currentScan?.healthScore);
  const hasScan = currentScan !== null;
  const issueSummary = [
    {
      key: 'dead-buttons',
      label: 'Dead Buttons',
      count: currentScan?.issues.deadButtons.length,
      icon: CircleX,
      tone: 'red',
    },
    {
      key: 'broken-links',
      label: 'Broken Links',
      count: currentScan?.issues.brokenLinks.length,
      icon: Link2Off,
      tone: 'orange',
    },
    {
      key: 'missing-images',
      label: 'Missing Images',
      count: currentScan?.issues.missingImages.length,
      icon: ImageOff,
      tone: 'purple',
    },
    {
      key: 'overflow',
      label: 'Overflow Issues',
      count: currentScan?.issues.overflowIssues.length,
      icon: Maximize,
      tone: 'cyan',
    },
    {
      key: 'accessibility',
      label: 'Accessibility',
      count: currentScan?.issues.accessibility.length,
      icon: Accessibility,
      tone: 'green',
    },
    {
      key: 'console-errors',
      label: 'Console Errors',
      count: currentScan?.issues.consoleErrors.length,
      icon: TerminalSquare,
      tone: 'blue',
    },
  ];
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
                Scan Page
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

            return (
              <button className="issue-card" key={issue.key}>
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
      </section>
    </div>
  );
}

export default IndexPopup;
