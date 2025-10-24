import { generateExportContent } from '../../lib/exportGenerators'
import type { ExportFormat, ExportOptions, ObjectiveDraft, KeyResultDraft, QualityScores } from '../../types'

interface ExportPreviewProps {
  format: ExportFormat
  options: ExportOptions
  objective: ObjectiveDraft | null
  keyResults: KeyResultDraft[]
  qualityScores: QualityScores
}

export function ExportPreview({
  format,
  options,
  objective,
  keyResults,
  qualityScores,
}: ExportPreviewProps) {
  if (!objective) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No content to preview
      </div>
    )
  }

  const content = generateExportContent(format, {
    objective,
    keyResults,
    qualityScores,
    options,
  })

  return (
    <div className="p-4">
      {format === 'json' ? (
        <pre className="text-xs overflow-auto max-h-80 bg-muted/50 p-3 rounded">
          {content}
        </pre>
      ) : format === 'markdown' ? (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-sm font-mono">
          {content}
        </div>
      )}
    </div>
  )
}