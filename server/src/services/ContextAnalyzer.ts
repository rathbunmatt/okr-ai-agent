import { ConversationContext, ContextAnalysisResult } from '../types/knowledge';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

/**
 * Analyzes conversation context to identify industry, function, company size, and situation
 */
export class ContextAnalyzer {
  private industryPatterns: Map<string, { keywords: string[], aliases: string[] }>;
  private functionPatterns: Map<string, { keywords: string[], aliases: string[] }>;
  private sizeIndicators: Map<string, { keywords: string[], phrases: string[] }>;
  private situationKeywords: Map<string, string[]>;

  constructor() {
    this.industryPatterns = this.initializeIndustryPatterns();
    this.functionPatterns = this.initializeFunctionPatterns();
    this.sizeIndicators = this.initializeSizeIndicators();
    this.situationKeywords = this.initializeSituationKeywords();
  }

  /**
   * Analyze conversation context and user input to extract business context
   */
  async analyzeContext(
    context: ConversationContext,
    userInput: string
  ): Promise<ContextAnalysisResult> {
    try {
      // Combine all conversation text for analysis
      const allText = this.combineConversationText(context, userInput);

      // Analyze different context dimensions
      const industry = this.analyzeIndustry(allText, context);
      const functionAnalysis = this.analyzeFunction(allText, context);
      const companySize = this.analyzeCompanySize(allText, context);
      const situation = this.analyzeSituation(allText);

      const result: ContextAnalysisResult = {
        industry,
        function: functionAnalysis,
        company_size: companySize,
        situation
      };

      logger.info('Context analysis completed', {
        sessionId: context.sessionId,
        industry: industry.detected,
        function: functionAnalysis.detected,
        companySize: companySize.detected,
        situationKeywords: situation.keywords.length
      });

      return result;

    } catch (error) {
      logger.error('Context analysis failed', {
        error: getErrorMessage(error),
        sessionId: context.sessionId
      });

      // Return empty analysis on error
      return {
        industry: { detected: [], confidence: 0 },
        function: { detected: [], confidence: 0 },
        company_size: { detected: 'startup', confidence: 0 },
        situation: { keywords: [], themes: [] }
      };
    }
  }

  /**
   * Combine all conversation text for comprehensive analysis
   */
  private combineConversationText(context: ConversationContext, userInput: string): string {
    const conversationText = context.messages
      .map(msg => msg.content)
      .join(' ');

    // Add current user input
    const combinedText = `${conversationText} ${userInput}`.toLowerCase();

    // Add explicit context if available
    const explicitContext = [];
    if (context.industry) explicitContext.push(context.industry);
    if (context.function) explicitContext.push(context.function);

    return explicitContext.length > 0
      ? `${combinedText} ${explicitContext.join(' ')}`
      : combinedText;
  }

  /**
   * Analyze industry from conversation content
   */
  private analyzeIndustry(text: string, context: ConversationContext): {
    detected: string[];
    confidence: number;
  } {
    // Start with explicit context if available
    if (context.industry) {
      return {
        detected: [context.industry],
        confidence: 0.95
      };
    }

    const detectedIndustries = new Map<string, number>();

    // Check each industry pattern
    for (const [industry, pattern] of this.industryPatterns.entries()) {
      let score = 0;

      // Check keywords
      for (const keyword of pattern.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * 2;
        }
      }

      // Check aliases (less weight)
      for (const alias of pattern.aliases) {
        const regex = new RegExp(`\\b${alias}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        detectedIndustries.set(industry, score);
      }
    }

    // Sort by score and return top matches
    const sortedIndustries = Array.from(detectedIndustries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([industry]) => industry);

    const confidence = this.calculateConfidence(detectedIndustries, text.length);

    return {
      detected: sortedIndustries,
      confidence
    };
  }

  /**
   * Analyze business function from conversation content
   */
  private analyzeFunction(text: string, context: ConversationContext): {
    detected: string[];
    confidence: number;
  } {
    // Start with explicit context if available
    if (context.function) {
      return {
        detected: [context.function],
        confidence: 0.95
      };
    }

    const detectedFunctions = new Map<string, number>();

    // Check each function pattern
    for (const [func, pattern] of this.functionPatterns.entries()) {
      let score = 0;

      // Check keywords
      for (const keyword of pattern.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * 2;
        }
      }

      // Check aliases
      for (const alias of pattern.aliases) {
        const regex = new RegExp(`\\b${alias}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        detectedFunctions.set(func, score);
      }
    }

    // Sort by score and return top matches
    const sortedFunctions = Array.from(detectedFunctions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([func]) => func);

    const confidence = this.calculateConfidence(detectedFunctions, text.length);

    return {
      detected: sortedFunctions,
      confidence
    };
  }

  /**
   * Analyze company size from conversation content
   */
  private analyzeCompanySize(text: string, context: ConversationContext): {
    detected: 'startup' | 'scale' | 'enterprise';
    confidence: number;
  } {
    // Start with explicit context if available
    if (context.company_size) {
      return {
        detected: context.company_size,
        confidence: 0.95
      };
    }

    const sizeScores = new Map<string, number>();

    // Check each size indicator
    for (const [size, indicators] of this.sizeIndicators.entries()) {
      let score = 0;

      // Check keywords
      for (const keyword of indicators.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * 2;
        }
      }

      // Check phrases
      for (const phrase of indicators.phrases) {
        if (text.includes(phrase)) {
          score += 3;
        }
      }

      sizeScores.set(size, score);
    }

    // Get highest scoring size
    const sortedSizes = Array.from(sizeScores.entries())
      .sort((a, b) => b[1] - a[1]);

    const topSize = sortedSizes[0];
    const confidence = topSize[1] > 0 ? Math.min(0.8, topSize[1] / 10) : 0.3; // Default to low confidence

    return {
      detected: (topSize[0] as 'startup' | 'scale' | 'enterprise') || 'startup',
      confidence
    };
  }

  /**
   * Analyze business situation and themes
   */
  private analyzeSituation(text: string): {
    keywords: string[];
    themes: string[];
  } {
    const foundKeywords: string[] = [];
    const themes = new Set<string>();

    // Check situation keywords
    for (const [theme, keywords] of this.situationKeywords.entries()) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(text)) {
          foundKeywords.push(keyword);
          themes.add(theme);
        }
      }
    }

    return {
      keywords: [...new Set(foundKeywords)], // Remove duplicates
      themes: Array.from(themes)
    };
  }

  /**
   * Calculate confidence score based on matches and text length
   */
  private calculateConfidence(matches: Map<string, number>, textLength: number): number {
    if (matches.size === 0) return 0;

    const maxScore = Math.max(...Array.from(matches.values()));
    const totalScore = Array.from(matches.values()).reduce((sum, score) => sum + score, 0);

    // Normalize based on text length (more text = higher confidence needed)
    const lengthFactor = Math.min(1.0, textLength / 1000);
    const scoreFactor = Math.min(1.0, maxScore / 5);

    return Math.round((scoreFactor * lengthFactor) * 100) / 100;
  }

  /**
   * Initialize industry detection patterns
   */
  private initializeIndustryPatterns(): Map<string, { keywords: string[], aliases: string[] }> {
    return new Map([
      ['technology', {
        keywords: ['software', 'saas', 'platform', 'api', 'cloud', 'tech', 'digital', 'app', 'mobile', 'web'],
        aliases: ['startup', 'fintech', 'edtech', 'healthtech', 'ai', 'ml', 'artificial intelligence']
      }],
      ['retail', {
        keywords: ['retail', 'ecommerce', 'e-commerce', 'store', 'shopping', 'marketplace', 'consumer'],
        aliases: ['dtc', 'direct-to-consumer', 'omnichannel', 'merchandising']
      }],
      ['financial_services', {
        keywords: ['bank', 'banking', 'finance', 'financial', 'investment', 'insurance', 'lending'],
        aliases: ['finserv', 'wealth management', 'payments', 'trading']
      }],
      ['healthcare', {
        keywords: ['healthcare', 'health', 'medical', 'hospital', 'clinic', 'pharma', 'pharmaceutical'],
        aliases: ['biotech', 'medtech', 'telemedicine', 'digital health']
      }],
      ['manufacturing', {
        keywords: ['manufacturing', 'factory', 'production', 'industrial', 'automotive', 'aerospace'],
        aliases: ['supply chain', 'logistics', 'operations']
      }],
      ['professional_services', {
        keywords: ['consulting', 'services', 'agency', 'legal', 'accounting', 'marketing'],
        aliases: ['professional services', 'consulting firm', 'service provider']
      }]
    ]);
  }

  /**
   * Initialize function detection patterns
   */
  private initializeFunctionPatterns(): Map<string, { keywords: string[], aliases: string[] }> {
    return new Map([
      ['product', {
        keywords: ['product', 'features', 'roadmap', 'user', 'customer', 'ux', 'design'],
        aliases: ['product management', 'product manager', 'pm', 'user experience']
      }],
      ['engineering', {
        keywords: ['engineering', 'development', 'code', 'technical', 'architecture', 'infrastructure'],
        aliases: ['software engineering', 'dev', 'developer', 'engineer', 'backend', 'frontend']
      }],
      ['sales', {
        keywords: ['sales', 'revenue', 'deals', 'customers', 'pipeline', 'quota', 'selling'],
        aliases: ['sales team', 'account executive', 'business development']
      }],
      ['marketing', {
        keywords: ['marketing', 'campaign', 'leads', 'brand', 'content', 'advertising', 'promotion'],
        aliases: ['demand generation', 'growth marketing', 'digital marketing']
      }],
      ['customer_success', {
        keywords: ['customer success', 'retention', 'churn', 'satisfaction', 'support', 'onboarding'],
        aliases: ['cs', 'customer experience', 'account management']
      }],
      ['operations', {
        keywords: ['operations', 'process', 'efficiency', 'workflow', 'automation', 'ops'],
        aliases: ['business operations', 'operational excellence', 'process improvement']
      }],
      ['finance', {
        keywords: ['finance', 'budget', 'cost', 'roi', 'margin', 'profit', 'accounting'],
        aliases: ['financial', 'fp&a', 'controller', 'cfo']
      }],
      ['hr', {
        keywords: ['hr', 'human resources', 'hiring', 'talent', 'recruiting', 'employees', 'team'],
        aliases: ['people ops', 'talent acquisition', 'people team']
      }]
    ]);
  }

  /**
   * Initialize company size indicators
   */
  private initializeSizeIndicators(): Map<string, { keywords: string[], phrases: string[] }> {
    return new Map([
      ['startup', {
        keywords: ['startup', 'seed', 'early', 'founding', 'mvp', 'pivot', 'fundraising'],
        phrases: ['small team', 'just launched', 'pre-revenue', 'finding product-market fit']
      }],
      ['scale', {
        keywords: ['scaling', 'growth', 'series', 'expanding', 'hypergrowth', 'scaling up'],
        phrases: ['rapid growth', 'scaling challenges', 'growing team', 'expanding market']
      }],
      ['enterprise', {
        keywords: ['enterprise', 'corporation', 'fortune', 'established', 'mature', 'global'],
        phrases: ['large organization', 'multiple departments', 'enterprise customers', 'global presence']
      }]
    ]);
  }

  /**
   * Initialize situation keywords by theme
   */
  private initializeSituationKeywords(): Map<string, string[]> {
    return new Map([
      ['growth', ['growth', 'expand', 'scale', 'increase', 'accelerate', 'boost', 'grow']],
      ['efficiency', ['efficiency', 'optimize', 'streamline', 'automate', 'reduce', 'improve', 'faster']],
      ['quality', ['quality', 'satisfaction', 'experience', 'reliability', 'performance', 'excellence']],
      ['innovation', ['innovation', 'new', 'launch', 'develop', 'create', 'build', 'innovative']],
      ['competitive', ['competitive', 'competition', 'market share', 'advantage', 'differentiation']],
      ['retention', ['retention', 'churn', 'loyalty', 'engagement', 'satisfaction', 'lifetime value']],
      ['cost_optimization', ['cost', 'budget', 'expense', 'savings', 'efficiency', 'reduce', 'optimize']],
      ['market_expansion', ['market', 'expansion', 'new market', 'international', 'geographic', 'segment']],
      ['digital_transformation', ['digital', 'transformation', 'modernize', 'technology', 'automation', 'cloud']]
    ]);
  }

  /**
   * Update patterns based on successful identifications
   */
  updatePatterns(industry?: string, func?: string, keywords?: string[]): void {
    // This could be used for machine learning improvements in the future
    logger.info('Context patterns updated', { industry, func, keywords: keywords?.length });
  }
}