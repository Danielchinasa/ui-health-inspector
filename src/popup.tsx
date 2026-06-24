/**
 * Popup Entry Point
 * Main UI for the extension
 */

import React from 'react';
import { createLogger } from '@/utils/logger';
import { usePopupStore } from '@/store/popup';
import { usePopupInit, useScanAction, useHighlights } from '@/hooks/popup';
import { TabNavigation } from '@/components/TabNavigation';
import { HealthScoreDisplay } from '@/components/HealthScoreDisplay';
import { IssueList } from '@/components/IssueList';
import { IssueFilterBar } from '@/components/IssueFilterBar';

import './popup.css';

const logger = createLogger('Popup');

function IndexPopup() {
  // Initialize popup data
  usePopupInit();

  const {
    currentTab,
    scanError,
  } = usePopupStore();

  React.useEffect(() => {
    logger.info('Popup mounted');
  }, []);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>
          <span className="logo-icon">🔍</span>
          UI Health Inspector
        </h1>
        <p className="version">v1.0.0</p>
      </header>

      <TabNavigation />

      <main className="popup-main">
        {currentTab === 'scan' && <ScanView />}
        {currentTab === 'history' && <HistoryView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {scanError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {scanError}
        </div>
      )}
    </div>
  );
}

/**
 * Scan View - Main scanning interface
 */
function ScanView() {
  const { scanState, currentScan } = usePopupStore();
  const { startScan } = useScanAction();
  const { highlightsEnabled, toggleHighlights } = useHighlights();

  const allIssues = React.useMemo(() => {
    if (!currentScan) return [];
    return [
      ...currentScan.issues.deadButtons,
      ...currentScan.issues.brokenLinks,
      ...currentScan.issues.missingImages,
      ...currentScan.issues.overflowIssues,
      ...currentScan.issues.accessibility,
      ...currentScan.issues.consoleErrors,
    ];
  }, [currentScan]);

  return (
    <div className="scan-view">
      {/* Scan Controls */}
      <div className="scan-controls">
        <button
          className={`scan-button ${scanState === 'scanning' ? 'scanning' : ''}`}
          onClick={startScan}
          disabled={scanState === 'scanning'}
        >
          {scanState === 'scanning' ? (
            <>
              <span className="spinner"></span>
              Scanning...
            </>
          ) : (
            <>
              <span className="scan-icon">▶️</span>
              Start Scan
            </>
          )}
        </button>

        {currentScan && (
          <button
            className={`highlight-toggle ${highlightsEnabled ? 'active' : ''}`}
            onClick={toggleHighlights}
          >
            <span className="toggle-icon">{highlightsEnabled ? '👁️' : '👁️‍🗨️'}</span>
            {highlightsEnabled ? 'Hide' : 'Show'} Highlights
          </button>
        )}
      </div>

      {/* Health Score */}
      {currentScan && (
        <div className="health-score-section">
          <HealthScoreDisplay score={currentScan.healthScore} />
          <div className="scan-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Issues Found:</span>
              <span className="metadata-value">{currentScan.metadata.totalIssues}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Scan Time:</span>
              <span className="metadata-value">
                {(currentScan.metadata.scanDuration / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Elements:</span>
              <span className="metadata-value">{currentScan.metadata.domElementCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Issue List */}
      {currentScan && allIssues.length > 0 && (
        <div className="issues-section">
          <div className="section-header">
            <h2>Issues Detected</h2>
          </div>
          <IssueFilterBar issues={allIssues} />
          <IssueList issues={allIssues} />
        </div>
      )}

      {/* Empty State */}
      {!currentScan && scanState === 'idle' && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Ready to Inspect</h3>
          <p>Click &quot;Start Scan&quot; to analyze this page for UI/UX issues.</p>
          <ul className="feature-list">
            <li>✅ Dead buttons & broken links</li>
            <li>✅ Missing images & overflow</li>
            <li>✅ Accessibility issues</li>
            <li>✅ Console errors</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * History View - Past scan results
 */
function HistoryView() {
  const { scanHistory, setCurrentScan, setCurrentTab } = usePopupStore();

  const viewScan = (scan: typeof scanHistory[0]) => {
    setCurrentScan(scan);
    setCurrentTab('scan');
  };

  if (scanHistory.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📜</div>
        <h3>No Scan History</h3>
        <p>Your past scans will appear here.</p>
      </div>
    );
  }

  return (
    <div className="history-view">
      <h2>Scan History</h2>
      <div className="history-list">
        {scanHistory.map((scan) => (
          <div key={scan.timestamp} className="history-item" onClick={() => viewScan(scan)}>
            <div className="history-score">
              <HealthScoreDisplay score={scan.healthScore} size="small" />
            </div>
            <div className="history-info">
              <div className="history-url">{new URL(scan.url).hostname}</div>
              <div className="history-meta">
                {new Date(scan.timestamp).toLocaleString()} · {scan.metadata.totalIssues}{' '}
                issues
              </div>
            </div>
            <div className="history-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings View - Configuration options
 */
function SettingsView() {
  const { settings } = usePopupStore();

  if (!settings) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Scanner Settings</h3>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Auto-scan on load</div>
            <div className="setting-description">
              Automatically scan pages when extension is opened
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.autoScan} readOnly />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Show highlights</div>
            <div className="setting-description">
              Highlight issues on the page by default
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.highlightByDefault} readOnly />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="about-info">
          <p>
            <strong>UI Health Inspector</strong> helps you identify and fix UI/UX issues on web
            pages.
          </p>
          <p className="version-info">Version 1.0.0 - Phase 3</p>
          <p className="links">
            <a
              href="https://github.com/Danielchinasa/ui-health-inspector"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            {' · '}
            <a
              href="https://github.com/Danielchinasa/ui-health-inspector/issues"
              target="_blank"
              rel="noreferrer"
            >
              Report Issue
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default IndexPopup;
