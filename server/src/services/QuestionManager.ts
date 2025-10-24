/**
 * QuestionManager - Manages question flow to ensure one question at a time for natural conversation
 */

export interface QuestionState {
  pendingQuestions: string[];
  askedQuestions: string[];
  currentQuestion: string | null;
  answeredQuestions: Record<string, string>;
  questionContext: string; // The context that generated these questions
}

export interface QuestionExtraction {
  questions: string[];
  hasMultipleQuestions: boolean;
  cleanedContent: string; // Content with questions removed
}

export class QuestionManager {
  /**
   * Initialize empty question state
   */
  static createEmptyState(): QuestionState {
    return {
      pendingQuestions: [],
      askedQuestions: [],
      currentQuestion: null,
      answeredQuestions: {},
      questionContext: ''
    };
  }

  /**
   * Extract questions from AI response content
   */
  static extractQuestionsFromResponse(content: string): QuestionExtraction {
    // Pattern to match questions - look for sentences ending with ?
    const questionPatterns = [
      /([^.!?]*\?)/g, // Basic question pattern
      /(\d+\.\s*[^?]*\?)/g, // Numbered questions like "1. What is...?"
      /(-\s*[^?]*\?)/g, // Bulleted questions like "- What is...?"
    ];

    const foundQuestions = new Set<string>();
    let cleanedContent = content;

    // Extract questions using all patterns
    questionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const question = this.cleanQuestion(match);
          if (question && this.isValidQuestion(question)) {
            foundQuestions.add(question);
            // Remove the question from content to get cleaned version
            cleanedContent = cleanedContent.replace(match, '').trim();
          }
        });
      }
    });

    const questions = Array.from(foundQuestions);

    // Clean up the remaining content
    cleanedContent = this.cleanRemainingContent(cleanedContent);

    return {
      questions,
      hasMultipleQuestions: questions.length > 1,
      cleanedContent
    };
  }

  /**
   * Compute a normalized signature for a question to detect duplicates
   */
  private static normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[?!.,;:]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if a question is a duplicate of any previously asked
   */
  private static isDuplicateQuestion(question: string, askedQuestions: string[]): boolean {
    const normalized = this.normalizeQuestion(question);

    return askedQuestions.some(asked => {
      const askedNormalized = this.normalizeQuestion(asked);

      // Exact match
      if (normalized === askedNormalized) {
        return true;
      }

      // High similarity (>80% of words match)
      const words1 = new Set(normalized.split(' '));
      const words2 = new Set(askedNormalized.split(' '));
      const intersection = new Set([...words1].filter(w => words2.has(w)));
      const similarity = (intersection.size * 2) / (words1.size + words2.size);

      return similarity > 0.8;
    });
  }

  /**
   * Process a new AI response and update question state
   */
  static processAIResponse(content: string, currentState: QuestionState): {
    updatedState: QuestionState;
    responseToUser: string;
    hasQueuedQuestions: boolean;
  } {
    console.log('🔥 QuestionManager.processAIResponse called:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200) + '...',
      currentPendingQuestions: currentState.pendingQuestions.length
    });

    const extraction = this.extractQuestionsFromResponse(content);

    console.log('🔥 Question extraction result:', {
      questionsFound: extraction.questions.length,
      hasMultipleQuestions: extraction.hasMultipleQuestions,
      questions: extraction.questions,
      cleanedContentLength: extraction.cleanedContent.length
    });

    if (!extraction.hasMultipleQuestions && extraction.questions.length <= 1) {
      // Single question or no questions - return as is
      console.log('🔥 Returning content as-is (single question or no questions)');
      return {
        updatedState: currentState,
        responseToUser: content,
        hasQueuedQuestions: currentState.pendingQuestions.length > 0
      };
    }

    // Check if first question is a duplicate
    const [firstQuestion, ...remainingQuestions] = extraction.questions;

    if (this.isDuplicateQuestion(firstQuestion, currentState.askedQuestions)) {
      console.log(`⚠️ First question is a duplicate, providing guidance instead`);

      // Try to use a pending question if available
      if (currentState.pendingQuestions.length > 0) {
        const [nextQuestion, ...restPending] = currentState.pendingQuestions;
        return {
          updatedState: {
            ...currentState,
            pendingQuestions: restPending,
            currentQuestion: nextQuestion,
            askedQuestions: [...currentState.askedQuestions, nextQuestion]
          },
          responseToUser: extraction.cleanedContent + '\n\n' + nextQuestion,
          hasQueuedQuestions: restPending.length > 0
        };
      }

      // No pending questions - provide guidance instead of repeating
      const guidanceResponse = extraction.cleanedContent +
        '\n\nI notice I may be repeating myself. Let\'s move forward - please share any additional details you think are important for your OKR.';

      return {
        updatedState: currentState,
        responseToUser: guidanceResponse,
        hasQueuedQuestions: false
      };
    }

    // Filter out duplicate questions from remaining
    const newQuestions = remainingQuestions.filter(q =>
      !this.isDuplicateQuestion(q, [...currentState.askedQuestions, firstQuestion])
    );

    const duplicatesFiltered = remainingQuestions.length - newQuestions.length;
    if (duplicatesFiltered > 0) {
      console.log(`🔍 Filtered ${duplicatesFiltered} duplicate question(s)`);
    }

    console.log('🔥 Processing multiple questions:', {
      firstQuestion,
      newQuestionsCount: newQuestions.length,
      totalOriginalQuestions: remainingQuestions.length,
      duplicatesFiltered
    });

    const updatedState: QuestionState = {
      ...currentState,
      pendingQuestions: [...currentState.pendingQuestions, ...newQuestions],
      currentQuestion: firstQuestion,
      askedQuestions: [...currentState.askedQuestions, firstQuestion],
      questionContext: extraction.cleanedContent || currentState.questionContext
    };

    // Construct response with just the first question
    const responseToUser = this.constructSingleQuestionResponse(
      extraction.cleanedContent,
      firstQuestion,
      newQuestions.length
    );

    console.log('🔥 Returning processed response:', {
      originalContentLength: content.length,
      processedResponseLength: responseToUser.length,
      responsePreview: responseToUser.substring(0, 200) + '...',
      pendingQuestions: updatedState.pendingQuestions.length
    });

    return {
      updatedState,
      responseToUser,
      hasQueuedQuestions: remainingQuestions.length > 0
    };
  }

  /**
   * Get the next question from the queue
   */
  static getNextQuestion(currentState: QuestionState): {
    updatedState: QuestionState;
    nextQuestion: string | null;
    hasMoreQuestions: boolean;
  } {
    if (currentState.pendingQuestions.length === 0) {
      return {
        updatedState: currentState,
        nextQuestion: null,
        hasMoreQuestions: false
      };
    }

    const [nextQuestion, ...remainingQuestions] = currentState.pendingQuestions;

    const updatedState: QuestionState = {
      ...currentState,
      pendingQuestions: remainingQuestions,
      currentQuestion: nextQuestion,
      askedQuestions: [...currentState.askedQuestions, nextQuestion]
    };

    return {
      updatedState,
      nextQuestion,
      hasMoreQuestions: remainingQuestions.length > 0
    };
  }

  /**
   * Record a user's answer to the current question
   */
  static recordAnswer(userResponse: string, currentState: QuestionState): QuestionState {
    if (!currentState.currentQuestion) {
      return currentState;
    }

    return {
      ...currentState,
      answeredQuestions: {
        ...currentState.answeredQuestions,
        [currentState.currentQuestion]: userResponse
      },
      currentQuestion: null // Clear current question after answer
    };
  }

  /**
   * Check if we should ask the next queued question
   */
  static shouldAskNextQuestion(
    userMessage: string,
    currentState: QuestionState
  ): boolean {
    // Ask next question if:
    // 1. We have pending questions
    // 2. User provided a substantive response (not just "yes" or "ok")
    // 3. User isn't asking a counter-question

    if (currentState.pendingQuestions.length === 0) {
      return false;
    }

    const isSubstantiveResponse = userMessage.trim().length > 10;
    const isCounterQuestion = userMessage.includes('?');
    const isSimpleAgreement = /^(yes|no|ok|sure|thanks)\.?$/i.test(userMessage.trim());

    return isSubstantiveResponse && !isCounterQuestion && !isSimpleAgreement;
  }

  /**
   * Generate context summary for system prompt
   */
  static generateContextSummary(questionState: QuestionState): string {
    if (questionState.askedQuestions.length === 0) {
      return '';
    }

    let summary = '\n\nQUESTION CONTEXT:\n';

    if (Object.keys(questionState.answeredQuestions).length > 0) {
      summary += 'ANSWERED QUESTIONS:\n';
      Object.entries(questionState.answeredQuestions).forEach(([question, answer]) => {
        summary += `Q: ${question}\nA: ${answer}\n\n`;
      });
    }

    if (questionState.currentQuestion) {
      summary += `CURRENT QUESTION: ${questionState.currentQuestion}\n`;
    }

    if (questionState.pendingQuestions.length > 0) {
      summary += `PENDING QUESTIONS (${questionState.pendingQuestions.length} remaining):\n`;
      questionState.pendingQuestions.forEach((q, i) => {
        summary += `${i + 1}. ${q}\n`;
      });
    }

    return summary;
  }

  // Private helper methods

  private static cleanQuestion(question: string): string {
    return question
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/^-\s*/, '')     // Remove bullet points
      .replace(/^\*\s*/, '')    // Remove asterisks
      .trim();
  }

  private static isValidQuestion(question: string): boolean {
    // Filter out very short questions or false positives
    return question.length > 10 &&
           question.endsWith('?') &&
           !question.toLowerCase().includes('right?') &&
           !question.toLowerCase().includes('okay?');
  }

  private static cleanRemainingContent(content: string): string {
    return content
      .replace(/^\s*[-•*]\s*/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s*/gm, '') // Remove numbering
      .replace(/\n{3,}/g, '\n\n')   // Collapse multiple newlines
      .trim();
  }

  private static constructSingleQuestionResponse(
    context: string,
    question: string,
    remainingCount: number
  ): string {
    let response = '';

    if (context) {
      response += context + '\n\n';
    }

    response += question;

    // Optionally hint about more questions coming
    if (remainingCount > 0) {
      response += `\n\n(I have ${remainingCount} more ${remainingCount === 1 ? 'question' : 'questions'} to help refine this further, but let's take it one step at a time.)`;
    }

    return response;
  }
}