import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Edit, Target, TrendingUp } from 'lucide-react'
import type { KeyResultDraft } from '../../types'

interface KeyResultsListProps {
  keyResults: KeyResultDraft[]
}

export function KeyResultsList({ keyResults }: KeyResultsListProps) {
  return (
    <Card>
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg">Key Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
        {keyResults.map((kr, index) => (
          <div key={kr.id} className="p-3 md:p-4 border rounded-lg space-y-2 md:space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs md:text-sm font-medium">KR {index + 1}</span>
                  <Badge variant={kr.isQuantified ? 'default' : 'secondary'} className="text-[10px] md:text-xs">
                    {kr.isQuantified ? 'Quantified' : 'Needs metrics'}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm">{kr.text}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 md:h-9 md:w-9 touch-manipulation">
                <Edit className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>

            {/* Quality Score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Quality Score</span>
                <span className="font-medium">{kr.qualityScore}/100</span>
              </div>
              <Progress value={kr.qualityScore} className="h-1.5" />
            </div>

            {/* Metrics Information */}
            {kr.isQuantified && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] md:text-xs">
                <div className="flex items-center space-x-1">
                  <Target className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Baseline:</span>
                  <span className="font-medium">{kr.baseline || 'Not set'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-medium">{kr.target || 'Not set'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-muted-foreground">Metric:</span>
                  <span className="font-medium">{kr.metric || 'Not set'}</span>
                </div>
              </div>
            )}

            {/* Feedback */}
            {kr.feedback.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-medium">Suggestions:</h5>
                <ul className="space-y-1">
                  {kr.feedback.map((item, feedbackIndex) => (
                    <li key={feedbackIndex} className="text-xs text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {keyResults.length < 5 && (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-3 md:p-4 text-center">
            <p className="text-xs md:text-sm text-muted-foreground">
              {keyResults.length === 0
                ? 'Key results will appear here as you work through the conversation'
                : `Add ${5 - keyResults.length} more key result${5 - keyResults.length === 1 ? '' : 's'} for a complete OKR set`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}