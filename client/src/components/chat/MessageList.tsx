import { useEffect, useRef } from 'react'
import { useConversationStore } from '../../store/conversationStore'
import { Message } from './Message'
import { ThinkingIndicator } from './ThinkingIndicator'

export function MessageList() {
  const { messages, isTyping } = useConversationStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  return (
    <div
      className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-4" role="region" aria-label="Welcome message">
            <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-2">
              Let's create your OKRs
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              I'll help you craft outcome-focused objectives and measurable key results.
              <br className="hidden md:block" />
              <span className="block md:inline">Start by telling me about your goals or what you'd like to achieve.</span>
            </p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {isTyping && <ThinkingIndicator />}

      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  )
}