import { Card, CardContent, CardHeader } from '../ui/card'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ConversationHeader } from './ConversationHeader'

export function ChatInterface() {
  return (
    <Card className="h-full flex flex-col" role="region" aria-label="Chat conversation">
      <CardHeader className="pb-3 px-4 md:px-6 flex-shrink-0">
        <ConversationHeader />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <MessageList />
        <MessageInput />
      </CardContent>
    </Card>
  )
}