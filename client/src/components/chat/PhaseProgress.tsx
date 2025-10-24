import type { ConversationPhase } from '../../types'

interface PhaseProgressProps {
  currentPhase: ConversationPhase
  compact?: boolean
}

const phases: Array<{ key: ConversationPhase; label: string; icon: string; description: string }> = [
  {
    key: 'discovery',
    label: 'Discovery',
    icon: '🔍',
    description: 'Understanding business outcomes'
  },
  {
    key: 'refinement',
    label: 'Refinement',
    icon: '✨',
    description: 'Improving objective quality'
  },
  {
    key: 'kr_discovery',
    label: 'Key Results',
    icon: '🎯',
    description: 'Creating measurable key results'
  },
  {
    key: 'validation',
    label: 'Validation',
    icon: '✅',
    description: 'Final quality assessment'
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: '🎉',
    description: 'OKR is finalized'
  },
]

export function PhaseProgress({ currentPhase, compact = false }: PhaseProgressProps) {
  const currentIndex = phases.findIndex(p => p.key === currentPhase)

  if (compact) {
    const current = phases[currentIndex]
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
        <span>{current.icon}</span>
        <span className="text-xs font-medium">{current.label}</span>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1}/{phases.length}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Phase Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Conversation Progress</h3>
        <span className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {phases.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / phases.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Phase Steps */}
      <div className="space-y-2">
        {phases.map((phase, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          const isFuture = index > currentIndex

          return (
            <div
              key={phase.key}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 border border-primary/20'
                  : isCompleted
                  ? 'bg-muted/50'
                  : 'opacity-50'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-muted'
                }`}
              >
                {isCompleted ? '✓' : phase.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                    {phase.label}
                  </h4>
                  {isActive && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {phase.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
