import { useEffect } from 'react';

import {
  ShieldCheck,
  Settings,
  Moon,
  Activity,
  Eye,
  CircleX,
  Link2Off,
  ImageOff,
  Maximize,
  Accessibility,
  TerminalSquare,
  HelpCircle,
} from 'lucide-react';
import './popup.css';

import { createLogger } from '@/utils/logger';
import { usePopupInit, useScanAction, useHighlights } from '@/hooks/popup';
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
          <div className="logo">
            <ShieldCheck size={34} strokeWidth={2.3} />
          </div>

          <div className="title-wrap">
            <h1>UI Health</h1>

            <span>Inspector</span>
            <div className="app-version">v{version}</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="icon-button">
            <Settings size={19} />
          </button>

          <button className="icon-button">
            <Moon size={19} />
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
    </div>
  );
}

function ScanView() {
  const { scanState, currentScan } = usePopupStore();
  const { startScan } = useScanAction();
  const { highlightsEnabled, toggleHighlights } = useHighlights();

  const healthStatus = getHealthStatus(currentScan?.healthScore);

  return (
    <div className="scan-view">
      <div className="card-wrapper">
        <div className="score-card">
          <div className="score-top">
            <div className="score-left">
              <svg className="score-ring" width="108" height="108" viewBox="0 0 170 170">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#31C022" />
                    <stop offset="45%" stopColor="#FACC15" />
                    <stop offset="100%" stopColor="#1B7516" />
                  </linearGradient>
                </defs>

                <circle cx="85" cy="85" r="68" stroke="#1e2d5a" strokeWidth="13" fill="none" />

                <circle
                  cx="85"
                  cy="85"
                  r="68"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray={`${(currentScan?.healthScore ?? 0) * 4.27} 427`}
                  transform="rotate(-90 85 85)"
                />
              </svg>
              <div className="score-number">{currentScan ? currentScan.healthScore : '--'}</div>
              <div className="score-max">/100</div>
            </div>

            <div className="score-right">
              <div className={`score-status ${healthStatus.className}`}>
                {healthStatus.label}
                <span>{healthStatus.emoji}</span>
              </div>
              <div className="score-desc">{healthStatus.message}</div>
            </div>
          </div>

          <button className="primary-btn" onClick={startScan} disabled={scanState === 'scanning'}>
            {scanState === 'scanning' ? (
              <span className="spinner" />
            ) : (
              <>
                <Activity size={18} strokeWidth={2.5} />
                Scan This Page
              </>
            )}
          </button>

          <button className="highlight-button" onClick={toggleHighlights}>
            <Eye size={19} />

            <span>View Live Highlight</span>

            <div className={`toggle ${highlightsEnabled ? 'on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
          </button>
        </div>

        <div className="issues-grid">
          <div className="issue-card">
            <div className="issue-icon red">
              <CircleX size={24} />
            </div>
            <div className="issue-count">
              {currentScan ? currentScan.issues.deadButtons.length : 0}
            </div>
            <div className="issue-label">Dead Buttons</div>
          </div>
          <div className="issue-card">
            <div className="issue-icon orange">
              <Link2Off size={24} />
            </div>
            <div className="issue-count">
              {currentScan ? currentScan.issues.brokenLinks.length : 0}
            </div>
            <div className="issue-label">Broken Links</div>
          </div>
          <div className="issue-card">
            <div className="issue-icon purple">
              <ImageOff size={24} />
            </div>
            <div className="issue-count">
              {currentScan ? currentScan.issues.missingImages.length : 0}
            </div>
            <div className="issue-label">Missing Images</div>
          </div>
          <div className="issue-card">
            <div className="issue-icon cyan">
              <Maximize size={24} />
            </div>
            <div className="issue-count">
              {currentScan ? currentScan.issues.overflowIssues.length : 0}
            </div>
            <div className="issue-label">Overflow Issues</div>
          </div>
          <div className="issue-card">
            <div className="issue-icon green">
              <Accessibility size={24} />
            </div>
            <div className="issue-count">
              {currentScan ? currentScan.issues.accessibility.length : 0}
            </div>
            <div className="issue-label">Accessibility Issues</div>
          </div>
          <div className="issue-card">
            <div className="issue-icon blue">
              <TerminalSquare size={24} />
            </div>
            <div className="issue-count">
              {currentScan ? currentScan.issues.consoleErrors.length : 0}
            </div>
            <div className="issue-label">Console Errors</div>
          </div>
        </div>

        <div className="footer-row">
          <div className="last-scanned">
            Last scanned
            <br />
            <strong>Just now</strong>
          </div>
          <a className="help-link" href="#">
            <HelpCircle size={18} />
            Help & Feedback
          </a>
        </div>
      </div>
    </div>
  );
}

export default IndexPopup;
