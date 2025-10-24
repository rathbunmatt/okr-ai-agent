import type { QualityScores } from '../../types'

interface QualityScoreIndicatorProps {
  scores: QualityScores
  compact?: boolean
}

export function QualityScoreIndicator({ scores, compact = false }: QualityScoreIndicatorProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreEmoji = (score: number): string => {
    if (score >= 90) return '🌟'
    if (score >= 80) return '✅'
    if (score >= 70) return '👍'
    if (score >= 60) return '⚠️'
    return '❌'
  }

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-xs">
        <span>{getScoreEmoji(scores.overall)}</span>
        <span className={getScoreColor(scores.overall)}>
          {scores.overall}/100
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Overall Score */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${getScoreBgColor(scores.overall)}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getScoreEmoji(scores.overall)}</span>
          <span className="font-semibold text-sm">Overall Quality</span>
        </div>
        <span className={`text-lg font-bold ${getScoreColor(scores.overall)}`}>
          {scores.overall}/100
        </span>
      </div>

      {/* Dimension Scores */}
      {scores.dimensions && (
        <div className="space-y-1.5">
          {Object.entries(scores.dimensions).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {key}
                  </span>
                  <span className={`text-xs font-semibold ${getScoreColor(value)}`}>
                    {value}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      value >= 80
                        ? 'bg-green-500'
                        : value >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confidence Indicator */}
      {scores.confidence !== undefined && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <span>Confidence:</span>
          <span className="font-medium">{Math.round(scores.confidence * 100)}%</span>
        </div>
      )}
    </div>
  )
}
