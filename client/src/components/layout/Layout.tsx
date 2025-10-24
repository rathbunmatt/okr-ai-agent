import { useConversationStore } from '../../store/conversationStore'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { ui } = useConversationStore()

  return (
    <div className={`h-screen overflow-hidden bg-background text-foreground ${ui.theme === 'dark' ? 'dark' : ''}`}>
      <div className="container mx-auto h-full flex flex-col py-4 md:py-6 px-4 md:px-6 lg:px-8">
        <header className="mb-4 md:mb-6 flex-shrink-0" role="banner">
          <h1 className="text-2xl md:text-3xl font-bold text-center">OKR AI Agent</h1>
          <p className="text-center text-muted-foreground mt-2 text-sm md:text-base" role="doc-subtitle">
            Your conversational partner for creating high-quality, outcome-focused OKRs
          </p>
        </header>

        <main className="max-w-7xl mx-auto flex-1 overflow-hidden" role="main" aria-label="OKR creation interface">
          {children}
        </main>
      </div>
    </div>
  )
}