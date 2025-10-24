import { useState, KeyboardEvent } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { useConversationStore } from '../../store/conversationStore'
import { useAnnouncer } from '../../hooks/useAnnouncer'
import { Send } from 'lucide-react'
import { estimateTokenCount, formatTokenCount, TOKEN_LIMITS } from '../../utils/tokenCounter'

export function MessageInput() {
  const [message, setMessage] = useState('')
  const { sendMessage, isTyping, isConnected } = useConversationStore()
  const { announce } = useAnnouncer()

  const handleSubmit = async () => {
    if (!message.trim() || isTyping) return

    const content = message.trim()
    setMessage('')
    announce('Message sent', 'polite')

    // CRITICAL: Set typing indicator BEFORE sending message to disable input immediately
    // This prevents users from sending multiple messages rapidly
    useConversationStore.setState({ isTyping: true })

    await sendMessage(content)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const tokenResult = estimateTokenCount(message)
  const maxTokens = TOKEN_LIMITS.MESSAGE_INPUT
  const tokenDisplay = formatTokenCount(tokenResult, maxTokens)
  const isOverLimit = tokenDisplay.isOverLimit

  return (
    <div className="border-t p-3 md:p-4 flex-shrink-0" role="region" aria-label="Message input">
      <div className="space-y-2">
        <div className="flex space-x-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "Describe your goals or what you'd like to achieve..."
                : "Connecting to server..."
            }
            disabled={isTyping || !isConnected}
            className="flex-1 resize-none max-h-32 min-h-[2.5rem] md:min-h-[3rem] touch-manipulation"
            rows={2}
            aria-label="Type your message"
            aria-describedby="message-status token-count"
          />
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isTyping || !isConnected || isOverLimit}
            className="px-3 md:px-4 h-auto min-h-[2.5rem] md:min-h-[3rem] touch-manipulation"
            aria-label="Send message"
            type="submit"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Send</span>
          </Button>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center space-x-2" id="message-status" aria-live="polite">
            {!isConnected && (
              <span className="text-destructive" role="status">Disconnected</span>
            )}
            {isTyping && (
              <span role="status">AI is responding...</span>
            )}
          </div>

          <div className={`${isOverLimit ? 'text-destructive' : ''}`} id="token-count" aria-live="polite">
            <span className="sr-only">Token count: </span>
            {tokenDisplay.display}
            {isOverLimit && <span className="sr-only"> - Over limit</span>}
          </div>
        </div>

        <div className="text-xs text-muted-foreground" role="note">
          Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded" aria-label="Enter key">Enter</kbd> to send, <kbd className="px-1 py-0.5 text-xs bg-muted rounded" aria-label="Shift plus Enter keys">Shift + Enter</kbd> for new line
        </div>
      </div>
    </div>
  )
}