import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { useConversationStore } from '../../store/conversationStore'

const dimensionLabels = {
  outcome: 'Outcome-focused',
  inspiration: 'Inspirational',
  clarity: 'Clear & Specific',
  alignment: 'Team Aligned',
  ambition: 'Appropriately Ambitious'
}

const dimensionDescriptions = {
  outcome: 'Focuses on results, not activities',
  inspiration: 'Motivates and energizes the team',
  clarity: 'Unambiguous and well-defined',
  alignment: 'Supports team and company goals',
  ambition: 'Challenging but achievable'
}

export function QualityScoreChart() {
  const { qualityScores } = useConversationStore()

  return (
    <Card>
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg">Quality Assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
        <div className="grid gap-2 md:gap-3">
          {Object.entries(qualityScores.dimensions).map(([key, score]) => (
            <div key={key} className="space-y-1 md:space-y-2">
              <div className="flex justify-between items-start md:items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs md:text-sm truncate">
                    {dimensionLabels[key as keyof typeof dimensionLabels]}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">
                    {dimensionDescriptions[key as keyof typeof dimensionDescriptions]}
                  </div>
                </div>
                <div className="text-xs md:text-sm font-medium ml-2 shrink-0">
                  {score}/100
                </div>
              </div>
              <Progress value={score} className="h-1.5 md:h-2" />
            </div>
          ))}
        </div>

        {qualityScores.feedback.length > 0 && (
          <div className="space-y-2 pt-3 md:pt-4 border-t">
            <h4 className="font-medium text-xs md:text-sm">Overall Feedback:</h4>
            <ul className="space-y-1">
              {qualityScores.feedback.map((item, index) => (
                <li key={index} className="text-xs md:text-sm text-muted-foreground">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t text-[10px] md:text-xs text-muted-foreground">
          <span>Confidence Level</span>
          <span>{Math.round(qualityScores.confidence * 100)}%</span>
        </div>
      </CardContent>
    </Card>
  )
}