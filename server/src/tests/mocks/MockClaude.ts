// Mock Claude service for testing
export class MockClaudeService {
  async sendMessageWithPrompt(engineeredPrompt: any, userMessage: string): Promise<any> {
    // Generate contextual response based on user message content
    const response = this.generateContextualResponse(userMessage);

    return {
      content: response,
      response: response, // Keep for backwards compatibility
      conversationId: 'mock-conversation-id',
      messageId: 'mock-message-id',
      tokens: 100,
      model: 'mock-model',
      questionState: null
    };
  }

  async sendMessage(message: string, context?: any): Promise<any> {
    const response = this.generateContextualResponse(message);

    return {
      content: response,
      response: response, // Keep for backwards compatibility
      conversationId: 'mock-conversation-id',
      messageId: 'mock-message-id',
      tokens: 100,
      model: 'mock-model'
    };
  }

  private generateContextualResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // Breakthrough moments
    if (lowerMessage.includes('oh!') || lowerMessage.includes('aha!') || lowerMessage.includes('i get it')) {
      return "That's a great breakthrough! You've made an important insight about focusing on outcomes.";
    }

    // Scope drift detection
    if (lowerMessage.includes('market leader') || lowerMessage.includes('revolutionize')) {
      return "That's very ambitious thinking! Let's make sure we're scoping this appropriately for your team level.";
    }

    // Backtracking
    if (lowerMessage.includes('rethinking') || lowerMessage.includes('real issue')) {
      return "Good thinking to reconsider! That kind of insight shows deep understanding of the problem.";
    }

    // Confusion/threat state
    if (lowerMessage.includes('confused') || lowerMessage.includes('overwhelmed')) {
      return "Let's take this step by step together. We'll start with the basics.";
    }

    // Progress/reward state
    if (lowerMessage.includes('great!') || lowerMessage.includes('excited')) {
      return "Excellent progress! You're really getting the hang of this.";
    }

    // Numbers/measurability
    if (/\d+/.test(userMessage) && (lowerMessage.includes('increase') || lowerMessage.includes('reduce'))) {
      return "Excellent! Those specific numbers make your objective measurable and clear.";
    }

    // Default response
    return `I understand you're working on: ${userMessage}. Let's refine this together.`;
  }
}
