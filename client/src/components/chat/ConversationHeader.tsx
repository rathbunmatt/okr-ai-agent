import { Button } from '../ui/button'
import { useConversationStore } from '../../store/conversationStore'
import { RotateCcw, Wifi, WifiOff } from 'lucide-react'

const phaseLabels: Record<string, string> = {
  discovery: '🔍 Discovery',
  refinement: '✨ Refinement',
  kr_discovery: '🎯 Key Results',
  validation: '✅ Validation',
  completed: '🎉 Completed'
}

export function ConversationHeader() {
  const { phase, isConnected, resetSession, messages } = useConversationStore()

  const handleReset = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm('Are you sure you want to start over? This will clear your current conversation and OKRs.')
      if (confirmed) {
        resetSession()
      }
    } else {
      resetSession()
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-semibold">OKR Creation Assistant</h2>
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-500" aria-label="Connected" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" aria-label="Disconnected" />
        )}
        <span className="text-xs text-muted-foreground hidden md:inline" role="status" aria-label="Current phase">
          {phaseLabels[phase]}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleReset}
        className="text-xs"
        aria-label="Reset conversation and start over"
      >
        <RotateCcw className="w-3 h-3 mr-1" aria-hidden="true" />
        Reset
      </Button>
    </div>
  )
}