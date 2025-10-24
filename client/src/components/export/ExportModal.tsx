import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { useConversationStore } from '../../store/conversationStore'
import { ExportPreview } from './ExportPreview'
import { ExportFormatSelector } from './ExportFormatSelector'
import { Download, Eye, Share2, FileText, Code, FileImage, File } from 'lucide-react'
import type { ExportFormat, ExportOptions } from '../../types'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatIcons = {
  json: Code,
  markdown: FileText,
  pdf: FileImage,
  text: File,
}

const formatDescriptions = {
  json: 'Complete data export with metadata for integration',
  markdown: 'Clean, readable format perfect for team sharing',
  pdf: 'Professional document ready for printing or presentations',
  text: 'Simple plain text format for easy copying and pasting',
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown')
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeScores: true,
    includeHistory: false,
    includeFeedback: true,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { objective, keyResults, qualityScores, exportOKRs } = useConversationStore()

  const canExport = objective && keyResults.length > 0
  const isHighQuality = qualityScores.overall >= 75

  const handleFormatChange = (format: ExportFormat) => {
    setSelectedFormat(format)
    setExportOptions(prev => ({ ...prev, format }))
  }

  const handleExport = async () => {
    if (!canExport) return

    setIsExporting(true)
    try {
      await exportOKRs(selectedFormat)
      onOpenChange(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = () => {
    // FUTURE ENHANCEMENT: Implement social/team sharing functionality
    // Potential features:
    // - Copy OKR link to clipboard
    // - Share via email
    // - Export to team collaboration tools (Slack, Teams, etc.)
    // - Generate shareable public link
    console.log('Share functionality not yet implemented - contributions welcome!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Export Your OKRs</DialogTitle>
          <DialogDescription>
            Choose a format and customize your export options
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-6">
          {!canExport && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Complete your OKRs in the conversation to enable export functionality.
              </p>
            </div>
          )}

          {canExport && !isHighQuality && (
            <div className="p-4 border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Quality Score: {qualityScores.overall}/100</strong> - Consider refining your OKRs for better quality before exporting.
              </p>
            </div>
          )}

          {canExport && isHighQuality && (
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                ✅ High Quality ({qualityScores.overall}/100)
              </Badge>
              <span className="text-sm text-muted-foreground">
                Your OKRs are ready for export!
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Format Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Export Format</h3>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(formatIcons).map(([format, IconComponent]) => (
                  <Card
                    key={format}
                    className={`cursor-pointer transition-colors ${
                      selectedFormat === format
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleFormatChange(format as ExportFormat)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4" />
                        <span className="font-medium capitalize">{format}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDescriptions[format as ExportFormat]}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <ExportFormatSelector
                options={exportOptions}
                onChange={setExportOptions}
              />
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Preview</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              {showPreview && (
                <div className="border rounded-lg max-h-96 overflow-auto">
                  <ExportPreview
                    format={selectedFormat}
                    options={exportOptions}
                    objective={objective}
                    keyResults={keyResults}
                    qualityScores={qualityScores}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {canExport && (
                <>
                  Exporting {keyResults.length} key result{keyResults.length === 1 ? '' : 's'}
                  {exportOptions.includeScores && ' with quality scores'}
                </>
              )}
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <Button
                variant="outline"
                onClick={handleShare}
                disabled={!canExport}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>

              <Button
                onClick={handleExport}
                disabled={!canExport || isExporting}
              >
                <Download className="w-4 h-4 mr-1" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}