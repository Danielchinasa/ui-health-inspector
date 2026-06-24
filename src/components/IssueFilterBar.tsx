/**
 * Issue Filter Component
 * Filters issues by severity
 */

import React from 'react';
import type { IssueFilter } from '@/store/popup';
import { usePopupStore } from '@/store/popup';
import type { BaseIssue } from '@/types';

interface IssueFilterProps {
  issues: BaseIssue[];
}

export function IssueFilterBar({ issues }: IssueFilterProps) {
  const { issueFilter, setIssueFilter } = usePopupStore();

  const counts = React.useMemo(() => {
    return {
      all: issues.length,
      high: issues.filter((i) => i.severity === 'HIGH').length,
      medium: issues.filter((i) => i.severity === 'MEDIUM').length,
      low: issues.filter((i) => i.severity === 'LOW').length,
    };
  }, [issues]);

  const filters: { id: IssueFilter; label: string }[] = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'high', label: `High (${counts.high})` },
    { id: 'medium', label: `Medium (${counts.medium})` },
    { id: 'low', label: `Low (${counts.low})` },
  ];

  return (
    <div className="issue-filter-bar">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className={`filter-button ${issueFilter === filter.id ? 'active' : ''} severity-${filter.id}`}
          onClick={() => setIssueFilter(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
