import {
  UserContext,
  InterventionType,
  InterventionResult,
  ConversationStrategy
} from '../types/conversation';
import { logger } from '../utils/logger';

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  detectionRegex: RegExp[];
  keywordTriggers: string[];
  contextualRules: (text: string, context?: UserContext) => boolean;
  reframingStrategy: ReframingStrategy;
  severity: 'low' | 'medium' | 'high' | 'critical';
  interventionType: InterventionType;
}

export interface DetectedPattern {
  type: string; // Pattern id/type
  id: string;
  name: string;
  description: string;
  confidence: number; // Individual pattern detection confidence
  severity: 'low' | 'medium' | 'high' | 'critical';
  interventionType: InterventionType;
  reframingStrategy: ReframingStrategy;
}

export interface ReframingStrategy {
  name: string;
  technique: 'five_whys' | 'outcome_transformation' | 'example_driven' | 'question_cascade' | 'value_exploration';
  questions: string[];
  examples: ReframingExample[];
  successCriteria: string[];
  maxAttempts: number;
}

export interface ReframingExample {
  before: string;
  after: string;
  context: string;
  explanation: string;
}

export interface DetectionResult {
  detected: boolean;
  patterns: DetectedPattern[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  suggestedInterventions: InterventionType[];
  reframingStrategy: ReframingStrategy | null;
}

export interface ReframingResult {
  strategy: ReframingStrategy;
  question: string;
  suggestion: string; // Combined reframing suggestion
  examples: ReframingExample[];
  followUpQuestions: string[];
  expectedOutcome: string;
  previousAttempts: number;
  confidence: number;
  technique: string;
}

/**
 * Sophisticated anti-pattern detection and reframing system
 * Identifies common OKR mistakes and guides users toward outcome thinking
 */
export class AntiPatternDetector {
  private readonly patterns: AntiPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Detect anti-patterns in user input
   */
  public detectPatterns(text: string, context?: UserContext): DetectionResult {
    const startTime = Date.now();
    const detectedPatterns: DetectedPattern[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let totalConfidence = 0;

    for (const pattern of this.patterns) {
      const confidence = this.calculatePatternConfidence(text, pattern, context);

      if (confidence > 0.3) { // Threshold for detection
        // Create DetectedPattern with individual confidence
        const detectedPattern: DetectedPattern = {
          type: pattern.id, // Use id as type for test compatibility
          id: pattern.id,
          name: pattern.name,
          description: pattern.description,
          confidence: confidence,
          severity: pattern.severity,
          interventionType: pattern.interventionType,
          reframingStrategy: pattern.reframingStrategy
        };

        detectedPatterns.push(detectedPattern);
        totalConfidence += confidence;

        // Track highest severity
        if (this.severityToNumber(pattern.severity) > this.severityToNumber(maxSeverity)) {
          maxSeverity = pattern.severity;
        }
      }
    }

    const avgConfidence = detectedPatterns.length > 0 ? totalConfidence / detectedPatterns.length : 0;
    const suggestedInterventions = [...new Set(detectedPatterns.map(p => p.interventionType))];
    const reframingStrategy = this.selectBestReframingStrategy(detectedPatterns, context);

    const result: DetectionResult = {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      severity: maxSeverity,
      confidence: avgConfidence,
      suggestedInterventions,
      reframingStrategy
    };

    logger.debug('Anti-pattern detection completed', {
      patternsDetected: detectedPatterns.length,
      severity: maxSeverity,
      confidence: avgConfidence,
      processingTime: Date.now() - startTime
    });

    return result;
  }

  /**
   * Generate reframing response for detected patterns
   */
  public generateReframingResponse(
    detectionResult: DetectionResult,
    text: string,
    context?: UserContext,
    previousAttempts: number = 0
  ): ReframingResult | null {
    if (!detectionResult.detected || !detectionResult.reframingStrategy) {
      return null;
    }

    const strategy = detectionResult.reframingStrategy;
    const primaryPattern = detectionResult.patterns[0];

    // Find the full AntiPattern object for the primary pattern
    const fullPattern = this.patterns.find(p => p.id === primaryPattern.id);
    if (!fullPattern) {
      return null; // Safety check
    }

    // Select appropriate question based on attempts and context
    const question = this.selectReframingQuestion(strategy, text, previousAttempts, context);

    // Get relevant examples
    const examples = this.selectRelevantExamples(strategy.examples, context, text);

    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(fullPattern, text, context);

    // Define expected outcome
    const expectedOutcome = this.defineExpectedOutcome(fullPattern, strategy);

    // Generate comprehensive reframing suggestion
    let suggestion = question;
    if (examples.length > 0) {
      const firstExample = examples[0];
      suggestion += `\n\nFor example, instead of:\n"${firstExample.before}"\n\nConsider:\n"${firstExample.after}"\n\n${firstExample.explanation}`;
    }

    return {
      strategy,
      question,
      suggestion,
      examples,
      followUpQuestions,
      expectedOutcome,
      previousAttempts,
      confidence: 0.8, // Base confidence for reframing attempts
      technique: strategy.technique
    };
  }

  /**
   * Evaluate reframing success
   */
  public evaluateReframingSuccess(
    originalText: string,
    reframedText: string,
    strategy: ReframingStrategy,
    context?: UserContext
  ): InterventionResult {
    const beforeDetection = this.detectPatterns(originalText, context);
    const afterDetection = this.detectPatterns(reframedText, context);

    // Simple scoring improvement calculation
    const beforeScore = this.calculateTextScore(originalText);
    const afterScore = this.calculateTextScore(reframedText);

    const success = (
      afterDetection.confidence < beforeDetection.confidence * 0.7 || // Pattern reduced
      afterScore > beforeScore + 10 // Quality improved
    );

    return {
      type: beforeDetection.patterns[0]?.interventionType || 'activity_to_outcome',
      triggered: true,
      success,
      beforeScore,
      afterScore,
      technique: strategy.name,
      userResponse: success ? 'positive' : 'neutral'
    };
  }

  /**
   * Initialize all anti-pattern definitions
   */
  private initializePatterns(): void {
    // Activity Language Pattern
    this.patterns.push({
      id: 'activity_focused',
      name: 'Activity-Focused Language',
      description: 'Language focused on deliverables and activities rather than outcomes',
      detectionRegex: [
        /\b(implement|launch|complete|deliver|build|create|develop|deploy|install|setup|configure|write|design|plan|organize|manage|coordinate|execute|conduct|analyze|review|research|test)\b/gi,
        /\b(project|deliverable|milestone|task|feature|function|system|platform|tool|process|interview|survey|meeting|workshop)\b/gi
      ],
      keywordTriggers: [
        'implement', 'launch', 'complete', 'deliver', 'build', 'create',
        'develop', 'deploy', 'install', 'setup', 'configure', 'write',
        'design', 'plan', 'organize', 'manage', 'coordinate', 'execute',
        'conduct', 'analyze', 'review', 'research', 'test', 'interview'
      ],
      contextualRules: (text: string) => {
        return !(/\b(increase|decrease|improve|reduce|enhance|achieve|reach|result|outcome|impact|benefit|value|change)\b/i.test(text));
      },
      reframingStrategy: this.createFiveWhysStrategy(),
      severity: 'high',
      interventionType: 'activity_to_outcome'
    });

    // Binary Goal Pattern
    this.patterns.push({
      id: 'binary_thinking',
      name: 'Binary Goals',
      description: 'Done/not-done goals without measurable outcomes',
      detectionRegex: [
        /\b(done|completed?|complete|finished?|finish|launched?|launch|shipped?|ship|delivered?|deliver|implemented?|implement|ready|live|active)\b/gi,
        /\b(successfully|completely|fully|entirely)\s+(done|completed?|complete|finished?|finish|launched?|launch|implemented?|implement)\b/gi,
        /\b(achieve|attain|accomplish|reach)\s+(?:\w+\s+)?(excellence|success|leadership|greatness|mastery)\b/gi,
        /\b(achieve|attain|accomplish|reach)\s+.*?successfully\b/gi
      ],
      keywordTriggers: [
        'done', 'completed', 'finished', 'launched', 'shipped', 'delivered',
        'implemented', 'ready', 'live', 'active', 'successfully', 'achieve excellence',
        'operational excellence', 'achieve success'
      ],
      contextualRules: (text: string) => {
        // Binary if it has aspirational words but no specific numbers or targets
        const hasAspirations = /\b(achieve|attain|accomplish|reach|improve|enhance|optimize)\s+(excellence|success|leadership|satisfaction|quality|performance)\b/i.test(text);
        const hasNumbers = /\b(\d+|by\s+\d|from\s+\d|to\s+\d|%|percent|points?)\b/i.test(text);
        const hasCompletion = /\b(done|completed?|complete|finished?|finish|launched?|launch|shipped?|ship|delivered?|deliver|implemented?|implement)\b/i.test(text);

        return (hasAspirations && !hasNumbers) || (hasCompletion && !hasNumbers);
      },
      reframingStrategy: this.createOutcomeTransformationStrategy(),
      severity: 'high',
      interventionType: 'activity_to_outcome'
    });

    // Vanity Metrics Pattern
    this.patterns.push({
      id: 'vanity_metrics',
      name: 'Vanity Metrics',
      description: 'Metrics that look good but lack business context',
      detectionRegex: [
        /\b(followers|likes|views|downloads|page\s*views|impressions|clicks)\b/gi,
        /\b(social\s*media|facebook|twitter|instagram|linkedin)\s*(followers|likes|shares|engagement)\b/gi
      ],
      keywordTriggers: [
        'followers', 'likes', 'views', 'downloads', 'pageviews', 'impressions',
        'clicks', 'shares', 'mentions', 'subscribers'
      ],
      contextualRules: (text: string) => {
        return !(/\b(revenue|conversion|retention|satisfaction|value|business|customer|sales|profit|growth)\b/i.test(text));
      },
      reframingStrategy: this.createValueExplorationStrategy(),
      severity: 'medium',
      interventionType: 'metric_education'
    });

    // Business as Usual Pattern
    this.patterns.push({
      id: 'business_as_usual',
      name: 'Business as Usual',
      description: 'Regular job duties without stretch or improvement',
      detectionRegex: [
        /\b(maintain|keep|continue|sustain|preserve|ongoing|regular|routine|normal|standard)\b/gi,
        /\b(daily|weekly|monthly|quarterly)\s+(meetings|reports|reviews|updates|calls)\b/gi
      ],
      keywordTriggers: [
        'maintain', 'keep', 'continue', 'sustain', 'preserve', 'ongoing',
        'regular', 'routine', 'normal', 'standard', 'current', 'existing'
      ],
      contextualRules: (text: string) => {
        return !(/\b(improve|increase|enhance|optimize|accelerate|transform|exceed|breakthrough|stretch|ambitious)\b/i.test(text));
      },
      reframingStrategy: this.createAmbitionStrategy(),
      severity: 'medium',
      interventionType: 'ambition_calibration'
    });

    // Kitchen Sink Pattern
    this.patterns.push({
      id: 'kitchen_sink',
      name: 'Kitchen Sink Approach',
      description: 'Too many metrics or overlapping measurements',
      detectionRegex: [
        /(\d+\s*(?:key\s*result|kr|metric|measure|indicator))/gi,
        /(increase|improve|reduce|enhance|optimize|achieve|grow|expand|boost)[^,.]+(,\s*(?:and\s+)?(?:increase|improve|reduce|enhance|optimize|achieve|grow|expand|boost))+/gi
      ],
      keywordTriggers: [],
      contextualRules: (text: string) => {
        const krCount = (text.match(/\b(key\s*result|kr)\b/gi) || []).length;
        const metricCount = (text.match(/\b(metric|measure|track|monitor)\b/gi) || []).length;

        // Count multiple goals/objectives separated by commas (include -ing forms)
        const actionWords = text.match(/\b(increas(?:e|ing)|improv(?:e|ing)|reduc(?:e|ing)|enhanc(?:e|ing)|optimiz(?:e|ing)|achiev(?:e|ing)|grow(?:ing)?|expand(?:ing)?|boost(?:ing)?|mak(?:e|ing)|keep(?:ing)?|be(?:ing|come|coming)?|establish(?:ing)?|creat(?:e|ing)|build(?:ing)?|develop(?:ing)?|launch(?:ing)?)\b/gi) || [];
        const commaCount = (text.match(/,/g) || []).length;
        const andCount = (text.match(/\band\b/gi) || []).length;

        // Kitchen sink if: many explicit KRs/metrics, OR multiple goals with conjunctions
        const hasManyGoals = (actionWords.length >= 4 && commaCount >= 2) || (actionWords.length >= 5);
        const hasManyKRs = krCount > 5 || metricCount > 7;

        return hasManyKRs || hasManyGoals;
      },
      reframingStrategy: this.createFocusStrategy(),
      severity: 'low',
      interventionType: 'clarity_improvement'
    });

    // Vague Outcome Pattern
    this.patterns.push({
      id: 'vague_outcome',
      name: 'Vague Outcomes',
      description: 'Outcomes without specific, measurable definitions',
      detectionRegex: [
        /\b(best|better|good|great|more|less|some|many|few|various|several|multiple|different|appropriate|significant|substantial)\b/gi,
        /\b(improve|increase|enhance|optimize|boost|grow|expand)\b(?!\s+.*\b(?:\d+|by|from|to|%|percent)\b)/gi
      ],
      keywordTriggers: [
        'best', 'better', 'good', 'great', 'more', 'less', 'some', 'many', 'few',
        'various', 'several', 'multiple', 'different', 'appropriate',
        'significant', 'substantial', 'meaningful', 'considerable', 'happy', 'low'
      ],
      contextualRules: (text: string) => {
        return !(/\b\d+(\.\d+)?[%$]?\b|\bfrom\s+\d+|\bto\s+\d+|\bby\s+\d+/i.test(text));
      },
      reframingStrategy: this.createSpecificityStrategy(),
      severity: 'medium',
      interventionType: 'clarity_improvement'
    });

    // Scope Elevation Resistance Pattern
    this.patterns.push({
      id: 'scope_elevation_resistance',
      name: 'Scope Elevation Resistance',
      description: 'User resistance to inappropriate scope elevation attempts',
      detectionRegex: [
        /\b(just|only|within)\s+(my|our)\s+(team|department|group|area|scope|authority|control)\b/gi,
        /\b(not|can't|cannot|don't)\s+(company|organization|enterprise|corporation|corporate)\s*(wide|level|scale)\b/gi,
        /\b(stay|keep|remain|focus)\s+(within|on|in)\s+(my|our|the)\s+(scope|bounds|limits|area|team|department)\b/gi
      ],
      keywordTriggers: [
        'just my team', 'only our department', 'within my authority',
        'not company-wide', 'stay focused', 'keep it local',
        'my scope', 'our area', 'team level', 'department level',
        'not that broad', 'too big', 'beyond my control',
        'can\'t influence', 'outside my area', 'not my responsibility'
      ],
      contextualRules: (text: string, context?: UserContext) => {
        // Detect resistance patterns combined with scope boundary language
        const resistanceIndicators = /\b(no|not|can't|cannot|won't|shouldn't|don't|disagree|resist|oppose|against)\b/gi;
        const scopeIndicators = /\b(company|corporate|organization|enterprise|strategic|executive|board|c-level|ceo|cto|cfo)\b/gi;
        const boundaryIndicators = /\b(my|our|just|only|within|limited|scope|authority|control|team|department|area)\b/gi;

        const hasResistance = resistanceIndicators.test(text);
        const hasScope = scopeIndicators.test(text);
        const hasBoundary = boundaryIndicators.test(text);

        // Check if user has scope elevation resistance preference
        const hasResistancePreference = context?.resistancePatterns?.includes('scope_elevation_resistance');

        return Boolean((hasResistance && (hasScope || hasBoundary)) || hasResistancePreference);
      },
      reframingStrategy: this.createScopeRespectStrategy(),
      severity: 'high',
      interventionType: 'alignment_check'
    });

    // Sphere of Influence Violation Pattern (NEW)
    this.patterns.push({
      id: 'sphere_of_influence_violation',
      name: 'Sphere of Influence Violation',
      description: 'OKR depends on factors outside team\'s direct control or sphere of influence',
      detectionRegex: [
        /\b(if|when|once|assuming|provided|contingent|dependent|relies on|requires that|needs|depends)\b.*\b(they|them|their|other|customer|user|market|partner|vendor|external)\b/gi,
        /\b(customer|user|market|client)\s+(will|must|should|needs to|has to|chooses|decides|adopts|accepts)\b/gi,
        /\b(requires|depends on|needs|contingent on|relies on)\b.*\b(team|department|group|function|org|partner|vendor|third party|external|other)\b/gi
      ],
      keywordTriggers: [
        'if customers', 'when users', 'assuming market', 'provided that',
        'customer adoption', 'user acceptance', 'market conditions',
        'requires other teams', 'depends on', 'relies on',
        'external dependency', 'third party', 'vendor delivers',
        'partner provides', 'cross-team coordination', 'needs support from'
      ],
      contextualRules: (text: string, context?: UserContext) => {
        const dependencyIndicators = /\b(if|when|assuming|provided|contingent|dependent|relies on|requires|needs|depends)\b/gi;
        const externalFactors = /\b(customer|user|market|client|partner|vendor|third party|external|other team|other department)\b/gi;
        const controlLimits = /\b(will|must|should|chooses|decides|adopts|accepts|agrees|buys)\b/gi;

        const hasDependency = dependencyIndicators.test(text);
        const hasExternal = externalFactors.test(text);
        const hasControlLimit = controlLimits.test(text);

        // Strong signal: dependencies + external factors + control limits
        return Boolean(hasDependency && hasExternal && hasControlLimit);
      },
      reframingStrategy: this.createSphereOfInfluenceStrategy(),
      severity: 'critical',
      interventionType: 'alignment_check'
    });
  }

  /**
   * Extract dependencies from objective text for sphere of influence analysis
   */
  public extractDependencies(text: string): Array<{ type: string; description: string; controllability: string }> {
    const dependencies: Array<{ type: string; description: string; controllability: string }> = [];
    const lowerText = text.toLowerCase();

    // Customer/User behavior dependencies
    if (/\b(customer|user|client)\s+(will|must|should|needs to|has to|chooses|decides|adopts|accepts|buys|uses)\b/i.test(text)) {
      dependencies.push({
        type: 'customer_behavior',
        description: 'Depends on customer/user choices or behavior',
        controllability: 'low'
      });
    }

    // Other team dependencies
    if (/\b(requires|depends on|needs|relies on)\b.*\b(team|department|group|function|org)\b/i.test(text) ||
        /\b(other team|another team|delivery team|design team|sales team|support team|operations team)\b/i.test(text)) {
      dependencies.push({
        type: 'other_team',
        description: 'Requires coordination or delivery from other teams',
        controllability: 'medium'
      });
    }

    // Market dynamics dependencies
    if (/\b(market|industry|competition|competitor|economic|economy|trends)\b/i.test(text) &&
        /\b(if|when|assuming|provided|grows|changes|shifts|evolves)\b/i.test(text)) {
      dependencies.push({
        type: 'market_dynamics',
        description: 'Dependent on market conditions or competitive landscape',
        controllability: 'none'
      });
    }

    // External factor dependencies
    if (/\b(partner|vendor|third party|external|supplier|contractor)\b.*\b(delivers|provides|completes|supports)\b/i.test(text)) {
      dependencies.push({
        type: 'external_factor',
        description: 'Relies on external partners or vendors',
        controllability: 'low'
      });
    }

    // Conditional dependencies (if/when/assuming)
    const conditionalMatches = text.match(/\b(if|when|once|assuming|provided that|contingent on)\b[^.!?]*/gi);
    if (conditionalMatches && conditionalMatches.length > 0) {
      conditionalMatches.forEach(match => {
        if (!dependencies.some(d => match.toLowerCase().includes(d.type))) {
          dependencies.push({
            type: 'external_factor',
            description: `Conditional dependency: ${match.trim().substring(0, 80)}`,
            controllability: 'low'
          });
        }
      });
    }

    return dependencies;
  }

  /**
   * Calculate confidence level for pattern detection
   */
  private calculatePatternConfidence(text: string, pattern: AntiPattern, context?: UserContext): number {
    let confidence = 0;
    let baseConfidence = 0;

    // Regex matches - stronger signal
    const regexMatches = pattern.detectionRegex.reduce((total, regex) => {
      const matches = text.match(regex) || [];
      return total + matches.length;
    }, 0);

    baseConfidence += Math.min(regexMatches * 0.25, 0.7);

    // Keyword matches
    const keywordMatches = pattern.keywordTriggers.filter(keyword =>
      new RegExp(`\\b${keyword}\\b`, 'i').test(text)
    ).length;

    baseConfidence += Math.min(keywordMatches * 0.18, 0.45);

    // Must have SOME evidence before checking contextual rules
    const hasEvidence = regexMatches > 0 || keywordMatches > 0;

    // Contextual rules - strongest signal, provides baseline boost
    const passesContextualRules = pattern.contextualRules(text, context);
    if (passesContextualRules && hasEvidence) {
      baseConfidence += 0.4; // Increased from 0.3
      // If contextual rules pass with evidence, boost baseline confidence
      confidence = Math.max(baseConfidence, 0.6);
    } else {
      confidence = baseConfidence;
    }

    // Severity adjustment - high severity patterns get confidence boost when detected
    const severityBoost = {
      'critical': 0.15,
      'high': 0.10,
      'medium': 0.05,
      'low': 0.0
    }[pattern.severity];

    confidence += severityBoost;

    return Math.min(confidence, 1.0);
  }

  /**
   * Select best reframing strategy from detected patterns
   */
  private selectBestReframingStrategy(patterns: DetectedPattern[], context?: UserContext): ReframingStrategy | null {
    if (patterns.length === 0) return null;

    // Sort by severity and confidence, return strategy of most severe pattern
    const sortedPatterns = patterns.sort((a, b) => {
      const severityDiff = this.severityToNumber(b.severity) - this.severityToNumber(a.severity);
      // If same severity, use confidence as tiebreaker
      return severityDiff !== 0 ? severityDiff : b.confidence - a.confidence;
    });

    return sortedPatterns[0].reframingStrategy;
  }

  /**
   * Select appropriate reframing question
   */
  private selectReframingQuestion(
    strategy: ReframingStrategy,
    text: string,
    attempts: number,
    context?: UserContext
  ): string {
    if (attempts >= strategy.questions.length) {
      // Fallback to a generic outcome question
      return "Let's step back. What change or improvement will people see when this succeeds?";
    }

    let question = strategy.questions[attempts];

    // Replace placeholders
    question = this.replacePlaceholders(question, text, context);

    return question;
  }

  /**
   * Replace placeholders in questions with context-specific content
   */
  private replacePlaceholders(text: string, originalText: string, context?: UserContext): string {
    // Extract potential activity from original text
    const activityMatch = originalText.match(/\b(implement|launch|complete|deliver|build|create|develop|deploy)\s+([^.!?]+)/i);
    const activity = activityMatch ? activityMatch[0] : 'this initiative';

    return text
      .replace(/\{activity\}/g, activity)
      .replace(/\{user_name\}/g, context?.function || 'you')
      .replace(/\{industry\}/g, context?.industry || 'your industry')
      .replace(/\{function\}/g, context?.function || 'your role');
  }

  /**
   * Select relevant examples based on context
   */
  private selectRelevantExamples(
    examples: ReframingExample[],
    context?: UserContext,
    originalText?: string
  ): ReframingExample[] {
    // Filter examples by industry/function relevance
    let relevantExamples = examples;

    if (context?.industry) {
      const industryExamples = examples.filter(ex =>
        ex.context.toLowerCase().includes(context.industry!.toLowerCase())
      );
      if (industryExamples.length > 0) {
        relevantExamples = industryExamples;
      }
    }

    // Return up to 2 most relevant examples
    return relevantExamples.slice(0, 2);
  }

  /**
   * Generate contextual follow-up questions
   */
  private generateFollowUpQuestions(
    pattern: AntiPattern,
    text: string,
    context?: UserContext
  ): string[] {
    const questions: string[] = [];

    switch (pattern.interventionType) {
      case 'activity_to_outcome':
        questions.push("What will be different when this is done?");
        questions.push("Who benefits from this change?");
        questions.push("How will you know it's working?");
        break;

      case 'metric_education':
        questions.push("What business result does this metric indicate?");
        questions.push("How does this connect to revenue or customer value?");
        break;

      case 'ambition_calibration':
        questions.push("How could you exceed normal expectations here?");
        questions.push("What would make this feel like a real achievement?");
        break;

      case 'clarity_improvement':
        questions.push("Can you be more specific about what success looks like?");
        questions.push("What exact numbers would represent success?");
        break;
    }

    return questions;
  }

  /**
   * Define expected outcome for reframing attempt
   */
  private defineExpectedOutcome(pattern: AntiPattern, strategy: ReframingStrategy): string {
    const outcomes: Record<InterventionType, string> = {
      'activity_to_outcome': 'User shifts from describing tasks to describing results and changes',
      'metric_education': 'User connects metrics to business value and customer impact',
      'ambition_calibration': 'User raises ambition level with challenging but achievable targets',
      'clarity_improvement': 'User provides specific, measurable definitions of success',
      'inspiration_boost': 'User articulates more inspiring and motivational objectives',
      'alignment_check': 'User demonstrates clear connection to organizational goals',
      'feasibility_reality_check': 'User balances ambition with realistic constraints',
      'altitude_correction': 'User adjusts objective to appropriate organizational level',
      'scarf_safety_building': 'User demonstrates increased psychological safety and comfort'
    };

    return outcomes[pattern.interventionType] || 'User provides more outcome-focused response';
  }

  /**
   * Simple text quality scoring for reframing evaluation
   */
  private calculateTextScore(text: string): number {
    let score = 50; // Start neutral

    // Outcome language (positive)
    const outcomeWords = ['increase', 'decrease', 'improve', 'reduce', 'achieve', 'result', 'outcome', 'impact', 'value', 'benefit'];
    const outcomeMatches = outcomeWords.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    ).length;
    score += outcomeMatches * 10;

    // Activity language (negative)
    const activityWords = ['implement', 'launch', 'complete', 'deliver', 'build', 'create', 'develop'];
    const activityMatches = activityWords.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    ).length;
    score -= activityMatches * 8;

    // Numbers and specificity (positive)
    const hasNumbers = /\d+/.test(text);
    if (hasNumbers) score += 15;

    // Vague language (negative)
    const vagueWords = ['better', 'good', 'more', 'some', 'many'];
    const vagueMatches = vagueWords.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    ).length;
    score -= vagueMatches * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Convert severity to number for comparison
   */
  private severityToNumber(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const map = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return map[severity];
  }

  /**
   * Reframing strategy definitions
   */
  private createFiveWhysStrategy(): ReframingStrategy {
    return {
      name: 'Five Whys Technique',
      technique: 'five_whys',
      questions: [
        "That sounds like a project milestone! Let's explore what change {activity} will create for your users or customers.",
        "Why is {activity} important to your organization?",
        "What value will {activity} create once it's complete?",
        "How will people's experience change when {activity} is finished?",
        "What business outcome are you hoping to achieve through {activity}?"
      ],
      examples: [
        {
          before: "Launch new mobile app",
          after: "Delight customers with instant access to their account information",
          context: "Technology",
          explanation: "Shifted from the deliverable (app) to the customer outcome (instant access)"
        },
        {
          before: "Implement CRM system",
          after: "Transform sales productivity by reducing admin time by 40%",
          context: "Sales",
          explanation: "Focused on the productivity outcome rather than the system implementation"
        }
      ],
      successCriteria: [
        "User describes a change in state rather than a deliverable",
        "User mentions impact on people (customers, users, team)",
        "User connects to business value or strategic outcome"
      ],
      maxAttempts: 5
    };
  }

  private createOutcomeTransformationStrategy(): ReframingStrategy {
    return {
      name: 'Outcome Transformation',
      technique: 'outcome_transformation',
      questions: [
        "This seems binary - either complete or not. What measurable improvement will we see once this is finished?",
        "When this is done, what will be different? How will you measure that change?",
        "What happens after completion? What outcomes does it enable?"
      ],
      examples: [
        {
          before: "Website redesign completed successfully",
          after: "Increase user engagement by 50% through improved site experience",
          context: "Marketing",
          explanation: "Transformed from completion status to measurable user behavior change"
        }
      ],
      successCriteria: [
        "User provides measurable outcomes instead of completion status",
        "User describes quantifiable changes or improvements"
      ],
      maxAttempts: 3
    };
  }

  private createValueExplorationStrategy(): ReframingStrategy {
    return {
      name: 'Value Exploration',
      technique: 'value_exploration',
      questions: [
        "These are interesting numbers, but how do they connect to business value? What happens when you achieve this metric?",
        "What business outcome would this metric indicate? How does it drive revenue or customer value?",
        "If you hit these numbers, what changes for your business or customers?"
      ],
      examples: [
        {
          before: "Increase social media followers to 10,000",
          after: "Drive 25% more qualified leads through improved social media engagement",
          context: "Marketing",
          explanation: "Connected followers to business outcome of lead generation"
        }
      ],
      successCriteria: [
        "User connects metrics to business value",
        "User explains how metric drives revenue/customer outcomes"
      ],
      maxAttempts: 3
    };
  }

  private createAmbitionStrategy(): ReframingStrategy {
    return {
      name: 'Ambition Calibration',
      technique: 'question_cascade',
      questions: [
        "This sounds like important ongoing work. For OKRs, let's focus on improvements - how could you excel beyond normal execution?",
        "What would make this feel like a real stretch goal? What would success look like that would make you celebrate?",
        "If you had unlimited resources, what ambitious outcome would you pursue in this area?"
      ],
      examples: [
        {
          before: "Maintain current customer satisfaction levels",
          after: "Achieve industry-leading customer satisfaction with 95% positive ratings",
          context: "Customer Service",
          explanation: "Transformed from maintaining status quo to achieving industry leadership"
        }
      ],
      successCriteria: [
        "User raises ambition level significantly",
        "User provides stretch goals that require effort beyond normal duties"
      ],
      maxAttempts: 3
    };
  }

  private createFocusStrategy(): ReframingStrategy {
    return {
      name: 'Focus Strategy',
      technique: 'question_cascade',
      questions: [
        "You have lots of great metrics! Let's focus on the 3-4 that best indicate success. Which ones are most critical?",
        "If you could only track 3 numbers to know if this objective succeeds, what would they be?",
        "Which of these metrics would you check first each week to gauge progress?"
      ],
      examples: [
        {
          before: "Track 8 different metrics including users, sessions, bounce rate, conversion, retention, revenue, costs, and satisfaction",
          after: "Focus on 3 key indicators: user retention (+20%), conversion rate (+15%), and customer lifetime value (+30%)",
          context: "Product",
          explanation: "Narrowed from 8 metrics to 3 most critical outcome indicators"
        }
      ],
      successCriteria: [
        "User reduces number of metrics to 3-5 key indicators",
        "User prioritizes most important success measures"
      ],
      maxAttempts: 2
    };
  }

  private createSpecificityStrategy(): ReframingStrategy {
    return {
      name: 'Specificity Enhancement',
      technique: 'question_cascade',
      questions: [
        "Can you be more specific about what 'better' or 'more' means? What exact numbers would represent success?",
        "What would 'good' look like with specific, measurable criteria?",
        "How will you know when you've achieved 'significant improvement'? What's the specific target?"
      ],
      examples: [
        {
          before: "Improve customer satisfaction",
          after: "Increase customer satisfaction score from 7.2 to 8.5 on our monthly survey",
          context: "Customer Service",
          explanation: "Added specific baseline, target, and measurement method"
        }
      ],
      successCriteria: [
        "User provides specific numbers and targets",
        "User defines clear measurement criteria"
      ],
      maxAttempts: 2
    };
  }

  private createScopeRespectStrategy(): ReframingStrategy {
    return {
      name: 'Scope Respect Strategy',
      technique: 'outcome_transformation',
      questions: [
        "I understand you want to keep this focused on your team's scope. Let's create an impactful objective within that boundary. What change would you most want to see in your area?",
        "Perfect! Staying within your team's authority makes sense. What outcome would make your team truly proud of their achievement?",
        "Great approach to stay focused on what you can control. What measurable improvement could your team achieve that would create real value?"
      ],
      examples: [
        {
          before: "I just want to focus on my team, not the whole company",
          after: "Transform our team's operational efficiency by reducing process cycle time from 2 days to 4 hours",
          context: "Operations Team",
          explanation: "Respected team scope while creating ambitious, measurable outcome"
        },
        {
          before: "This should stay within our department, not company-wide",
          after: "Elevate our department's customer response time to industry-leading 2-hour resolution",
          context: "Customer Support",
          explanation: "Focused on department-level impact with measurable, ambitious target"
        },
        {
          before: "We don't have authority over the whole organization",
          after: "Achieve 95% on-time delivery within our team's project commitments",
          context: "Product Team",
          explanation: "Stayed within team authority while creating meaningful outcome"
        }
      ],
      successCriteria: [
        "User feels respected and heard regarding scope boundaries",
        "User provides ambitious outcome within their stated scope",
        "User maintains engagement without scope resistance"
      ],
      maxAttempts: 3
    };
  }

  private createSphereOfInfluenceStrategy(): ReframingStrategy {
    return {
      name: 'Sphere of Influence Refinement',
      technique: 'outcome_transformation',
      questions: [
        "This objective seems to depend on factors outside your team's direct control. What could your team measure and influence directly that would drive this outcome?",
        "Rather than depending on [external factor], what outcomes could your team own that make [desired result] more likely?",
        "What can your team control that would increase the probability of [external success]? How would you measure your team's contribution?"
      ],
      examples: [
        {
          before: "Increase customer adoption to 10,000 users by getting customers to choose our product",
          after: "Reduce friction in onboarding flow to achieve 75% activation rate within first 7 days",
          context: "Product Team",
          explanation: "Shifted from uncontrollable customer choice to controllable onboarding experience that influences adoption"
        },
        {
          before: "Achieve 50% market share if the market grows and competitors don't respond",
          after: "Capture 90% of inbound leads through superior conversion experience and 48-hour response time",
          context: "Sales Team",
          explanation: "Focused on controllable lead conversion rather than market dynamics"
        },
        {
          before: "Launch new capability successfully assuming delivery team completes on time",
          after: "Achieve 80% user awareness of new capability through targeted in-app messaging and tutorials",
          context: "Product Marketing",
          explanation: "Owned the awareness and adoption metrics rather than depending on delivery timeline"
        },
        {
          before: "Improve customer satisfaction when support team resolves tickets faster",
          after: "Reduce average resolution time from 24 hours to 4 hours through automation and process optimization",
          context: "Customer Support Operations",
          explanation: "Took ownership of the underlying metric (resolution time) rather than depending on another team"
        }
      ],
      successCriteria: [
        "User identifies outcomes their team can directly control and measure",
        "User removes dependencies on external factors or other teams",
        "User focuses on leading indicators within their sphere of influence",
        "User maintains connection to ultimate business value while owning the path"
      ],
      maxAttempts: 4
    };
  }
}