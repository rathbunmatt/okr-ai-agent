import { useEffect } from 'react'
import { Layout } from './components/layout/Layout'
import { ChatInterface } from './components/chat/ChatInterface'
import { OKRDisplay } from './components/okr/OKRDisplay'
import { KnowledgeSuggestions } from './components/knowledge/KnowledgeSuggestions'
import { useConversationStore } from './store/conversationStore'

function App() {
  const { connectWebSocket, updateUI, knowledgeSuggestions } = useConversationStore()

  useEffect(() => {
    // Initialize WebSocket connection
    const initializeConnection = async () => {
      try {
        updateUI({ isLoading: true, error: null })
        await connectWebSocket()
      } catch (error) {
        console.error('Failed to initialize WebSocket connection:', error)
        updateUI({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        })
      }
    }

    initializeConnection()
  }, [connectWebSocket, updateUI])

  return (
    <Layout>
      <div className="h-full flex flex-col xl:grid xl:grid-cols-4 gap-4 md:gap-6 overflow-hidden">
        {/* Chat Interface - Takes 2/4 on desktop, full width on mobile/tablet */}
        <section className="xl:col-span-2 order-1 flex-1 xl:flex-none overflow-hidden" aria-label="Conversation interface">
          <ChatInterface />
        </section>

        {/* OKR Display - Takes 1/4 on desktop, full width on mobile/tablet */}
        <aside className="order-2 xl:order-2 flex-shrink-0 overflow-y-auto" aria-label="OKR development progress">
          <div className="h-full">
            <OKRDisplay />
          </div>
        </aside>

        {/* Knowledge Suggestions - Takes 1/4 on desktop, full width on mobile/tablet */}
        <aside className="order-3 xl:order-3 flex-shrink-0 overflow-y-auto" aria-label="Knowledge suggestions">
          <div className="h-full">
            <KnowledgeSuggestions
              suggestions={knowledgeSuggestions}
              showFeedback={true}
            />
          </div>
        </aside>
      </div>
    </Layout>
  )
}

export default App