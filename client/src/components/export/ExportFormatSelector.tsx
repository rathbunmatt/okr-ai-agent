import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import type { ExportOptions } from '../../types'

interface ExportFormatSelectorProps {
  options: ExportOptions
  onChange: (options: ExportOptions) => void
}

export function ExportFormatSelector({ options, onChange }: ExportFormatSelectorProps) {
  const toggleOption = (key: keyof Omit<ExportOptions, 'format'>) => {
    onChange({
      ...options,
      [key]: !options[key],
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Export Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Button
            variant={options.includeScores ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleOption('includeScores')}
            className="w-full justify-start"
          >
            {options.includeScores ? '✓' : ''} Include Quality Scores
          </Button>

          <Button
            variant={options.includeFeedback ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleOption('includeFeedback')}
            className="w-full justify-start"
          >
            {options.includeFeedback ? '✓' : ''} Include Feedback
          </Button>

          <Button
            variant={options.includeHistory ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleOption('includeHistory')}
            className="w-full justify-start"
          >
            {options.includeHistory ? '✓' : ''} Include Version History
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Quality scores show improvement areas</p>
          <p>• Feedback provides actionable suggestions</p>
          <p>• Version history shows your OKR evolution</p>
        </div>
      </CardContent>
    </Card>
  )
}