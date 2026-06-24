/**
 * Popup Entry Point
 * Main UI for the extension
 */

import React from 'react';

import { createLogger } from '@/utils/logger';

import './popup.css';

const logger = createLogger('Popup');

function IndexPopup() {
  React.useEffect(() => {
    logger.info('Popup mounted');
  }, []);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>UI Health Inspector</h1>
        <p className="version">v1.0.0 - Phase 1</p>
      </header>

      <main className="popup-main">
        <div className="status-card">
          <h2>🔧 Phase 1: Infrastructure Ready</h2>
          <ul className="feature-list">
            <li>✅ Message passing system</li>
            <li>✅ Storage manager</li>
            <li>✅ Error handling</li>
            <li>✅ Background worker</li>
            <li>✅ Content script</li>
          </ul>
        </div>

        <div className="info-card">
          <p>
            <strong>Next Phase:</strong> Scanner Engine & Contract System
          </p>
          <p className="info-text">
            The core infrastructure is now in place. Phase 2 will implement the scanner
            architecture.
          </p>
        </div>
      </main>

      <footer className="popup-footer">
        <p>Phase 1 Complete</p>
      </footer>
    </div>
  );
}

export default IndexPopup;
