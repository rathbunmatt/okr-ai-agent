/**
 * Response Generator for Dynamic Test Responses
 * Generates contextually appropriate responses based on AI questions and scenario context
 */

import { AIAnalysis, QuestionType } from './ai-response-analyzer';

export interface DynamicScenario {
  name: string;
  industry: string;
  role: string;
  context: {
    initialGoal: string;           // "improve customer satisfaction"
    problemContext: string;         // "complaints about slow response times"
    businessImpact: string;        // "affects retention and loyalty"
    whyImportant: string;          // "customer retention drives revenue"
    currentMetrics: Record<string, string | number>;  // { csat: 75, responseTime: "24 hours" }
    targetMetrics: Record<string, string | number>;   // { csat: 90, responseTime: "4 hours" }
    keyResults: string[];          // Pre-defined KRs
    additionalContext?: string;    // Extra context if needed
  };
}

export interface ConversationHistory {
  turns: number;
  phase: string;
  providedMetrics: boolean;
  providedOutcome: boolean;
  providedKRs: boolean;
  previousResponses: string[];
}

/**
 * Generate a contextually appropriate response to AI questions
 */
export function generateResponse(
  analysis: AIAnalysis,
  scenario: DynamicScenario,
  history: ConversationHistory
): string {
  // If AI is validating/confirming, approve
  if (analysis.sentiment === 'positive' || analysis.questionTypes.includes('validation')) {
    return generateValidationResponse(scenario, analysis);
  }

  // Prioritize question types and generate response
  if (analysis.needsMetrics && !history.providedMetrics) {
    history.providedMetrics = true;
    return generateMetricResponse(scenario, analysis);
  }

  if (analysis.needsOutcome && !history.providedOutcome) {
    history.providedOutcome = true;
    return generateOutcomeResponse(scenario, analysis);
  }

  if (analysis.needsKeyResults && !history.providedKRs) {
    history.providedKRs = true;
    return generateKRResponse(scenario, analysis);
  }

  if (analysis.needsClarification) {
    return generateClarificationResponse(scenario, analysis);
  }

  // Check individual question types
  const primaryQuestionType = analysis.questionTypes[0] || 'unknown';

  switch (primaryQuestionType) {
    case 'metric_request':
      history.providedMetrics = true;
      return generateMetricResponse(scenario, analysis);

    case 'outcome_focus':
      history.providedOutcome = true;
      return generateOutcomeResponse(scenario, analysis);

    case 'problem_understanding':
      return generateProblemResponse(scenario, analysis);

    case 'kr_request':
      history.providedKRs = true;
      return generateKRResponse(scenario, analysis);

    case 'refinement':
      return generateRefinementResponse(scenario, analysis);

    case 'clarification':
      return generateClarificationResponse(scenario, analysis);

    default:
      // Fallback: provide general context
      return generateGeneralResponse(scenario, analysis, history);
  }
}

/**
 * Generate response to metric requests
 */
function generateMetricResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  const { currentMetrics, targetMetrics } = scenario.context;

  // Build a natural response with baseline and target
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

  // Fallback if no structured metrics
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
  // Convert camelCase to space-separated
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  // Uppercase first letter
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
    // Fallback to metrics
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
 * Generate response to refinement requests
 */
function generateRefinementResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  // Accept AI's refinement suggestions
  return "Yes, that sounds better. Let's use that.";
}

/**
 * Generate response to validation requests
 */
function generateValidationResponse(scenario: DynamicScenario, analysis: AIAnalysis): string {
  // Confirm and approve
  return "Yes, that looks good!";
}

/**
 * Generate general response when question type is unclear
 */
function generateGeneralResponse(
  scenario: DynamicScenario,
  analysis: AIAnalysis,
  history: ConversationHistory
): string {
  const { initialGoal, problemContext } = scenario.context;

  // Provide more context based on conversation history
  if (history.turns < 2) {
    return `${initialGoal}. ${problemContext}`;
  } else if (!history.providedMetrics) {
    history.providedMetrics = true;
    return generateMetricResponse(scenario, analysis);
  } else if (!history.providedOutcome) {
    history.providedOutcome = true;
    return generateOutcomeResponse(scenario, analysis);
  } else {
    // Provide key results
    history.providedKRs = true;
    return generateKRResponse(scenario, analysis);
  }
}

/**
 * Generate initial message to start conversation
 */
export function generateInitialMessage(scenario: DynamicScenario): string {
  return scenario.context.initialGoal;
}
