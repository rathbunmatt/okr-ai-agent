/**
 * Response Generator V2 for Dynamic Test Responses
 * Improved version with better context awareness and repetition prevention
 */

import { AIAnalysis, QuestionType } from './ai-response-analyzer';

export interface DynamicScenario {
  name: string;
  industry: string;
  role: string;
  context: {
    initialGoal: string;
    problemContext: string;
    businessImpact: string;
    whyImportant: string;
    currentMetrics: Record<string, string | number>;
    targetMetrics: Record<string, string | number>;
    keyResults: string[];
    additionalContext?: string;
  };
}

export interface ConversationHistory {
  turns: number;
  phase: string;
  providedMetrics: boolean;
  providedOutcome: boolean;
  providedKRs: boolean;
  providedProblem: boolean;
  providedGoal: boolean;
  previousResponses: string[];
  lastResponse?: string;
}

/**
 * Generate a contextually appropriate response to AI questions
 * V2: Better repetition detection and context awareness
 */
export function generateResponse(
  analysis: AIAnalysis,
  scenario: DynamicScenario,
  history: ConversationHistory,
  aiContent: string
): string {
  // Detect AI confusion/reset - provide comprehensive context
  if (detectAIConfusion(aiContent)) {
    return generateComprehensiveContext(scenario, history);
  }

  // Check if AI is presenting a final OKR for approval
  if (isPresentingFinalOKR(aiContent)) {
    return "Yes, that looks perfect! Please finalize it.";
  }

  // If AI is asking for validation of a suggestion (not final OKR)
  if (analysis.questionTypes.includes('validation') && !isPresentingFinalOKR(aiContent)) {
    return "Yes, that sounds better. Let's use that.";
  }

  // Prioritize based on what we haven't provided yet
  if (analysis.needsMetrics && !history.providedMetrics) {
    history.providedMetrics = true;
    const response = generateMetricResponse(scenario, analysis);
    return checkAndReturnResponse(response, history);
  }

  if (analysis.needsOutcome && !history.providedOutcome) {
    history.providedOutcome = true;
    const response = generateOutcomeResponse(scenario, analysis);
    return checkAndReturnResponse(response, history);
  }

  if (analysis.needsKeyResults && !history.providedKRs) {
    history.providedKRs = true;
    const response = generateKRResponse(scenario, analysis);
    return checkAndReturnResponse(response, history);
  }

  // Handle specific question types
  const primaryQuestionType = analysis.questionTypes[0] || 'unknown';

  switch (primaryQuestionType) {
    case 'metric_request':
      if (!history.providedMetrics) {
        history.providedMetrics = true;
        return checkAndReturnResponse(generateMetricResponse(scenario, analysis), history);
      }
      break;

    case 'outcome_focus':
      if (!history.providedOutcome) {
        history.providedOutcome = true;
        return checkAndReturnResponse(generateOutcomeResponse(scenario, analysis), history);
      }
      break;

    case 'problem_understanding':
      if (!history.providedProblem) {
        history.providedProblem = true;
        return checkAndReturnResponse(generateProblemResponse(scenario, analysis), history);
      }
      break;

    case 'kr_request':
      if (!history.providedKRs) {
        history.providedKRs = true;
        return checkAndReturnResponse(generateKRResponse(scenario, analysis), history);
      }
      break;

    case 'clarification':
      return checkAndReturnResponse(generateClarificationResponse(scenario, analysis), history);

    case 'refinement':
      return "Yes, that sounds better. Let's use that.";
  }

  // If we've provided everything, check what we can provide again with more detail
  return generateSmartFallback(scenario, analysis, history, aiContent);
}

/**
 * Detect if AI is confused or has lost context
 */
function detectAIConfusion(aiContent: string): boolean {
  const confusionPatterns = [
    "don't have any input",
    "haven't provided any input",
    "we've lost context",
    "need to get back on track",
    "missing critical information",
    "let's restart",
    "let's start over"
  ];

  return confusionPatterns.some(pattern => aiContent.toLowerCase().includes(pattern));
}

/**
 * Check if AI is presenting a final OKR for approval
 */
function isPresentingFinalOKR(aiContent: string): boolean {
  const finalOKRIndicators = [
    "final okr",
    "ready to export",
    "does this look good",
    "here's your okr",
    "objective:",
    "key results:",
    "kr1:",
    "kr2:"
  ];

  const lowerContent = aiContent.toLowerCase();
  const hasIndicators = finalOKRIndicators.some(indicator => lowerContent.includes(indicator));
  const hasStructure = lowerContent.includes("objective") && lowerContent.includes("key result");

  return hasIndicators || hasStructure;
}

/**
 * Check if response was already given, modify if needed
 */
function checkAndReturnResponse(response: string, history: ConversationHistory): string {
  // If we just gave this exact response, provide it differently
  if (history.lastResponse === response || history.previousResponses.includes(response)) {
    // Try to rephrase or provide additional context
    return response + " (for clarification)";
  }

  history.lastResponse = response;
  history.previousResponses.push(response);
  return response;
}

/**
 * Generate comprehensive context when AI is confused
 */
function generateComprehensiveContext(scenario: DynamicScenario, history: ConversationHistory): string {
  const parts = [];

  // Goal
  if (!history.providedGoal) {
    parts.push(`My goal is to ${scenario.context.initialGoal}`);
    history.providedGoal = true;
  }

  // Problem
  if (!history.providedProblem) {
    parts.push(`The problem is ${scenario.context.problemContext}`);
    history.providedProblem = true;
  }

  // Business impact
  if (!history.providedOutcome) {
    parts.push(`${scenario.context.businessImpact}. ${scenario.context.whyImportant}`);
    history.providedOutcome = true;
  }

  // Metrics
  if (!history.providedMetrics) {
    const metricsText = generateMetricResponse(scenario, {} as AIAnalysis);
    parts.push(`Current metrics: ${metricsText}`);
    history.providedMetrics = true;
  }

  // Key results
  if (!history.providedKRs) {
    const krText = scenario.context.keyResults.join(', ');
    parts.push(`Key results I want: ${krText}`);
    history.providedKRs = true;
  }

  const response = parts.join('. ');
  history.lastResponse = response;
  history.previousResponses.push(response);
  return response;
}

/**
 * Smart fallback when we've provided everything
 */
function generateSmartFallback(
  scenario: DynamicScenario,
  analysis: AIAnalysis,
  history: ConversationHistory,
  aiContent: string
): string {
  // If asking for metrics again, provide them
  if (aiContent.toLowerCase().includes('metric') || aiContent.toLowerCase().includes('baseline')) {
    return checkAndReturnResponse(generateMetricResponse(scenario, analysis), history);
  }

  // If asking about outcome/impact, provide it
  if (aiContent.toLowerCase().includes('outcome') || aiContent.toLowerCase().includes('impact') || aiContent.toLowerCase().includes('why')) {
    return checkAndReturnResponse(generateOutcomeResponse(scenario, analysis), history);
  }

  // If asking for key results, provide them
  if (aiContent.toLowerCase().includes('key result') || aiContent.toLowerCase().includes('kr')) {
    return checkAndReturnResponse(generateKRResponse(scenario, analysis), history);
  }

  // Default: approve if it seems like AI is progressing
  if (analysis.sentiment === 'positive') {
    return "Yes, that looks good!";
  }

  // Last resort: provide clarification
  return checkAndReturnResponse(generateClarificationResponse(scenario, analysis), history);
}

/**
 * Generate response to metric requests
 */
function generateMetricResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  const { currentMetrics, targetMetrics } = scenario.context;
  const metrics: string[] = [];

  for (const [key, currentValue] of Object.entries(currentMetrics)) {
    const targetValue = targetMetrics[key];
    if (targetValue) {
      const formatted = formatMetric(key, currentValue, targetValue);
      metrics.push(formatted);
    }
  }

  if (metrics.length > 0) {
    return metrics.join(', and ');
  }

  return `Currently we're at ${JSON.stringify(currentMetrics)} and want to reach ${JSON.stringify(targetMetrics)}`;
}

/**
 * Format a metric comparison naturally
 */
function formatMetric(key: string, current: string | number, target: string | number): string {
  const keyLabel = formatMetricKey(key);

  if (typeof current === 'number' && typeof target === 'number') {
    return `${keyLabel} from ${current}% to ${target}%`;
  }

  return `${keyLabel} from ${current} to ${target}`;
}

/**
 * Format metric keys to be more readable
 */
function formatMetricKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Generate response to outcome-focused questions
 */
function generateOutcomeResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  const { businessImpact, whyImportant } = scenario.context;
  return `${businessImpact}. ${whyImportant}`;
}

/**
 * Generate response to problem understanding questions
 */
function generateProblemResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  const { problemContext } = scenario.context;
  return `${problemContext}`;
}

/**
 * Generate response to key results requests
 */
function generateKRResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  const { keyResults } = scenario.context;

  if (keyResults.length === 0) {
    return generateMetricResponse(scenario, analysis);
  }

  return keyResults.join(', ');
}

/**
 * Generate response to clarification requests
 */
function generateClarificationResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  const { initialGoal, problemContext, businessImpact } = scenario.context;
  return `${initialGoal} because ${problemContext}. This is important because ${businessImpact}.`;
}

/**
 * Generate initial message to start conversation
 */
export function generateInitialMessage(scenario: DynamicScenario): string {
  return scenario.context.initialGoal;
}
