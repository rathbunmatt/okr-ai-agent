import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { useConversationStore } from '../../store/conversationStore'
import { ObjectiveCard } from './ObjectiveCard'
import { KeyResultsList } from './KeyResultsList'
import { QualityScoreChart } from './QualityScoreChart'
import { ExportButton } from '../export/ExportButton'
import { PhaseProgress } from '../chat/PhaseProgress'

export function OKRDisplay() {
  const { objective, keyResults, qualityScores, phase } = useConversationStore()

  const hasContent = objective || keyResults.length > 0

  if (!hasContent) {
    return (
      <div className="space-y-3 md:space-y-4">
        {/* Conversation Phase Progress */}
        <Card>
          <CardHeader className="pb-3 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg">Conversation Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <PhaseProgress currentPhase={phase} />
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-medium text-muted-foreground mb-2">
                Your OKRs will appear here
              </h3>
              <p className="text-sm text-muted-foreground">
                Start the conversation to see your objectives and key results develop in real-time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Conversation Phase Progress */}
      <Card>
        <CardHeader className="pb-3 px-4 md:px-6">
          <CardTitle className="text-base md:text-lg">Conversation Progress</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <PhaseProgress currentPhase={phase} />
        </CardContent>
      </Card>
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3 px-4 md:px-6">
          <CardTitle className="text-base md:text-lg">OKR Development Progress</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-3">
            <div className="flex justify-between text-xs md:text-sm">
              <span>Overall Quality</span>
              <span className="font-medium">{qualityScores.overall}/100</span>
            </div>
            <Progress value={qualityScores.overall} className="h-1.5 md:h-2" />

            {qualityScores.overall >= 75 && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                <span className="text-xs md:text-sm text-green-700 dark:text-green-300 font-medium">
                  ✅ Ready for export!
                </span>
                <ExportButton variant="outline" size="sm" />
              </div>
            )}

            {qualityScores.overall < 75 && hasContent && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
                <span className="text-xs md:text-sm text-muted-foreground">
                  Continue refining to unlock export features
                </span>
                <ExportButton variant="outline" size="sm" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quality Score Breakdown */}
      <QualityScoreChart />

      {/* Objective */}
      {objective && <ObjectiveCard objective={objective} />}

      {/* Key Results */}
      {keyResults.length > 0 && <KeyResultsList keyResults={keyResults} />}
    </div>
  )
}