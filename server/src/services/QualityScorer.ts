import {
  ObjectiveScore,
  KeyResultScore,
  OverallScore,
  QualityLevel,
  UserContext,
  ObjectiveScope
} from '../types/conversation';
import { logger } from '../utils/logger';
import {
  performanceMonitor,
  memoize,
  qualityScoringCache,
  measureExecutionTime
} from '../utils/performance';

/**
 * Scope indicators for hierarchical leveling detection
 */
export interface ScopeIndicators {
  // Strategic signals (C-level/Company)
  isMarketPositioning: boolean;
  setsOrganizationalDirection: boolean;
  requiresMultipleDepartments: boolean;

  // Team signals (Manager/Team)
  hasTeamControl: boolean;
  hasMeasurableOutcome: boolean;
  isTacticalExecution: boolean;
  singleTeamFocus: boolean;

  // Warning signals
  requiresCrossDepartment: boolean;
  isActivityDisguised: boolean;
}

/**
 * Dependency type for sphere of influence validation
 */
export interface Dependency {
  type: 'other_team' | 'customer_behavior' | 'market_dynamics' | 'external_factor';
  description: string;
  controllability: 'full' | 'high' | 'medium' | 'low' | 'none';
}

/**
 * Comprehensive quality scoring system for OKRs
 * Implements 5-dimension scoring rubric with real-time feedback
 */
export class QualityScorer {
  private readonly QUALITY_THRESHOLDS = {
    excellent: 90,
    good: 75,
    acceptable: 60,
    needs_work: 40,
    poor: 0
  };

  private readonly ACTIVITY_KEYWORDS = [
    'implement', 'launch', 'complete', 'deliver', 'build', 'create',
    'develop', 'deploy', 'install', 'setup', 'configure', 'write',
    'design', 'plan', 'organize', 'manage', 'coordinate', 'execute'
  ];

  private readonly OUTCOME_KEYWORDS = [
    'increase', 'decrease', 'improve', 'reduce', 'enhance', 'optimize',
    'achieve', 'reach', 'attain', 'realize', 'transform', 'enable',
    'accelerate', 'maximize', 'minimize', 'strengthen', 'expand',
    'establish', 'become', 'drive', 'deliver', 'generate'
  ];

  private readonly INSPIRATION_KEYWORDS = [
    'delight', 'transform', 'revolutionize', 'excel', 'breakthrough',
    'exceptional', 'outstanding', 'remarkable', 'extraordinary', 'amazing',
    'incredible', 'fantastic', 'brilliant', 'innovative', 'pioneering'
  ];

  private readonly VAGUE_WORDS = [
    'better', 'good', 'more', 'less', 'some', 'many', 'few',
    'various', 'several', 'multiple', 'different', 'appropriate',
    'best', 'worst', 'great', 'excellent', 'world', 'everyone', 'everything'
  ];

  /**
   * Score an objective across all dimensions with performance optimization
   */
  public scoreObjective(
    objective: string,
    context?: UserContext,
    scope: ObjectiveScope = 'team'
  ): ObjectiveScore {
    // Generate cache key
    const cacheKey = this.generateCacheKey('objective', objective, context);

    // Check cache first
    const cached = qualityScoringCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const dimensions = {
        outcomeOrientation: this.scoreOutcomeOrientation(objective),
        inspiration: this.scoreInspiration(objective),
        clarity: this.scoreClarity(objective),
        alignment: this.scoreAlignment(objective, context),
        ambition: this.scoreAmbition(objective),
        scopeAppropriateness: this.scoreScopeAppropriateness(objective, scope, context)
      };

      // Calculate weighted overall score with rebalanced weights (added 10% for scope)
      const overall = Math.round(
        dimensions.outcomeOrientation * 0.28 +  // reduced from 0.30
        dimensions.inspiration * 0.18 +         // reduced from 0.20
        dimensions.clarity * 0.14 +             // reduced from 0.15
        dimensions.alignment * 0.14 +           // reduced from 0.15
        dimensions.ambition * 0.16 +            // reduced from 0.20
        dimensions.scopeAppropriateness * 0.10  // NEW dimension
      );

      const feedback = this.generateObjectiveFeedback(dimensions, objective);
      const improvements = this.generateObjectiveImprovements(dimensions, objective);
      const levelDescription = this.getQualityLevel(overall);

      const score: ObjectiveScore = {
        overall,
        dimensions,
        feedback,
        improvements,
        levelDescription
      };

      const processingTime = Date.now() - startTime;

      // Cache the result for future use
      qualityScoringCache.set(cacheKey, score, 600000); // 10 minutes cache

      logger.debug('Objective scored', {
        score: overall,
        dimensions,
        processingTime,
        cached: false
      });

      return score;
    } catch (error) {
      logger.error('Error scoring objective', { error, objective });
      return this.getDefaultObjectiveScore();
    }
  }

  /**
   * Score a key result across all dimensions
   */
  public scoreKeyResult(keyResult: string, context?: UserContext): KeyResultScore {
    const startTime = Date.now();

    try {
      const dimensions = {
        quantification: this.scoreQuantification(keyResult),
        outcomeVsActivity: this.scoreOutcomeVsActivity(keyResult),
        feasibility: this.scoreFeasibility(keyResult),
        independence: this.scoreIndependence(keyResult),
        challenge: this.scoreChallenge(keyResult)
      };

      // Calculate weighted overall score
      const overall = Math.round(
        dimensions.quantification * 0.25 +
        dimensions.outcomeVsActivity * 0.30 +
        dimensions.feasibility * 0.15 +
        dimensions.independence * 0.15 +
        dimensions.challenge * 0.15
      );

      const feedback = this.generateKeyResultFeedback(dimensions, keyResult);
      const improvements = this.generateKeyResultImprovements(dimensions, keyResult);
      const levelDescription = this.getQualityLevel(overall);

      const score: KeyResultScore = {
        overall,
        dimensions,
        feedback,
        improvements,
        levelDescription
      };

      logger.debug('Key result scored', {
        score: overall,
        dimensions,
        processingTime: Date.now() - startTime
      });

      return score;
    } catch (error) {
      logger.error('Error scoring key result', { error, keyResult });
      return this.getDefaultKeyResultScore();
    }
  }

  /**
   * Score overall OKR set quality
   */
  public scoreOverall(
    objectiveScore: ObjectiveScore,
    keyResultScores: KeyResultScore[],
    objective: string,
    keyResults: string[]
  ): OverallScore {
    const coherence = this.scoreCoherence(objective, keyResults);
    const completeness = this.scoreCompleteness(keyResults);
    const balance = this.scoreBalance(keyResults);
    const achievability = this.scoreAchievability(objectiveScore, keyResultScores);

    // Calculate overall score
    const score = Math.round(
      (objectiveScore.overall * 0.4) +
      (keyResultScores.reduce((sum, kr) => sum + kr.overall, 0) / keyResultScores.length * 0.4) +
      (coherence * 0.1) +
      (completeness * 0.05) +
      (balance * 0.025) +
      (achievability * 0.025)
    );

    return {
      score,
      coherence,
      completeness,
      balance,
      achievability,
      levelDescription: this.getQualityLevel(score)
    };
  }

  /**
   * Score outcome orientation (vs activity focus)
   */
  private scoreOutcomeOrientation(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let score = 30; // Start even lower for maximum differentiation

    // Detect activity language (negative) - VERY AGGRESSIVE
    const activityMatches = words.filter(word =>
      this.ACTIVITY_KEYWORDS.some(keyword => word.includes(keyword))
    );
    score -= activityMatches.length * 35;

    // Detect outcome language (positive) - VERY REWARDING
    const outcomeMatches = words.filter(word =>
      this.OUTCOME_KEYWORDS.some(keyword => word.includes(keyword))
    );
    score += outcomeMatches.length * 40;

    // Look for result-oriented patterns - VERY STRONG REWARD
    if (/\b(result|outcome|impact|effect|change|benefit|value)\b/i.test(text)) {
      score += 30;
    }

    // Penalize project/deliverable language - VERY STRONG PENALTY
    if (/\b(project|deliverable|milestone|task|feature|function)\b/i.test(text)) {
      score -= 40;
    }

    // Look for state change indicators - VERY STRONG REWARD
    if (/\b(from|to|by|increase|decrease|improve|reduce)\b/i.test(text)) {
      score += 25;
    }

    // Reward specific outcomes with numbers - STRONGER
    if (/\b(increase|decrease|improve|reduce|achieve|reach).*\d+/.test(text)) {
      score += 20;
    }

    // NEW: Penalize vague outcome language without quantification
    const hasOutcomeWords = /\b(improve|increase|decrease|enhance|optimize)\b/i.test(text);
    const hasNumbers = /\b\d+/.test(text);
    if (hasOutcomeWords && !hasNumbers) {
      score -= 35; // Vague outcome claims without specifics
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score inspirational quality
   */
  private scoreInspiration(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let score = 40; // Start higher - most objectives have some inspiration

    // Look for inspirational language - STRONGER REWARD
    const inspirationMatches = words.filter(word =>
      this.INSPIRATION_KEYWORDS.some(keyword => word.includes(keyword))
    );
    score += inspirationMatches.length * 30;

    // Check for emotional language - STRONGER REWARD
    if (/\b(love|passion|excited|amazing|incredible|fantastic)\b/i.test(text)) {
      score += 20;
    }

    // Look for aspirational language - STRONGER REWARD
    if (/\b(vision|dream|aspire|transform|revolutionize|breakthrough)\b/i.test(text)) {
      score += 35;
    }

    // Check for customer/user focus (inspiring for teams) - STRONGER REWARD
    if (/\b(customer|user|client|people|team|world|society)\b/i.test(text)) {
      score += 20; // Increased from 15
    }

    // Reward leadership and market position - STRONGER
    if (/\b(leader|leadership|first|leading|industry-leading)\b/i.test(text)) {
      score += 25; // Increased from 20
    }

    // NEW: Reward business impact and growth (inspiring for business teams)
    if (/\b(growth|revenue|profit|value|impact|achieve|reach)\b/i.test(text)) {
      score += 20;
    }

    // NEW: Reward strategic thinking
    if (/\b(strategic|enterprise|market|competitive|advantage)\b/i.test(text)) {
      score += 20;
    }

    // NEW: Reward ambitious targets with numbers
    if (/\b\d+%|\bby\s+\d+%/.test(text)) {
      score += 15;
    }

    // Penalize boring/corporate language - STRONGER PENALTY
    if (/\b(process|system|procedure|workflow|documentation)\b/i.test(text)) {
      score -= 20;
    }

    // Penalize overly technical language - STRONGER PENALTY
    if (/\b(API|database|server|framework|architecture|infrastructure)\b/i.test(text)) {
      score -= 15;
    }

    // NEW: Penalize uninspiring vague language
    if (/\b(stuff|things|better|good|do|make)\b/i.test(text)) {
      score -= 25;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score clarity and memorability
   */
  private scoreClarity(text: string): number {
    // Check vagueness first to adjust baseline
    const vague = this.VAGUE_WORDS.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    );
    const isVeryVague = vague.length >= 2; // 2+ vague words = very vague

    let score = isVeryVague ? 50 : 60; // Lower baseline for very vague objectives

    // Word count assessment (sweet spot: 8-15 words, acceptable up to 25)
    const wordCount = text.split(/\s+/).length;
    const hasNumbers = /\b\d+/.test(text);

    // Word count bonuses only for non-vague objectives
    if (wordCount <= 15 && wordCount >= 8 && !isVeryVague) {
      score += 20;
    } else if (wordCount <= 25 && wordCount >= 6 && !isVeryVague) {
      score += 10; // Increased from 5 - still acceptable range
    } else if (wordCount > 30 || wordCount < 4) {
      score -= 30; // Only penalize if very long or very short
    }

    // Check for jargon and complex terms - but allow business/industry terms
    const jargonWords = (text.match(/\b[A-Z]{2,}|\w{15,}/g) || []) // Only 15+ chars
      .filter(word => {
        // Allow common business/industry terms
        const allowed = /\b(sustainability|certification|transformation|optimization|implementation|personalized|satisfaction|infrastructure|architecture|competitive|operational)\b/i;
        return !allowed.test(word);
      });
    score -= jargonWords.length * 10;

    // Penalize vague language - but less harsh if quantified
    score -= vague.length * (hasNumbers ? 5 : 15); // Reduced penalty if quantified

    // Check for specific, concrete language - VERY STRONG REWARD
    if (hasNumbers) {
      score += 20; // Reward numbers/specificity
    }

    // Grammar and readability - STRONG PENALTY
    if (text.includes('  ') || /[^\w\s.,!?-]/.test(text)) {
      score -= 15;
    }

    // Positive: Action-oriented structure with numbers - STRONG REWARD
    if (/\b(increase|decrease|improve|reduce|achieve|reach).*by.*\d+/i.test(text)) {
      score += 15;
    }

    // Penalize extremely vague phrases - EXTREME PENALTY
    if (/\b(stuff|things)\b/i.test(text)) {
      score -= 50; // Massive penalty for "stuff" and "things"
    }

    // NEW: Reward strategic clarity - clear action verbs and structure (selective list)
    if (/\b(achieve|establish|transform|deliver|generate|drive)\b/i.test(text)) {
      score += 10; // Reward clear strategic action verbs
    }

    // Penalize activity-focused objectives even if grammatically clear
    if (/\b(complete|finish|implement|build|create|launch|deploy|execute|conduct|perform|run|do)\b/i.test(text)) {
      score -= 15; // Clear but activity-focused
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score strategic alignment
   */
  private scoreAlignment(text: string, context?: UserContext): number {
    let score = 40; // Start lower for more differentiation

    // Business impact indicators - VERY STRONG REWARD
    if (/\b(revenue|profit|growth|customer|market|business|value|ROI)\b/i.test(text)) {
      score += 30; // Increased from 20
    }

    // Strategic terms - VERY STRONG REWARD
    if (/\b(strategic|competitive|advantage|position|leadership|innovation)\b/i.test(text)) {
      score += 25; // Increased from 15
    }

    // Industry context bonus - STRONGER
    if (context?.industry) {
      const industryKeywords = this.getIndustryKeywords(context.industry);
      const matches = industryKeywords.filter(keyword =>
        new RegExp(`\\b${keyword}\\b`, 'i').test(text)
      );
      score += matches.length * 10; // Increased from 5
    }

    // Function context bonus - STRONGER
    if (context?.function) {
      const functionKeywords = this.getFunctionKeywords(context.function);
      const matches = functionKeywords.filter(keyword =>
        new RegExp(`\\b${keyword}\\b`, 'i').test(text)
      );
      score += matches.length * 10; // Increased from 5
    }

    // Penalize internal/operational focus without business connection
    if (/\b(internal|operational|process|efficiency|automation)\b/i.test(text) &&
        !/\b(customer|revenue|growth|value|impact|business)\b/i.test(text)) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score appropriate ambition level
   */
  private scoreAmbition(text: string): number {
    let score = 50; // Start at middle - most objectives have moderate ambition

    // Look for stretch language - STRONGER REWARD
    if (/\b(stretch|challenging|ambitious|aggressive|breakthrough|transform)\b/i.test(text)) {
      score += 30;
    }

    // Look for specific, measurable stretch - STRONGER REWARD
    const numbers = text.match(/\d+/g);
    if (numbers) {
      // Higher numbers often indicate ambition
      const hasLargeNumbers = numbers.some(n => parseInt(n) >= 50);
      if (hasLargeNumbers) score += 15;

      // NEW: Any numbers show concrete ambition
      score += 10;
    }

    // Look for percentage improvements - VERY STRONG REWARD
    const percentages = text.match(/\d+%/g);
    if (percentages) {
      const highPercentage = percentages.some(p => parseInt(p) >= 25);
      if (highPercentage) score += 30; // Increased from 25
      else score += 15; // Even lower percentages show ambition
    }

    // Reward strategic leadership language - full bonus even without numbers
    if (/\b(leader|leading|first|pioneer|innovate)\b/i.test(text)) {
      score += 30; // Strategic positional ambition
    }

    // Reward excellence language - but needs backing
    if (/\b(excellence)\b/i.test(text)) {
      if (numbers && numbers.length > 0) {
        score += 20;
      } else {
        score += 10; // Vague without specifics
      }
    }

    // Penalize vague "best" claims without specifics
    if (/\b(best)\b/i.test(text) && (!numbers || numbers.length === 0)) {
      score -= 10; // Vague superlative without backing
    }

    // NEW: Reward growth and improvement language
    if (/\b(growth|increase|expand|accelerate|scale)\b/i.test(text)) {
      score += 15;
    }

    // Penalize "maintain" or "keep" language (not ambitious) - STRONGER PENALTY
    if (/\b(maintain|keep|sustain|continue|preserve)\b/i.test(text)) {
      score -= 30;
    }

    // Look for time-bound urgency - STRONGER REWARD
    if (/\b(quickly|rapidly|fast|immediately|urgent|critical)\b/i.test(text)) {
      score += 15;
    }

    // Penalize obviously easy targets - STRONGER PENALTY
    if (/\b(easy|simple|basic|minimum|least|small)\b/i.test(text)) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyze scope indicators from objective text
   */
  private analyzeScopeIndicators(
    objective: string,
    context?: UserContext
  ): ScopeIndicators {
    const text = objective.toLowerCase();

    return {
      // STRATEGIC SIGNALS (C-level/Company)
      isMarketPositioning: /\b(become|establish|dominate|lead|transform industry|market leader|define category)\b/.test(text),
      setsOrganizationalDirection: /\b(company|organization|business model|strategic|vision|mission)\b/.test(text),
      requiresMultipleDepartments: context?.requiresCrossFunctional || /\b(cross-functional|company-wide|organization-wide)\b/.test(text),

      // TEAM SIGNALS (Manager/Team)
      hasTeamControl: !!(context?.teamSize && context.teamSize < 50),
      hasMeasurableOutcome: /\b(increase|reduce|improve|achieve|reach)\b/.test(text) && /\d+%|\d+ [a-z]+/.test(text),
      isTacticalExecution: /\b(our team|our department|our function|our process)\b/.test(text),
      singleTeamFocus: !/\b(cross-team|cross-department|company-wide)\b/.test(text),

      // WARNING SIGNALS
      requiresCrossDepartment: /\b(requires|depends on|needs support from|coordinates with)\b/.test(text),
      isActivityDisguised: /\b(implement|launch|build|deploy|create)\b/.test(text)
    };
  }

  /**
   * Score scope appropriateness (6th dimension for objectives)
   */
  private scoreScopeAppropriateness(
    text: string,
    scope: ObjectiveScope,
    context?: UserContext
  ): number {
    const indicators = this.analyzeScopeIndicators(text, context);
    let score = 70; // Start high - most objectives are reasonably scoped

    // STRATEGIC/COMPANY SCOPE
    if (scope === 'strategic') {
      // Should have strategic signals - STRONGER REWARDS
      if (indicators.isMarketPositioning) score += 25; // Increased from 20
      if (indicators.setsOrganizationalDirection) score += 20; // Increased from 15
      if (indicators.requiresMultipleDepartments) score += 15; // Increased from 10

      // Penalize team-level signals - STRONGER PENALTIES
      if (indicators.isTacticalExecution) score -= 25; // Increased from 20
      if (indicators.singleTeamFocus) score -= 20; // Increased from 15
    }

    // DEPARTMENTAL SCOPE
    else if (scope === 'departmental') {
      // Balance between strategic and tactical - STRONGER REWARDS
      if (indicators.requiresMultipleDepartments) score += 20; // Increased from 15
      if (indicators.hasMeasurableOutcome) score += 15; // Increased from 10

      // Avoid being too strategic or too tactical
      if (indicators.isMarketPositioning) score -= 10;
      if (indicators.isTacticalExecution) score -= 10;
    }

    // TEAM/INITIATIVE/PROJECT SCOPE (the target for mid-level managers)
    else if (['team', 'initiative', 'project'].includes(scope)) {
      // Should be team-controllable and measurable - STRONGER REWARDS
      if (indicators.hasTeamControl) score += 25; // Increased from 20
      if (indicators.hasMeasurableOutcome) score += 25; // Increased from 20
      if (indicators.isTacticalExecution) score += 20; // Increased from 15
      if (indicators.singleTeamFocus) score += 15; // Increased from 10

      // Penalize strategic overreach - but less harsh to allow excellent strategic objectives
      if (indicators.isMarketPositioning) score -= 15; // Reduced from 25
      if (indicators.setsOrganizationalDirection) score -= 10; // Reduced from 20
      if (indicators.requiresMultipleDepartments) score -= 15;
      if (indicators.requiresCrossDepartment) score -= 10;

      // Warn if disguised activity
      if (indicators.isActivityDisguised && !indicators.hasMeasurableOutcome) {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score key result quantification
   */
  private scoreQuantification(text: string): number {
    let score = 0;

    // Check for numbers
    const numbers = text.match(/\d+(\.\d+)?/g) || [];
    if (numbers.length === 0) {
      return 0; // No numbers = no quantification
    }

    score += Math.min(numbers.length * 25, 70); // Up to 70 points for numbers (increased from 60)

    // Check for percentage - STRONGER REWARD
    if (/%/.test(text)) score += 20; // Increased from 15

    // Check for currency - STRONGER REWARD
    if (/[\$£€¥]/.test(text)) score += 20; // Increased from 15

    // Check for baseline (from/to pattern) - STRONGER REWARD
    // Handles: "from X to Y", "from $X to $Y", "X to Y", "X (up from Y)", "(up from X)"
    if (/\b(from|up\s+from)\s+[\$£€¥]?\d+.*to\s+[\$£€¥]?\d+|\d+.*to\s+[\$£€¥]?\d+|\(up\s+from\s+[\$£€¥]?\d+/i.test(text)) {
      score += 25; // Increased from 20
    }

    // Check for specific metrics - STRONGER REWARD
    if (/\b(increase|decrease|improve|reduce).*by\s+\d+/i.test(text)) {
      score += 20; // Increased from 15
    }

    // Check for time bounds - STRONGER REWARD
    if (/\b(by|within|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|\d{4}|week|month|quarter|year)/i.test(text)) {
      score += 15; // Increased from 10
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score outcome vs activity for key results
   */
  private scoreOutcomeVsActivity(text: string): number {
    return this.scoreOutcomeOrientation(text); // Same logic applies
  }

  /**
   * Score measurement feasibility
   */
  private scoreFeasibility(text: string): number {
    let score = 60; // Start with reasonable feasibility

    // Common trackable metrics (positive)
    if (/\b(revenue|sales|users|customers|time|cost|rate|percentage|score|rating|count|number|visits|downloads|signups)\b/i.test(text)) {
      score += 20;
    }

    // Difficult to measure concepts (negative) - including comparative/superlative forms
    if (/\b(happiness|happier|satisfaction|satisfied|morale|culture|quality|better|best|good|great|improved|improve)\b/i.test(text) &&
        !/\b(score|rating|survey|index|measure|metric)\b/i.test(text)) {
      score -= 25;
    }

    // Clear measurement method mentioned (positive)
    if (/\b(survey|score|rating|index|metric|measure|track|monitor|analytics|dashboard)\b/i.test(text)) {
      score += 15;
    }

    // Subjective language without measurement (negative)
    if (/\b(feel|think|believe|seem|appear|roughly|approximately|about)\b/i.test(text)) {
      score -= 15;
    }

    // External dependency indicators (negative)
    if (/\b(market|competition|external|partner|vendor|third-party)\b/i.test(text) &&
        !/\b(share|position|ranking|relative)\b/i.test(text)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score team independence
   */
  private scoreIndependence(text: string): number {
    // Check if quantifiable - unmeasurable KRs have unclear independence
    const hasNumbers = /\d+/.test(text);
    let score = hasNumbers ? 70 : 55; // Lower baseline for vague key results

    // Strong independence indicators
    if (/\b(we|our|team|internal|control|manage|own)\b/i.test(text)) {
      score += 15;
    }

    // External dependency red flags (excluding customer metrics which teams CAN control)
    if (/\b(partner|vendor|third-party|depends\s+on|relies\s+on|requires.*approval)\b/i.test(text)) {
      score -= 20;
    }

    // Customer/client outcomes are actually controllable by the team
    if (/\b(customer|client|user)\s+(satisfaction|engagement|retention|acquisition|experience|success)/i.test(text)) {
      score += 10; // Team controls these outcomes
    }

    // Market/competitive dependencies
    if (/\b(market|competition|industry|economic|external)\b/i.test(text)) {
      score -= 15;
    }

    // Team control indicators - actions the team directly controls
    if (/\b(develop|create|build|improve|optimize|design|implement|increase|decrease|reduce|achieve)\b/i.test(text)) {
      score += 10;
    }

    // Measurement-based metrics are highly controllable
    if (/\bmeasured\s+by\b/i.test(text)) {
      score += 15; // Team controls what they measure
    }

    // Approval/sign-off dependencies
    if (/\b(approve|approval|sign-off|authorize|permission|board|committee)\b/i.test(text)) {
      score -= 25;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score appropriate challenge level for key results
   */
  private scoreChallenge(text: string): number {
    // Check if there are any numbers - no numbers = low challenge
    const hasNumbers = /\d+/.test(text);
    let score = hasNumbers ? 70 : 50; // Lower baseline for vague key results

    // Check for percentage improvements
    const percentages = text.match(/\d+%/g);
    if (percentages) {
      const values = percentages.map(p => parseInt(p));
      const maxPct = Math.max(...values);

      // Challenging ranges: 15-35% is good stretch
      if (maxPct >= 50) score += 15; // Very challenging but realistic
      else if (maxPct >= 30) score += 12; // Challenging
      else if (maxPct >= 20) score += 10; // Good challenge
      else if (maxPct >= 10) score += 5; // Some challenge
      else score -= 10; // Too easy
    }

    // Check for absolute improvements (from X to Y)
    if (/\b(from|up\s+from)\s+[\$£€¥]?\d+.*to\s+[\$£€¥]?\d+/i.test(text)) {
      score += 10; // Shows concrete improvement target
    }

    // Rating/score improvements (e.g., 4.2 to 4.7)
    if (/\d+\.\d+.*to.*\d+\.\d+|\d+\.\d+.*up\s+from.*\d+\.\d+/i.test(text)) {
      score += 10; // Specific improvement in ratings
    }

    // Penalize maintenance language
    if (/\b(maintain|sustain|keep|preserve)\b/i.test(text)) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score coherence between objective and key results
   */
  private scoreCoherence(objective: string, keyResults: string[]): number {
    let score = 50;

    // Extract key terms from objective
    const objectiveWords = objective.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));

    // Check if key results relate to objective themes
    keyResults.forEach(kr => {
      const krWords = kr.toLowerCase().split(/\s+/);
      const commonWords = objectiveWords.filter(word =>
        krWords.some(krWord => krWord.includes(word) || word.includes(krWord))
      );

      if (commonWords.length > 0) {
        score += Math.min(commonWords.length * 5, 15);
      } else {
        score -= 10; // Penalize unrelated KRs
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score completeness (appropriate number of KRs)
   */
  private scoreCompleteness(keyResults: string[]): number {
    const count = keyResults.length;

    if (count >= 3 && count <= 5) return 100; // Optimal
    if (count === 2 || count === 6) return 80; // Acceptable
    if (count === 1 || count === 7) return 60; // Concerning
    return 20; // Too few or too many
  }

  /**
   * Score balance of measurement types
   */
  private scoreBalance(keyResults: string[]): number {
    let leadingCount = 0;
    let laggingCount = 0;

    keyResults.forEach(kr => {
      if (this.isLeadingIndicator(kr)) leadingCount++;
      if (this.isLaggingIndicator(kr)) laggingCount++;
    });

    // Ideal balance: some of both
    if (leadingCount > 0 && laggingCount > 0) return 100;
    if (leadingCount > 0 || laggingCount > 0) return 70;
    return 30; // No clear leading or lagging indicators
  }

  /**
   * Score overall achievability
   */
  private scoreAchievability(objectiveScore: ObjectiveScore, keyResultScores: KeyResultScore[]): number {
    const avgKrScore = keyResultScores.reduce((sum, kr) => sum + kr.overall, 0) / keyResultScores.length;
    const challengeLevel = (objectiveScore.dimensions.ambition +
                           keyResultScores.reduce((sum, kr) => sum + kr.dimensions.challenge, 0) / keyResultScores.length) / 2;

    // Sweet spot: challenging but achievable
    if (challengeLevel >= 60 && challengeLevel <= 80) return 100;
    if (challengeLevel >= 50 && challengeLevel <= 90) return 80;
    return 60;
  }

  /**
   * Generate feedback for objectives
   */
  private generateObjectiveFeedback(dimensions: ObjectiveScore['dimensions'], objective: string): string[] {
    const feedback: string[] = [];

    if (dimensions.outcomeOrientation < 65) {
      feedback.push('Focus on the outcome or result rather than the activity or deliverable');
    }

    if (dimensions.inspiration < 50) {
      feedback.push('Add more inspiring language that energizes the team');
    }

    if (dimensions.clarity < 70) {
      feedback.push('Make the objective clearer and more memorable (aim for 8-15 words)');
    }

    if (dimensions.alignment < 60) {
      feedback.push('Connect more clearly to business value and strategic priorities');
    }

    if (dimensions.ambition < 70) {
      feedback.push('Increase the ambition level - this should be a stretch goal');
    }

    if (dimensions.scopeAppropriateness !== undefined && dimensions.scopeAppropriateness < 60) {
      feedback.push('Ensure this objective matches your team\'s span of control and organizational level');
    }

    return feedback;
  }

  /**
   * Generate improvements for objectives
   */
  private generateObjectiveImprovements(dimensions: ObjectiveScore['dimensions'], objective: string): string[] {
    const improvements: string[] = [];

    if (dimensions.outcomeOrientation < 50) {
      improvements.push('Try asking: "What change will this create?" instead of "What will we build?"');
    }

    if (dimensions.inspiration < 40) {
      improvements.push('Consider what excites you most about achieving this outcome');
    }

    if (dimensions.clarity < 50) {
      improvements.push('Simplify the language and aim for under 15 words');
    }

    if (dimensions.ambition < 50) {
      improvements.push('Add a specific, measurable target that represents meaningful progress');
    }

    if (dimensions.alignment < 50) {
      improvements.push('Connect this to clear business value or strategic priorities');
    }

    if (dimensions.scopeAppropriateness !== undefined && dimensions.scopeAppropriateness < 60) {
      improvements.push('Focus on outcomes your team can directly control and measure - avoid company-wide strategic goals unless you\'re in executive leadership');
    }

    return improvements;
  }

  /**
   * Generate feedback for key results
   */
  private generateKeyResultFeedback(dimensions: KeyResultScore['dimensions'], keyResult: string): string[] {
    const feedback: string[] = [];

    if (dimensions.quantification < 50) {
      feedback.push('Add specific numbers with baseline and target values');
    }

    if (dimensions.outcomeVsActivity < 50) {
      feedback.push('Focus on measuring the outcome/change rather than task completion');
    }

    if (dimensions.feasibility < 60) {
      feedback.push('Ensure this metric is realistically trackable with available data');
    }

    if (dimensions.independence < 60) {
      feedback.push('Focus on metrics your team can directly control and influence');
    }

    if (dimensions.challenge < 60) {
      feedback.push('Make this more challenging - aim for 70% confidence in achievement');
    }

    return feedback;
  }

  /**
   * Generate improvements for key results
   */
  private generateKeyResultImprovements(dimensions: KeyResultScore['dimensions'], keyResult: string): string[] {
    const improvements: string[] = [];

    if (dimensions.quantification < 40) {
      improvements.push('Try: "Increase [metric] from [baseline] to [target] by [date]"');
    }

    if (dimensions.outcomeVsActivity < 40) {
      improvements.push('Ask: "What will change when this task is done?" and measure that instead');
    }

    return improvements;
  }

  /**
   * Determine quality level from score
   */
  private getQualityLevel(score: number): QualityLevel {
    if (score >= this.QUALITY_THRESHOLDS.excellent) return 'excellent';
    if (score >= this.QUALITY_THRESHOLDS.good) return 'good';
    if (score >= this.QUALITY_THRESHOLDS.acceptable) return 'acceptable';
    if (score >= this.QUALITY_THRESHOLDS.needs_work) return 'needs_work';
    return 'poor';
  }

  /**
   * Helper methods
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'an', 'a'];
    return stopWords.includes(word.toLowerCase());
  }

  private isLeadingIndicator(kr: string): boolean {
    return /\b(activity|input|effort|process|action|work|task|meeting|training)\b/i.test(kr);
  }

  private isLaggingIndicator(kr: string): boolean {
    return /\b(result|outcome|revenue|customer|user|satisfaction|score|rating|performance)\b/i.test(kr);
  }

  private getIndustryKeywords(industry: string): string[] {
    const keywords: { [key: string]: string[] } = {
      'technology': ['user', 'customer', 'product', 'innovation', 'digital', 'platform', 'performance'],
      'healthcare': ['patient', 'care', 'quality', 'safety', 'outcome', 'treatment', 'health'],
      'finance': ['customer', 'risk', 'compliance', 'revenue', 'profit', 'investment', 'return'],
      'retail': ['customer', 'sales', 'experience', 'inventory', 'margin', 'loyalty', 'satisfaction'],
      'manufacturing': ['quality', 'efficiency', 'cost', 'safety', 'productivity', 'waste', 'delivery']
    };

    return keywords[industry.toLowerCase()] || [];
  }

  private getFunctionKeywords(func: string): string[] {
    const keywords: { [key: string]: string[] } = {
      'engineering': ['performance', 'quality', 'reliability', 'scalability', 'efficiency', 'automation'],
      'sales': ['revenue', 'pipeline', 'conversion', 'customer', 'growth', 'acquisition'],
      'marketing': ['awareness', 'engagement', 'conversion', 'brand', 'reach', 'acquisition'],
      'operations': ['efficiency', 'cost', 'quality', 'process', 'productivity', 'satisfaction'],
      'hr': ['retention', 'satisfaction', 'engagement', 'performance', 'culture', 'development']
    };

    return keywords[func.toLowerCase()] || [];
  }

  private getDefaultObjectiveScore(): ObjectiveScore {
    return {
      overall: 0,
      dimensions: {
        outcomeOrientation: 0,
        inspiration: 0,
        clarity: 0,
        alignment: 0,
        ambition: 0
      },
      feedback: ['Unable to score this objective. Please try again.'],
      improvements: [],
      levelDescription: 'poor'
    };
  }

  private getDefaultKeyResultScore(): KeyResultScore {
    return {
      overall: 0,
      dimensions: {
        quantification: 0,
        outcomeVsActivity: 0,
        feasibility: 0,
        independence: 0,
        challenge: 0
      },
      feedback: ['Unable to score this key result. Please try again.'],
      improvements: [],
      levelDescription: 'poor'
    };
  }

  /**
   * Calculate overall score for complete OKR set
   */
  public calculateOverallScore(objective: ObjectiveScore, keyResults: KeyResultScore[]): OverallScore {
    if (!objective || !keyResults || keyResults.length === 0) {
      return {
        score: 0,
        coherence: 0,
        completeness: 0,
        balance: 0,
        achievability: 0,
        levelDescription: 'poor'
      };
    }

    // Calculate weighted averages
    const objectiveWeight = 0.4;
    const keyResultsWeight = 0.6;

    const avgKeyResultScore = keyResults.reduce((sum, kr) => sum + kr.overall, 0) / keyResults.length;
    const baseScore = (objective.overall * objectiveWeight) + (avgKeyResultScore * keyResultsWeight);

    // Calculate coherence between objective and key results
    const coherence = this.calculateCoherence(objective, keyResults);

    // Calculate completeness (appropriate number of KRs)
    const completeness = this.calculateCompleteness(keyResults.length);

    // Calculate balance (mix of different types of metrics)
    const balance = this.calculateBalance(keyResults);

    // Calculate achievability (realistic but challenging)
    const achievability = this.calculateAchievability(objective, keyResults);

    // Final score with adjustments
    const finalScore = Math.round(
      baseScore * 0.6 +
      coherence * 0.15 +
      completeness * 0.1 +
      balance * 0.1 +
      achievability * 0.05
    );

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      coherence: Math.round(coherence),
      completeness: Math.round(completeness),
      balance: Math.round(balance),
      achievability: Math.round(achievability),
      levelDescription: this.getQualityLevel(finalScore)
    };
  }

  private calculateCoherence(objective: ObjectiveScore, keyResults: KeyResultScore[]): number {
    // This would analyze how well the KRs measure progress toward the objective
    // For now, return a reasonable default based on quality scores
    const avgQuality = (objective.overall + keyResults.reduce((sum, kr) => sum + kr.overall, 0) / keyResults.length) / 2;
    return Math.min(100, avgQuality + 10);
  }

  private calculateCompleteness(krCount: number): number {
    // Ideal is 2-4 key results
    if (krCount >= 2 && krCount <= 4) return 100;
    if (krCount === 1 || krCount === 5) return 80;
    if (krCount === 6) return 60;
    return Math.max(20, 100 - (krCount * 10));
  }

  private calculateBalance(keyResults: KeyResultScore[]): number {
    // Check for variety in metrics (quantification types)
    const highQuantification = keyResults.filter(kr => kr.dimensions.quantification > 70).length;
    const total = keyResults.length;

    if (total === 0) return 0;

    const balanceRatio = highQuantification / total;
    if (balanceRatio >= 0.6 && balanceRatio <= 0.9) return 100;
    if (balanceRatio >= 0.4) return 80;
    return 60;
  }

  private calculateAchievability(objective: ObjectiveScore, keyResults: KeyResultScore[]): number {
    // Balance of ambition vs feasibility
    const objectiveAmbition = objective.dimensions.ambition;
    const avgFeasibility = keyResults.reduce((sum, kr) => sum + kr.dimensions.feasibility, 0) / keyResults.length;

    // Sweet spot is high ambition (70-90) with good feasibility (60-80)
    if (objectiveAmbition >= 70 && objectiveAmbition <= 90 && avgFeasibility >= 60 && avgFeasibility <= 80) {
      return 100;
    }

    return Math.min(100, (objectiveAmbition + avgFeasibility) / 2);
  }

  /**
   * Generate cache key for scoring operations
   */
  private generateCacheKey(type: string, content: string, context?: UserContext): string {
    const contextHash = context ?
      `${context.industry || 'none'}_${context.function || 'none'}_${context.timeframe || 'none'}` :
      'nocontext';

    // Create a simple hash of the content
    const contentHash = Buffer.from(content).toString('base64').substring(0, 16);

    return `${type}_${contextHash}_${contentHash}`;
  }
}