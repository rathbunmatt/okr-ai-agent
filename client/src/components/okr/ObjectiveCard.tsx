import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Edit, History } from 'lucide-react'
import type { ObjectiveDraft } from '../../types'

interface ObjectiveCardProps {
  objective: ObjectiveDraft
}

export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <Card role="region" aria-label="Objective development">
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg" id="objective-title">Objective</CardTitle>
          <div className="flex space-x-1 md:space-x-2" role="group" aria-labelledby="objective-title">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-8 px-2 md:h-9 md:px-3 touch-manipulation"
              aria-expanded={showHistory}
              aria-controls="objective-history"
              aria-label={`${showHistory ? 'Hide' : 'Show'} objective history`}
            >
              <History className="w-3 h-3 md:w-4 md:h-4 md:mr-1" aria-hidden="true" />
              <span className="hidden md:inline">History</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 md:h-9 md:px-3 touch-manipulation"
              aria-label="Edit objective"
            >
              <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-1" aria-hidden="true" />
              <span className="hidden md:inline">Edit</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
        {/* Current Objective */}
        <div className="p-3 md:p-4 bg-muted/50 rounded-lg border">
          <p className="font-medium text-sm md:text-base">{objective.text}</p>
        </div>

        {/* Quality Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs md:text-sm">
            <span>Quality Score</span>
            <span className="font-medium">{objective.qualityScore}/100</span>
          </div>
          <Progress value={objective.qualityScore} className="h-1.5 md:h-2" />
        </div>

        {/* Feedback */}
        {objective.feedback && objective.feedback.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-xs md:text-sm">Feedback:</h4>
            <ul className="space-y-1">
              {objective.feedback.map((item, index) => (
                <li key={index} className="text-xs md:text-sm text-muted-foreground">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Version History */}
        {showHistory && objective.versions && objective.versions.length > 0 && (
          <div className="space-y-2 border-t pt-3 md:pt-4" id="objective-history">
            <h4 className="font-medium text-xs md:text-sm">Previous Versions:</h4>
            <div className="space-y-2 max-h-32 md:max-h-40 overflow-y-auto" role="list" aria-label="Objective version history">
              {objective.versions.map((version, index) => (
                <div key={index} className="p-2 md:p-3 bg-muted/30 rounded text-xs md:text-sm" role="listitem">
                  <p className="text-muted-foreground mb-1">{version.text}</p>
                  <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                    <span>Score: {version.score}/100</span>
                    <time dateTime={version.timestamp.toISOString()}>
                      {version.timestamp.toLocaleString()}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}