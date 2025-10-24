/**
 * AI Response Analyzer for Dynamic Test Responses
 * Analyzes AI questions and classifies them to generate appropriate responses
 */

export interface AIAnalysis {
  questions: string[];
  questionTypes: QuestionType[];
  phase: ConversationPhase;
  needsMetrics: boolean;
  needsClarification: boolean;
  needsOutcome: boolean;
  needsKeyResults: boolean;
  sentiment: 'positive' | 'neutral' | 'requesting';
}

export type QuestionType =
  | 'metric_request'        // "What's your current CSAT score?"
  | 'clarification'         // "What do you mean by satisfaction?"
  | 'outcome_focus'         // "What business result are you trying to achieve?"
  | 'problem_understanding' // "What's the main challenge?"
  | 'kr_request'            // "What specific metrics do you want to improve?"
  | 'refinement'            // "Can we make this more specific?"
  | 'validation'            // "Does this look good?"
  | 'unknown';

export type ConversationPhase =
  | 'discovery'
  | 'refinement'
  | 'kr_discovery'
  | 'validation'
  | 'completed'
  | 'unknown';

/**
 * Analyzes AI response to understand what it's asking for
 */
export function analyzeAIResponse(aiContent: string): AIAnalysis {
  const lowerContent = aiContent.toLowerCase();

  // Extract questions (look for ? characters)
  const questions = extractQuestions(aiContent);

  // Classify each question
  const questionTypes = questions.map(q => classifyQuestion(q));

  // Detect conversation phase from markers
  const phase = detectPhase(aiContent);

  // Check what information is being requested
  const needsMetrics = hasMetricRequest(lowerContent, questions);
  const needsClarification = hasClarificationRequest(lowerContent, questions);
  const needsOutcome = hasOutcomeRequest(lowerContent, questions);
  const needsKeyResults = hasKRRequest(lowerContent, questions);

  // Detect sentiment
  const sentiment = detectSentiment(lowerContent);

  return {
    questions,
    questionTypes,
    phase,
    needsMetrics,
    needsClarification,
    needsOutcome,
    needsKeyResults,
    sentiment
  };
}

/**
 * Extract questions from AI response
 */
function extractQuestions(content: string): string[] {
  const questions: string[] = [];

  // Split by question mark
  const sentences = content.split(/[.!?]+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed && (content.includes(trimmed + '?') || isQuestion(trimmed))) {
      questions.push(trimmed);
    }
  }

  return questions;
}

/**
 * Check if a sentence is a question (even without ?)
 */
function isQuestion(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase();
  const questionStarters = [
    'what', 'why', 'how', 'when', 'where', 'who', 'which',
    'can you', 'could you', 'would you', 'do you', 'are you',
    'is there', 'have you', 'did you'
  ];

  return questionStarters.some(starter => lowerSentence.startsWith(starter));
}

/**
 * Classify a question by type
 */
function classifyQuestion(question: string): QuestionType {
  const lower = question.toLowerCase();

  // Metric requests
  if (lower.includes('baseline') ||
      lower.includes('current') && (lower.includes('score') || lower.includes('rate') || lower.includes('metric')) ||
      lower.includes('how many') ||
      lower.includes('what percent') ||
      lower.includes('starting point') ||
      lower.includes('where are you now')) {
    return 'metric_request';
  }

  // Outcome focus
  if (lower.includes('business result') ||
      lower.includes('business outcome') ||
      lower.includes('trying to achieve') ||
      lower.includes('end goal') ||
      lower.includes('impact') && (lower.includes('business') || lower.includes('organization')) ||
      lower.includes('why does this matter')) {
    return 'outcome_focus';
  }

  // Key results request
  if (lower.includes('key result') ||
      lower.includes('measure') && (lower.includes('success') || lower.includes('progress')) ||
      lower.includes('metric') && lower.includes('track') ||
      lower.includes('how will you know')) {
    return 'kr_request';
  }

  // Clarification
  if (lower.includes('what do you mean') ||
      lower.includes('can you explain') ||
      lower.includes('tell me more about') ||
      lower.includes('what exactly') ||
      lower.includes('be more specific')) {
    return 'clarification';
  }

  // Problem understanding
  if (lower.includes('challenge') ||
      lower.includes('problem') ||
      lower.includes('issue') ||
      lower.includes('pain point') ||
      lower.includes('what\'s wrong') ||
      lower.includes('why') && lower.includes('important')) {
    return 'problem_understanding';
  }

  // Refinement
  if (lower.includes('more specific') ||
      lower.includes('refine') ||
      lower.includes('improve') && lower.includes('wording') ||
      lower.includes('better way to phrase')) {
    return 'refinement';
  }

  // Validation
  if (lower.includes('does this look') ||
      lower.includes('sound good') ||
      lower.includes('work for you') ||
      lower.includes('ready to') ||
      lower.includes('approve')) {
    return 'validation';
  }

  return 'unknown';
}

/**
 * Detect conversation phase from content markers
 */
function detectPhase(content: string): ConversationPhase {
  const lower = content.toLowerCase();

  // Look for phase markers
  if (lower.includes('validation') || lower.includes('quality score') || lower.includes('ready to export')) {
    return 'validation';
  }

  if (lower.includes('key result') || lower.includes('how will you measure')) {
    return 'kr_discovery';
  }

  if (lower.includes('refine') || lower.includes('improve the objective') || lower.includes('more specific')) {
    return 'refinement';
  }

  if (lower.includes('observation') || lower.includes('starting point') || lower.includes('tell me about')) {
    return 'discovery';
  }

  if (lower.includes('congratulations') || lower.includes('you\'ve created')) {
    return 'completed';
  }

  return 'unknown';
}

/**
 * Check if AI is requesting metrics
 */
function hasMetricRequest(lowerContent: string, questions: string[]): boolean {
  return questions.some(q => classifyQuestion(q) === 'metric_request') ||
         lowerContent.includes('baseline') ||
         lowerContent.includes('starting point') ||
         lowerContent.includes('current') && lowerContent.includes('score');
}

/**
 * Check if AI is requesting clarification
 */
function hasClarificationRequest(lowerContent: string, questions: string[]): boolean {
  return questions.some(q => classifyQuestion(q) === 'clarification') ||
         lowerContent.includes('what do you mean') ||
         lowerContent.includes('tell me more');
}

/**
 * Check if AI is asking about business outcome
 */
function hasOutcomeRequest(lowerContent: string, questions: string[]): boolean {
  return questions.some(q => classifyQuestion(q) === 'outcome_focus') ||
         lowerContent.includes('business result') ||
         lowerContent.includes('trying to achieve');
}

/**
 * Check if AI is requesting key results
 */
function hasKRRequest(lowerContent: string, questions: string[]): boolean {
  return questions.some(q => classifyQuestion(q) === 'kr_request') ||
         lowerContent.includes('key result') ||
         lowerContent.includes('measure success');
}

/**
 * Detect sentiment of AI response
 */
function detectSentiment(lowerContent: string): 'positive' | 'neutral' | 'requesting' {
  if (lowerContent.includes('great') ||
      lowerContent.includes('excellent') ||
      lowerContent.includes('perfect') ||
      lowerContent.includes('good job')) {
    return 'positive';
  }

  if (lowerContent.includes('?') ||
      lowerContent.includes('let me ask') ||
      lowerContent.includes('can you') ||
      lowerContent.includes('tell me')) {
    return 'requesting';
  }

  return 'neutral';
}
