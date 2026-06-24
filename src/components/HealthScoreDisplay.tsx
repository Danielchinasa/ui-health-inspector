/**
 * Health Score Display Component
 * Shows the health score with visual indicator
 */

interface HealthScoreDisplayProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export function HealthScoreDisplay({ score, size = 'large' }: HealthScoreDisplayProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Attention';
  };

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const sizeClasses = {
    small: 'health-score-small',
    medium: 'health-score-medium',
    large: 'health-score-large',
  };

  return (
    <div className={`health-score ${sizeClasses[size]}`}>
      <div className="health-score-circle" style={{ borderColor: color }}>
        <div className="health-score-value" style={{ color }}>
          {score}
        </div>
        <div className="health-score-max">/100</div>
      </div>
      <div className="health-score-label" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
