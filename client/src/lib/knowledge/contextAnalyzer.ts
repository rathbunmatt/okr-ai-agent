import type { ConversationContext, ContextAnalysisResult } from './types';

interface IndustryKeywords {
  [key: string]: {
    keywords: string[];
    phrases: string[];
    weight: number;
  };
}

interface FunctionKeywords {
  [key: string]: {
    keywords: string[];
    phrases: string[];
    weight: number;
  };
}

export class ContextAnalyzer {
  private industryKeywords: IndustryKeywords = {
    technology: {
      keywords: ['software', 'app', 'platform', 'SaaS', 'API', 'cloud', 'digital', 'AI', 'ML', 'data', 'analytics', 'mobile', 'web', 'startup', 'tech'],
      phrases: ['machine learning', 'artificial intelligence', 'software as a service', 'user experience', 'product development', 'software development'],
      weight: 1.0
    },
    healthcare: {
      keywords: ['patient', 'medical', 'hospital', 'clinic', 'healthcare', 'pharma', 'clinical', 'treatment', 'diagnosis', 'therapy', 'FDA', 'compliance'],
      phrases: ['patient care', 'clinical trials', 'medical device', 'healthcare provider', 'patient outcomes', 'medical records'],
      weight: 1.0
    },
    financial_services: {
      keywords: ['banking', 'insurance', 'investment', 'financial', 'payment', 'credit', 'loan', 'trading', 'compliance', 'risk', 'regulatory'],
      phrases: ['financial services', 'wealth management', 'investment banking', 'credit score', 'regulatory compliance', 'risk management'],
      weight: 1.0
    },
    retail: {
      keywords: ['retail', 'ecommerce', 'shopping', 'store', 'inventory', 'merchandise', 'supply', 'logistics', 'fulfillment', 'consumer'],
      phrases: ['supply chain', 'customer experience', 'retail store', 'online shopping', 'inventory management'],
      weight: 1.0
    },
    manufacturing: {
      keywords: ['manufacturing', 'production', 'factory', 'assembly', 'quality', 'supply', 'logistics', 'operations', 'machinery', 'industrial'],
      phrases: ['supply chain', 'quality control', 'production line', 'manufacturing process', 'industrial automation'],
      weight: 1.0
    }
  };

  private functionKeywords: FunctionKeywords = {
    product: {
      keywords: ['product', 'feature', 'user', 'customer', 'UX', 'UI', 'design', 'roadmap', 'backlog', 'sprint', 'agile', 'MVP'],
      phrases: ['product management', 'user experience', 'product development', 'feature development', 'product roadmap'],
      weight: 1.0
    },
    engineering: {
      keywords: ['development', 'coding', 'programming', 'architecture', 'deployment', 'infrastructure', 'database', 'API', 'backend', 'frontend'],
      phrases: ['software development', 'system architecture', 'code deployment', 'technical debt', 'infrastructure management'],
      weight: 1.0
    },
    sales: {
      keywords: ['sales', 'revenue', 'pipeline', 'leads', 'prospects', 'deals', 'quota', 'CRM', 'conversion', 'acquisition'],
      phrases: ['sales pipeline', 'lead generation', 'customer acquisition', 'sales process', 'revenue growth'],
      weight: 1.0
    },
    marketing: {
      keywords: ['marketing', 'brand', 'campaign', 'advertising', 'promotion', 'content', 'social', 'SEO', 'leads', 'awareness'],
      phrases: ['digital marketing', 'content marketing', 'brand awareness', 'lead generation', 'marketing campaign'],
      weight: 1.0
    },
    customer_success: {
      keywords: ['customer', 'support', 'satisfaction', 'retention', 'churn', 'onboarding', 'success', 'adoption', 'engagement'],
      phrases: ['customer success', 'customer support', 'customer satisfaction', 'user onboarding', 'customer retention'],
      weight: 1.0
    },
    operations: {
      keywords: ['operations', 'process', 'efficiency', 'workflow', 'automation', 'optimization', 'cost', 'quality', 'performance'],
      phrases: ['business operations', 'process improvement', 'operational efficiency', 'cost optimization', 'quality assurance'],
      weight: 1.0
    }
  };

  private companySizeIndicators = {
    startup: {
      keywords: ['startup', 'early-stage', 'seed', 'Series A', 'MVP', 'launch', 'bootstrap', 'founder'],
      phrases: ['early stage', 'just launched', 'small team', 'getting started'],
      employee_ranges: [1, 50]
    },
    scale: {
      keywords: ['growing', 'scaling', 'expansion', 'Series B', 'Series C', 'growth', 'scale-up'],
      phrases: ['scaling up', 'rapid growth', 'expanding team', 'growing company'],
      employee_ranges: [51, 500]
    },
    enterprise: {
      keywords: ['enterprise', 'large', 'Fortune', 'corporation', 'multinational', 'established', 'mature'],
      phrases: ['large company', 'enterprise organization', 'established business', 'Fortune 500'],
      employee_ranges: [501, 10000]
    }
  };

  analyzeContext(context: ConversationContext): ContextAnalysisResult {
    const allText = this.extractAllText(context);

    return {
      industry: this.analyzeIndustry(allText),
      function: this.analyzeFunction(allText),
      company_size: this.analyzeCompanySize(allText),
      situation: this.analyzeSituation(allText)
    };
  }

  private extractAllText(context: ConversationContext): string {
    const messageText = context.messages
      .map(m => m.content)
      .join(' ');

    const okrText = context.currentOKRs
      .map(okr => `${okr.objective || ''} ${okr.key_results.join(' ')}`)
      .join(' ');

    return `${messageText} ${okrText}`.toLowerCase();
  }

  private analyzeIndustry(text: string): { detected: string[]; confidence: number } {
    const scores: { [key: string]: number } = {};

    for (const [industry, config] of Object.entries(this.industryKeywords)) {
      let score = 0;

      // Check keywords
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * config.weight;
        }
      }

      // Check phrases (higher weight)
      for (const phrase of config.phrases) {
        const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * config.weight * 2;
        }
      }

      scores[industry] = score;
    }

    const sortedIndustries = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    const detected = sortedIndustries.map(([industry]) => industry);
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const topScore = sortedIndustries[0]?.[1] || 0;
    const confidence = totalScore > 0 ? Math.min(topScore / totalScore, 1) : 0;

    return {
      detected,
      confidence
    };
  }

  private analyzeFunction(text: string): { detected: string[]; confidence: number } {
    const scores: { [key: string]: number } = {};

    for (const [func, config] of Object.entries(this.functionKeywords)) {
      let score = 0;

      // Check keywords
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * config.weight;
        }
      }

      // Check phrases (higher weight)
      for (const phrase of config.phrases) {
        const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * config.weight * 2;
        }
      }

      scores[func] = score;
    }

    const sortedFunctions = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    const detected = sortedFunctions.map(([func]) => func);
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const topScore = sortedFunctions[0]?.[1] || 0;
    const confidence = totalScore > 0 ? Math.min(topScore / totalScore, 1) : 0;

    return {
      detected,
      confidence
    };
  }

  private analyzeCompanySize(text: string): { detected: 'startup' | 'scale' | 'enterprise'; confidence: number } {
    const scores: { [key: string]: number } = {};

    for (const [size, config] of Object.entries(this.companySizeIndicators)) {
      let score = 0;

      // Check keywords
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      // Check phrases
      for (const phrase of config.phrases) {
        const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length * 2;
        }
      }

      scores[size] = score;
    }

    const sortedSizes = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);

    const detected = (sortedSizes[0]?.[0] || 'scale') as 'startup' | 'scale' | 'enterprise';
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const topScore = sortedSizes[0]?.[1] || 0;
    const confidence = totalScore > 0 ? topScore / Math.max(totalScore, 1) : 0.5;

    return {
      detected,
      confidence
    };
  }

  private analyzeSituation(text: string): { keywords: string[]; themes: string[] } {
    const situationKeywords = [
      'improve', 'increase', 'reduce', 'grow', 'scale', 'launch', 'build',
      'enhance', 'optimize', 'transform', 'accelerate', 'achieve', 'deliver'
    ];

    const themeKeywords = {
      growth: ['grow', 'increase', 'expand', 'scale', 'accelerate', 'revenue', 'customers'],
      efficiency: ['reduce', 'optimize', 'improve', 'streamline', 'automate', 'cost', 'time'],
      quality: ['enhance', 'improve', 'better', 'excellence', 'satisfaction', 'experience'],
      innovation: ['new', 'innovative', 'create', 'develop', 'launch', 'build', 'next']
    };

    const foundKeywords = situationKeywords.filter(keyword =>
      text.includes(keyword)
    );

    const themes = Object.entries(themeKeywords)
      .map(([theme, keywords]) => {
        const score = keywords.reduce((sum, keyword) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = text.match(regex);
          return sum + (matches?.length || 0);
        }, 0);
        return { theme, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ theme }) => theme);

    return {
      keywords: foundKeywords,
      themes
    };
  }
}