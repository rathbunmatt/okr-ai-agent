
export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4" role="status" aria-label="AI is typing">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center" role="img" aria-label="AI Assistant">
          <span className="text-xs font-medium text-primary-foreground" aria-hidden="true">AI</span>
        </div>
        <div className="bg-muted rounded-lg px-4 py-2">
          <div className="flex space-x-1">
            <div className="flex space-x-1" aria-hidden="true">
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
          <span className="sr-only">AI is typing a response...</span>
        </div>
      </div>
    </div>
  )
}