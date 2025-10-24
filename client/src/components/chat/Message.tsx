import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatDate } from '../../lib/utils'
import type { Message as MessageType } from '../../types'
import { QualityScoreIndicator } from './QualityScoreIndicator'

interface MessageProps {
  message: MessageType
}

// Helper function to safely convert timestamp to ISO string
function getTimestampISO(timestamp: Date | string): string {
  if (timestamp instanceof Date) {
    return timestamp.toISOString()
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString()
  }
  return new Date().toISOString()
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 md:mb-4`}
      role="article"
      aria-label={`Message from ${isUser ? 'user' : 'AI assistant'}`}
    >
      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center mb-1">
            <div
              className="w-5 h-5 md:w-6 md:h-6 bg-primary rounded-full flex items-center justify-center mr-2"
              aria-label="AI Assistant"
              role="img"
            >
              <span className="text-[10px] md:text-xs font-medium text-primary-foreground" aria-hidden="true">AI</span>
            </div>
            <time className="text-[10px] md:text-xs text-muted-foreground" dateTime={getTimestampISO(message.timestamp)}>
              {formatDate(message.timestamp)}
            </time>
          </div>
        )}

        <div
          className={`rounded-lg px-3 md:px-4 py-2 touch-manipulation ${
            isUser
              ? 'bg-primary text-primary-foreground ml-2 md:ml-4'
              : 'bg-muted text-muted-foreground mr-2 md:mr-4'
          }`}
        >
          <div className="text-sm md:text-base prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none">
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style headers
                  h2: ({node, ...props}) => <h2 className="text-base md:text-lg font-semibold mt-3 mb-2 first:mt-0" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm md:text-base font-semibold mt-2 mb-1" {...props} />,
                  // Style paragraphs
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                  // Style lists
                  ul: ({node, ...props}) => <ul className="space-y-1 mb-2 pl-4" {...props} />,
                  ol: ({node, ...props}) => <ol className="space-y-1 mb-2 pl-4" {...props} />,
                  li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                  // Style blockquotes
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-primary/30 pl-3 py-1 my-2 italic bg-background/50 rounded-r" {...props} />
                  ),
                  // Style tables
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full divide-y divide-border text-xs md:text-sm" {...props} />
                    </div>
                  ),
                  thead: ({node, ...props}) => <thead className="bg-muted/50" {...props} />,
                  th: ({node, ...props}) => <th className="px-2 md:px-3 py-1 text-left font-semibold" {...props} />,
                  td: ({node, ...props}) => <td className="px-2 md:px-3 py-1 border-t border-border" {...props} />,
                  // Style code
                  code: ({node, inline, ...props}) =>
                    inline ? (
                      <code className="bg-background/80 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                    ) : (
                      <code className="block bg-background/80 p-2 rounded text-xs font-mono overflow-x-auto" {...props} />
                    ),
                  // Style strong/bold
                  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                  // Style em/italic
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {isUser && (
            <time className="text-[10px] md:text-xs mt-1 opacity-70" dateTime={getTimestampISO(message.timestamp)}>
              {formatDate(message.timestamp)}
            </time>
          )}

          {message.metadata?.qualityScores && (
            <div className="mt-3 pt-3 border-t border-current/10">
              <QualityScoreIndicator scores={message.metadata.qualityScores} />
            </div>
          )}

          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <div className="text-[10px] md:text-xs font-medium mb-1">Suggestions:</div>
              <ul className="text-[10px] md:text-xs space-y-1">
                {message.metadata.suggestions.map((suggestion, index) => (
                  <li key={index} className="opacity-80">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}