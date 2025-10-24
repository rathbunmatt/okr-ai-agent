/**
 * Token counting utility for message limits
 * Uses approximation: 1 token ≈ 4 characters for English text
 * Based on Claude tokenizer characteristics
 */

export interface TokenCountResult {
  tokens: number;
  characters: number;
  estimatedTokens: number;
}

/**
 * Estimates token count based on character count
 * This is an approximation - actual tokenization would require the Claude tokenizer
 *
 * @param text The text to count tokens for
 * @returns Token count estimation and character count
 */
export function estimateTokenCount(text: string): TokenCountResult {
  const characters = text.length;

  // More accurate estimation considering:
  // - Average English word: ~4.7 characters
  // - Average tokens per word: ~0.75 (some words are multiple tokens)
  // - Punctuation and spaces: reduce token count
  // - Code/technical terms: increase token count

  let estimatedTokens: number;

  if (characters === 0) {
    estimatedTokens = 0;
  } else {
    // Base estimation: 4 characters per token
    const baseTokens = characters / 4;

    // Adjust for text characteristics
    const words = text.trim().split(/\s+/).length;
    const hasCode = /[{}();=<>]/.test(text);
    const hasTechnicalTerms = /\b(?:API|HTTP|JSON|SQL|URL|UUID|API|OKR)\b/i.test(text);

    // Adjustments
    let adjustment = 1.0;

    // Code tends to use more tokens per character
    if (hasCode) {
      adjustment += 0.1;
    }

    // Technical terms often split into multiple tokens
    if (hasTechnicalTerms) {
      adjustment += 0.05;
    }

    // Very short messages tend to have higher token density
    if (characters < 50) {
      adjustment += 0.1;
    }

    estimatedTokens = Math.ceil(baseTokens * adjustment);
  }

  return {
    tokens: estimatedTokens, // Our best estimate
    characters,
    estimatedTokens // Explicit that this is estimated
  };
}

/**
 * Formats token count for display
 */
export function formatTokenCount(result: TokenCountResult, maxTokens: number): {
  display: string;
  isOverLimit: boolean;
  percentage: number;
} {
  const percentage = Math.round((result.tokens / maxTokens) * 100);
  const isOverLimit = result.tokens > maxTokens;

  return {
    display: `${result.tokens.toLocaleString()}/${maxTokens.toLocaleString()} tokens`,
    isOverLimit,
    percentage
  };
}

/**
 * Constants for token limits
 */
export const TOKEN_LIMITS = {
  MESSAGE_INPUT: 25000, // As requested by user
  CLAUDE_CONTEXT: 200000, // Claude's context window
  SAFETY_MARGIN: 5000 // Reserve some tokens for system messages
} as const;