/**
 * Confirmation Detection Utility
 *
 * Detects when users are confirming/agreeing vs providing new information.
 * Helps prevent unnecessary backtracking and re-asking of questions.
 */

export type ConfirmationType = 'strong' | 'weak' | null;

/**
 * Patterns that indicate user confirmation/agreement
 */
const CONFIRMATION_PATTERNS = [
  // Strong confirmations
  /^yes\b/i,
  /^correct\b/i,
  /^right\b/i,
  /^exactly\b/i,
  /^perfect\b/i,
  /^absolutely\b/i,
  /^definitely\b/i,
  /^agreed\b/i,
  /^confirmed\b/i,

  // Common phrases
  /that'?s?\s+(right|correct|perfect|good|great|fine|okay)\b/i,
  /looks?\s+(good|perfect|great|fine|right|correct)\b/i,
  /sounds?\s+(good|perfect|great|fine|right)\b/i,

  // Agreement phrases
  /let'?s?\s+(proceed|continue|move\s+(on|forward|ahead)|go\s+ahead)\b/i,
  /go\s+ahead\b/i,
  /please\s+(proceed|continue)\b/i,
  /ready\s+to\s+(proceed|continue|move\s+on)\b/i,

  // Emoji confirmations
  /👍/,
  /✓/,
  /✅/,

  // Affirmative with action
  /yes,?\s*(let'?s|we can|please|go ahead)/i,
  /correct,?\s*(let'?s|please|proceed)/i,
];

/**
 * Patterns that indicate strong, unambiguous confirmation
 */
const STRONG_CONFIRMATION_PATTERNS = [
  /^yes\b/i,
  /^correct\b/i,
  /^exactly\b/i,
  /^perfect\b/i,
  /^absolutely\b/i,
  /^definitely\b/i,
  /^confirmed\b/i,
  /^agreed\b/i,
  /that'?s?\s+exactly\s+right\b/i,
  /yes,?\s+that'?s?\s+(right|correct|perfect)\b/i,
];

/**
 * Patterns that suggest the user is providing new information
 * These should NOT be treated as confirmations
 */
const NEW_INFORMATION_PATTERNS = [
  // Questions
  /\?$/,
  /^(what|where|when|who|why|how|which|can|could|would|should)\b/i,

  // Corrections
  /^(no|not|never|actually|instead|rather)\b/i,
  /\b(but|however|although|except)\b/i,

  // New details
  /\b(also|additionally|furthermore|moreover|plus|and)\b/i,

  // Complex responses (likely new information)
  /\b(because|since|due to|reason|specifically)\b/i,
];

/**
 * Check if a message is a confirmation
 *
 * @param message - User's message content
 * @returns true if message is a confirmation
 */
export function isConfirmation(message: string): boolean {
  const trimmed = message.trim();

  // Empty messages are not confirmations
  if (!trimmed) {
    return false;
  }

  // Short messages (1-10 words) are more likely to be confirmations
  const wordCount = trimmed.split(/\s+/).length;
  const isShort = wordCount <= 10;

  // Check if message contains new information patterns
  const hasNewInfo = NEW_INFORMATION_PATTERNS.some(pattern =>
    pattern.test(trimmed)
  );

  // If it has clear new information indicators, it's not just a confirmation
  if (hasNewInfo && wordCount > 15) {
    return false;
  }

  // Check for confirmation patterns
  const matchesPattern = CONFIRMATION_PATTERNS.some(pattern =>
    pattern.test(trimmed)
  );

  // Short messages with confirmation patterns are confirmations
  // Longer messages need stronger confirmation patterns
  if (isShort && matchesPattern) {
    return true;
  }

  // For longer messages, require stronger evidence
  if (wordCount > 10) {
    return STRONG_CONFIRMATION_PATTERNS.some(pattern =>
      pattern.test(trimmed)
    );
  }

  return matchesPattern;
}

/**
 * Determine the type of confirmation
 *
 * @param message - User's message content
 * @returns 'strong' for unambiguous confirmations, 'weak' for possible confirmations, null for non-confirmations
 */
export function extractConfirmationType(message: string): ConfirmationType {
  const trimmed = message.trim();

  if (!trimmed) {
    return null;
  }

  // Check for strong confirmation first
  if (STRONG_CONFIRMATION_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return 'strong';
  }

  // Check for weaker confirmation patterns
  if (isConfirmation(trimmed)) {
    return 'weak';
  }

  return null;
}

/**
 * Get a confidence score (0-1) for how likely this is a confirmation
 *
 * @param message - User's message content
 * @returns Confidence score from 0 (definitely not) to 1 (definitely yes)
 */
export function getConfirmationConfidence(message: string): number {
  const trimmed = message.trim();

  if (!trimmed) {
    return 0;
  }

  let score = 0;
  const wordCount = trimmed.split(/\s+/).length;

  // Strong confirmation patterns
  const strongMatches = STRONG_CONFIRMATION_PATTERNS.filter(pattern =>
    pattern.test(trimmed)
  ).length;
  score += strongMatches * 0.4;

  // Any confirmation patterns
  const weakMatches = CONFIRMATION_PATTERNS.filter(pattern =>
    pattern.test(trimmed)
  ).length;
  score += weakMatches * 0.2;

  // Shorter messages are more likely to be confirmations
  if (wordCount <= 3) {
    score += 0.2;
  } else if (wordCount <= 10) {
    score += 0.1;
  }

  // Penalize for new information patterns
  const newInfoMatches = NEW_INFORMATION_PATTERNS.filter(pattern =>
    pattern.test(trimmed)
  ).length;
  score -= newInfoMatches * 0.3;

  // Penalize for long messages
  if (wordCount > 20) {
    score -= 0.2;
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, score));
}

/**
 * Check if a message is asking for clarification or expressing confusion
 * These should be distinguished from confirmations
 *
 * @param message - User's message content
 * @returns true if message expresses confusion or asks for clarification
 */
export function isConfusionOrQuestion(message: string): boolean {
  const trimmed = message.trim();

  const confusionPatterns = [
    /\?$/,
    /^(what|where|when|who|why|how|which)\b/i,
    /\b(confused|unclear|don'?t understand|not sure|clarify|explain)\b/i,
    /^(can you|could you|would you|please)\b/i,
    /\b(mean by|referring to|talking about)\b/i,
  ];

  return confusionPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Analyze a user message to provide detailed confirmation metadata
 *
 * @param message - User's message content
 * @returns Detailed analysis of the message
 */
export function analyzeMessage(message: string): {
  isConfirmation: boolean;
  confirmationType: ConfirmationType;
  confidence: number;
  isQuestion: boolean;
  wordCount: number;
  analysis: string;
} {
  const trimmed = message.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const isConf = isConfirmation(trimmed);
  const confType = extractConfirmationType(trimmed);
  const confidence = getConfirmationConfidence(trimmed);
  const isQ = isConfusionOrQuestion(trimmed);

  let analysis = '';
  if (isConf) {
    analysis = confType === 'strong'
      ? 'Strong confirmation - user is clearly agreeing'
      : 'Weak confirmation - user is likely agreeing but may include additional info';
  } else if (isQ) {
    analysis = 'Question or confusion - user needs clarification';
  } else {
    analysis = 'New information - user is providing substantive content';
  }

  return {
    isConfirmation: isConf,
    confirmationType: confType,
    confidence,
    isQuestion: isQ,
    wordCount,
    analysis,
  };
}
