/**
 * Issue List Component
 * Displays scan issues with filtering and sorting
 */

import React from 'react';
import type { BaseIssue, IssueType, IssueSeverity } from '@/types';
import { usePopupStore } from '@/store/popup';

interface IssueListProps {
  issues: BaseIssue[];
}

export function IssueList({ issues }: IssueListProps) {
  const { issueFilter, expandedIssueId, setExpandedIssueId } = usePopupStore();

  const filteredIssues = React.useMemo(() => {
    if (issueFilter === 'all') return issues;
    return issues.filter((issue) => issue.severity.toLowerCase() === issueFilter);
  }, [issues, issueFilter]);

  const toggleIssue = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  if (filteredIssues.length === 0) {
    return (
      <div className="issue-list-empty">
        <p>✨ No issues found!</p>
        <p className="text-muted">Your page is looking great.</p>
      </div>
    );
  }

  return (
    <div className="issue-list">
      {filteredIssues.map((issue) => (
        <IssueItem
          key={issue.id}
          issue={issue}
          isExpanded={expandedIssueId === issue.id}
          onToggle={() => toggleIssue(issue.id)}
        />
      ))}
    </div>
  );
}

interface IssueItemProps {
  issue: BaseIssue;
  isExpanded: boolean;
  onToggle: () => void;
}

function IssueItem({ issue, isExpanded, onToggle }: IssueItemProps) {
  const getSeverityIcon = (severity: IssueSeverity): string => {
    switch (severity) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getIssueTypeLabel = (type: IssueType): string => {
    const labels: Record<IssueType, string> = {
      DEAD_BUTTON: 'Dead Button',
      BROKEN_LINK: 'Broken Link',
      MISSING_IMAGE: 'Missing Image',
      OVERFLOW: 'Overflow',
      ACCESSIBILITY: 'Accessibility',
      CONSOLE_ERROR: 'Console Error',
    };
    return labels[type];
  };

  return (
    <div className={`issue-item severity-${issue.severity.toLowerCase()}`}>
      <div className="issue-header" onClick={onToggle}>
        <div className="issue-severity">{getSeverityIcon(issue.severity)}</div>
        <div className="issue-info">
          <div className="issue-type">{getIssueTypeLabel(issue.type)}</div>
          <div className="issue-message">{issue.message}</div>
        </div>
        <div className="issue-toggle">{isExpanded ? '▼' : '▶'}</div>
      </div>

      {isExpanded && (
        <div className="issue-details">
          {issue.element && (
            <>
              <div className="issue-detail-row">
                <strong>Element:</strong>
                <code>{issue.element.tagName}</code>
              </div>
              {issue.element.xpath && (
                <div className="issue-detail-row">
                  <strong>XPath:</strong>
                  <code className="xpath-code">{issue.element.xpath}</code>
                </div>
              )}
            </>
          )}
          {issue.recommendation && (
            <div className="issue-recommendation">
              <strong>💡 Recommendation:</strong>
              <p>{issue.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
