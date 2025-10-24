// Feature flags for gradual NeuroLeadership rollout
// Allows enabling/disabling features per user or globally

export interface FeatureFlags {
  // Global feature toggles
  enableNeuroLeadership: boolean;
  enableAltitudeTracking: boolean;
  enableMicroPhases: boolean;
  enableHabitFormation: boolean;
  enableARIALearning: boolean;
  enableLearningAnalytics: boolean;

  // Graduated rollout percentages (0-100)
  neuroLeadershipRolloutPercentage: number;

  // User-specific overrides
  userOverrides: Map<string, Partial<FeatureFlags>>;

  // A/B testing
  enableABTesting: boolean;
  controlGroupPercentage: number; // Percentage in control group (no enhancements)
}

class FeatureFlagService {
  private flags: FeatureFlags;

  constructor() {
    // Default configuration - start conservative
    this.flags = {
      // Start with all features disabled for safety
      enableNeuroLeadership: false,
      enableAltitudeTracking: false,
      enableMicroPhases: false,
      enableHabitFormation: false,
      enableARIALearning: false,
      enableLearningAnalytics: false,

      // Gradual rollout: 0% initially
      neuroLeadershipRolloutPercentage: 0,

      // User overrides
      userOverrides: new Map(),

      // A/B testing disabled initially
      enableABTesting: false,
      controlGroupPercentage: 50
    };

    // Load from environment variables if available
    this.loadFromEnvironment();
  }

  private loadFromEnvironment(): void {
    if (process.env.ENABLE_NEUROLEADERSHIP === 'true') {
      this.flags.enableNeuroLeadership = true;
    }

    if (process.env.ENABLE_ALTITUDE_TRACKING === 'true') {
      this.flags.enableAltitudeTracking = true;
    }

    if (process.env.ENABLE_MICRO_PHASES === 'true') {
      this.flags.enableMicroPhases = true;
    }

    if (process.env.ENABLE_HABIT_FORMATION === 'true') {
      this.flags.enableHabitFormation = true;
    }

    if (process.env.ENABLE_ARIA_LEARNING === 'true') {
      this.flags.enableARIALearning = true;
    }

    if (process.env.ENABLE_LEARNING_ANALYTICS === 'true') {
      this.flags.enableLearningAnalytics = true;
    }

    if (process.env.NEUROLEADERSHIP_ROLLOUT_PERCENTAGE) {
      this.flags.neuroLeadershipRolloutPercentage = parseInt(
        process.env.NEUROLEADERSHIP_ROLLOUT_PERCENTAGE,
        10
      );
    }

    if (process.env.ENABLE_AB_TESTING === 'true') {
      this.flags.enableABTesting = true;
    }

    if (process.env.CONTROL_GROUP_PERCENTAGE) {
      this.flags.controlGroupPercentage = parseInt(
        process.env.CONTROL_GROUP_PERCENTAGE,
        10
      );
    }
  }

  /**
   * Check if NeuroLeadership features are enabled for a user
   */
  public isNeuroLeadershipEnabled(userId: string): boolean {
    // Check user-specific override first
    const override = this.flags.userOverrides.get(userId);
    if (override?.enableNeuroLeadership !== undefined) {
      return override.enableNeuroLeadership;
    }

    // Check global toggle
    if (!this.flags.enableNeuroLeadership) {
      return false;
    }

    // Check rollout percentage (deterministic based on userId)
    if (this.flags.neuroLeadershipRolloutPercentage < 100) {
      const userHash = this.hashUserId(userId);
      const userPercentile = userHash % 100;
      if (userPercentile >= this.flags.neuroLeadershipRolloutPercentage) {
        return false;
      }
    }

    // Check A/B testing control group
    if (this.flags.enableABTesting) {
      const userHash = this.hashUserId(userId);
      const isControlGroup = (userHash % 100) < this.flags.controlGroupPercentage;
      if (isControlGroup) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check individual feature flags
   */
  public isAltitudeTrackingEnabled(userId: string): boolean {
    const override = this.flags.userOverrides.get(userId);
    if (override?.enableAltitudeTracking !== undefined) {
      return override.enableAltitudeTracking;
    }
    return this.isNeuroLeadershipEnabled(userId) && this.flags.enableAltitudeTracking;
  }

  public isMicroPhasesEnabled(userId: string): boolean {
    const override = this.flags.userOverrides.get(userId);
    if (override?.enableMicroPhases !== undefined) {
      return override.enableMicroPhases;
    }
    return this.isNeuroLeadershipEnabled(userId) && this.flags.enableMicroPhases;
  }

  public isHabitFormationEnabled(userId: string): boolean {
    const override = this.flags.userOverrides.get(userId);
    if (override?.enableHabitFormation !== undefined) {
      return override.enableHabitFormation;
    }
    return this.isNeuroLeadershipEnabled(userId) && this.flags.enableHabitFormation;
  }

  public isARIALearningEnabled(userId: string): boolean {
    const override = this.flags.userOverrides.get(userId);
    if (override?.enableARIALearning !== undefined) {
      return override.enableARIALearning;
    }
    return this.isNeuroLeadershipEnabled(userId) && this.flags.enableARIALearning;
  }

  public isLearningAnalyticsEnabled(userId: string): boolean {
    const override = this.flags.userOverrides.get(userId);
    if (override?.enableLearningAnalytics !== undefined) {
      return override.enableLearningAnalytics;
    }
    return this.isNeuroLeadershipEnabled(userId) && this.flags.enableLearningAnalytics;
  }

  /**
   * Check if user is in A/B test control group
   */
  public isControlGroup(userId: string): boolean {
    if (!this.flags.enableABTesting) {
      return false;
    }

    const userHash = this.hashUserId(userId);
    return (userHash % 100) < this.flags.controlGroupPercentage;
  }

  /**
   * Get experiment group for user (control or treatment)
   */
  public getExperimentGroup(userId: string): 'control' | 'treatment' {
    return this.isControlGroup(userId) ? 'control' : 'treatment';
  }

  /**
   * Update global flags (admin only)
   */
  public updateGlobalFlags(updates: Partial<FeatureFlags>): void {
    this.flags = { ...this.flags, ...updates };
  }

  /**
   * Enable feature for specific user
   */
  public enableForUser(userId: string, feature: keyof FeatureFlags): void {
    const existing = this.flags.userOverrides.get(userId) || {};
    this.flags.userOverrides.set(userId, {
      ...existing,
      [feature]: true
    });
  }

  /**
   * Disable feature for specific user
   */
  public disableForUser(userId: string, feature: keyof FeatureFlags): void {
    const existing = this.flags.userOverrides.get(userId) || {};
    this.flags.userOverrides.set(userId, {
      ...existing,
      [feature]: false
    });
  }

  /**
   * Get all flags for user (for debugging)
   */
  public getFlagsForUser(userId: string): Record<string, boolean> {
    return {
      neuroLeadership: this.isNeuroLeadershipEnabled(userId),
      altitudeTracking: this.isAltitudeTrackingEnabled(userId),
      microPhases: this.isMicroPhasesEnabled(userId),
      habitFormation: this.isHabitFormationEnabled(userId),
      ariaLearning: this.isARIALearningEnabled(userId),
      learningAnalytics: this.isLearningAnalyticsEnabled(userId),
      controlGroup: this.isControlGroup(userId)
    };
  }

  /**
   * Simple deterministic hash for user ID
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Gradual rollout plan
   */
  public getRolloutPlan(): Array<{phase: number; percentage: number; duration: string}> {
    return [
      { phase: 1, percentage: 0, duration: 'Initial - All disabled' },
      { phase: 2, percentage: 5, duration: 'Week 1 - Internal testing' },
      { phase: 3, percentage: 10, duration: 'Week 2 - Early adopters' },
      { phase: 4, percentage: 25, duration: 'Week 3 - Cautious expansion' },
      { phase: 5, percentage: 50, duration: 'Week 4 - Half rollout' },
      { phase: 6, percentage: 75, duration: 'Week 5 - Majority' },
      { phase: 7, percentage: 100, duration: 'Week 6 - Full rollout' }
    ];
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagService();

// Rollout utilities
export const rollout = {
  /**
   * Phase 1: Enable for internal testing (5%)
   */
  enableInternalTesting: () => {
    featureFlags.updateGlobalFlags({
      enableNeuroLeadership: true,
      enableAltitudeTracking: true,
      enableMicroPhases: true,
      enableHabitFormation: true,
      enableARIALearning: true,
      enableLearningAnalytics: true,
      neuroLeadershipRolloutPercentage: 5
    });
  },

  /**
   * Phase 2: Enable for early adopters (10%)
   */
  enableEarlyAdopters: () => {
    featureFlags.updateGlobalFlags({
      neuroLeadershipRolloutPercentage: 10
    });
  },

  /**
   * Phase 3: Cautious expansion (25%)
   */
  enableCautiousExpansion: () => {
    featureFlags.updateGlobalFlags({
      neuroLeadershipRolloutPercentage: 25
    });
  },

  /**
   * Phase 4: Half rollout (50%)
   */
  enableHalfRollout: () => {
    featureFlags.updateGlobalFlags({
      neuroLeadershipRolloutPercentage: 50
    });
  },

  /**
   * Phase 5: Majority (75%)
   */
  enableMajority: () => {
    featureFlags.updateGlobalFlags({
      neuroLeadershipRolloutPercentage: 75
    });
  },

  /**
   * Phase 6: Full rollout (100%)
   */
  enableFullRollout: () => {
    featureFlags.updateGlobalFlags({
      neuroLeadershipRolloutPercentage: 100
    });
  },

  /**
   * Emergency: Disable all features
   */
  emergencyDisable: () => {
    featureFlags.updateGlobalFlags({
      enableNeuroLeadership: false,
      enableAltitudeTracking: false,
      enableMicroPhases: false,
      enableHabitFormation: false,
      enableARIALearning: false,
      enableLearningAnalytics: false,
      neuroLeadershipRolloutPercentage: 0
    });
  },

  /**
   * Enable A/B testing with 50/50 split
   */
  enableABTesting: () => {
    featureFlags.updateGlobalFlags({
      enableABTesting: true,
      controlGroupPercentage: 50
    });
  }
};