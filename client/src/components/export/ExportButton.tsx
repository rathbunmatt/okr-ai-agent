import { useState } from 'react'
import { Button } from '../ui/button'
import { ExportModal } from './ExportModal'
import { Download } from 'lucide-react'
import { useConversationStore } from '../../store/conversationStore'

interface ExportButtonProps {
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
}

export function ExportButton({ variant = 'default', size = 'default' }: ExportButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { objective, keyResults, qualityScores } = useConversationStore()

  const canExport = objective && keyResults.length > 0
  const isHighQuality = qualityScores.overall >= 75

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setModalOpen(true)}
        disabled={!canExport}
        className={!canExport ? 'opacity-50 cursor-not-allowed' : ''}
        aria-label={
          !canExport
            ? 'Export not available - complete your objective and key results first'
            : isHighQuality
            ? 'Export OKRs - High quality ready'
            : 'Export OKRs'
        }
        aria-describedby={!canExport ? 'export-requirements' : undefined}
      >
        <Download className="w-4 h-4 mr-1" aria-hidden="true" />
        Export
        {isHighQuality && canExport && (
          <span className="ml-1 text-xs" aria-label="High quality indicator">✅</span>
        )}
      </Button>

      {!canExport && (
        <span id="export-requirements" className="sr-only">
          To enable export, you need to complete your objective and at least one key result.
        </span>
      )}

      <ExportModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}