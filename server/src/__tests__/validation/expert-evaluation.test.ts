/**
 * Expert Evaluation Tests: Quality Scoring Validation
 * Validates quality scoring accuracy against expert human evaluations
 */

import { describe, test, expect } from '@jest/globals';
import { QualityScorer } from '../../services/QualityScorer';
import { AntiPatternDetector } from '../../services/AntiPatternDetector';

describe('Expert Evaluation and Quality Validation', () => {
  const qualityScorer = new QualityScorer();
  const antiPatternDetector = new AntiPatternDetector();

  describe('Objective Quality Scoring vs Expert Assessment', () => {
    test('should match expert evaluation for excellent objectives', () => {
      const excellentObjectives = [
        {
          text: 'Increase monthly recurring revenue by 35% through improved customer retention and strategic new customer acquisition in the enterprise segment',
          expertScore: 92,
          expertFeedback: 'Excellent outcome focus, specific target, clear business impact',
          dimensions: {
            outcomeOrientation: 95,
            inspiration: 88,
            clarity: 90,
            alignment: 92,
            ambition: 85
          }
        },
        {
          text: 'Transform customer experience to achieve industry-leading Net Promoter Score of 70+ by delivering personalized, proactive support across all touchpoints',
          expertScore: 89,
          expertFeedback: 'Strong outcome focus with specific target and customer-centric approach',
          dimensions: {
            outcomeOrientation: 92,
            inspiration: 90,
            clarity: 85,
            alignment: 88,
            ambition: 88
          }
        },
        {
          text: 'Establish market leadership in sustainability by achieving carbon neutrality and becoming the first company in our industry to receive B-Corp certification',
          expertScore: 91,
          expertFeedback: 'Highly inspirational with clear business and social impact',
          dimensions: {
            outcomeOrientation: 88,
            inspiration: 95,
            clarity: 90,
            alignment: 85,
            ambition: 92
          }
        }
      ];

      excellentObjectives.forEach((objective, index) => {
        const result = qualityScorer.scoreObjective(objective.text, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });

        // Overall score should be within 10 points of expert assessment
        expect(result.overall).toBeGreaterThanOrEqual(objective.expertScore - 10);
        expect(result.overall).toBeLessThanOrEqual(objective.expertScore + 10);

        // Individual dimensions should be reasonably close
        Object.entries(objective.dimensions).forEach(([dimension, expertScore]) => {
          const systemScore = (result.dimensions as any)[dimension];
          expect(systemScore).toBeGreaterThanOrEqual(expertScore - 15);
          expect(systemScore).toBeLessThanOrEqual(expertScore + 15);
        });

        // Should have minimal feedback for excellent objectives
        expect(result.feedback.length).toBeLessThanOrEqual(2);

        console.log(`Excellent Objective ${index + 1}:
          Expert: ${objective.expertScore}, System: ${result.overall}
          Difference: ${Math.abs(objective.expertScore - result.overall)} points`);
      });
    });

    test('should match expert evaluation for poor objectives', () => {
      const poorObjectives = [
        {
          text: 'Do marketing stuff and make things better',
          expertScore: 22,
          expertFeedback: 'Extremely vague, no measurable outcomes, lacks clarity and ambition',
          dimensions: {
            outcomeOrientation: 15,
            inspiration: 20,
            clarity: 10,
            alignment: 25,
            ambition: 30
          }
        },
        {
          text: 'Complete all development tasks on time and within budget',
          expertScore: 31,
          expertFeedback: 'Activity-focused, binary outcome, lacks business impact',
          dimensions: {
            outcomeOrientation: 20,
            inspiration: 25,
            clarity: 45,
            alignment: 35,
            ambition: 30
          }
        },
        {
          text: 'Be the best company in the world',
          expertScore: 28,
          expertFeedback: 'Extremely vague, unmeasurable, lacks actionable direction',
          dimensions: {
            outcomeOrientation: 25,
            inspiration: 40,
            clarity: 5,
            alignment: 20,
            ambition: 50
          }
        }
      ];

      poorObjectives.forEach((objective, index) => {
        const result = qualityScorer.scoreObjective(objective.text, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });

        // Overall score should be within 15 points of expert assessment
        expect(result.overall).toBeGreaterThanOrEqual(objective.expertScore - 15);
        expect(result.overall).toBeLessThanOrEqual(objective.expertScore + 15);

        // Should have substantial feedback for poor objectives
        expect(result.feedback.length).toBeGreaterThanOrEqual(2);
        expect(result.improvements.length).toBeGreaterThanOrEqual(2);

        // Individual dimensions validation
        Object.entries(objective.dimensions).forEach(([dimension, expertScore]) => {
          const systemScore = (result.dimensions as any)[dimension];

          // Allow wider margin for poor objectives due to floor effects
          expect(systemScore).toBeGreaterThanOrEqual(Math.max(0, expertScore - 20));
          expect(systemScore).toBeLessThanOrEqual(expertScore + 20);
        });

        console.log(`Poor Objective ${index + 1}:
          Expert: ${objective.expertScore}, System: ${result.overall}
          Difference: ${Math.abs(objective.expertScore - result.overall)} points
          Feedback items: ${result.feedback.length}`);
      });
    });

    test('should match expert evaluation for moderate objectives', () => {
      const moderateObjectives = [
        {
          text: 'Increase customer satisfaction by improving our product features and support services',
          expertScore: 58,
          expertFeedback: 'Good intent but needs specific metrics and clearer outcome focus',
          dimensions: {
            outcomeOrientation: 65,
            inspiration: 55,
            clarity: 50,
            alignment: 60,
            ambition: 60
          }
        },
        {
          text: 'Launch new mobile app to increase user engagement',
          expertScore: 45,
          expertFeedback: 'Activity-focused, needs outcome metrics and business impact clarity',
          dimensions: {
            outcomeOrientation: 35,
            inspiration: 50,
            clarity: 60,
            alignment: 55,
            ambition: 45
          }
        },
        {
          text: 'Reduce operational costs by 15% while maintaining service quality',
          expertScore: 72,
          expertFeedback: 'Clear target with good business focus, could be more inspirational',
          dimensions: {
            outcomeOrientation: 80,
            inspiration: 50,
            clarity: 85,
            alignment: 75,
            ambition: 70
          }
        }
      ];

      moderateObjectives.forEach((objective, index) => {
        const result = qualityScorer.scoreObjective(objective.text, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });

        // Overall score should be within 12 points of expert assessment
        expect(result.overall).toBeGreaterThanOrEqual(objective.expertScore - 12);
        expect(result.overall).toBeLessThanOrEqual(objective.expertScore + 12);

        // Should have moderate amount of feedback
        expect(result.feedback.length).toBeGreaterThanOrEqual(1);
        expect(result.feedback.length).toBeLessThanOrEqual(4);

        console.log(`Moderate Objective ${index + 1}:
          Expert: ${objective.expertScore}, System: ${result.overall}
          Difference: ${Math.abs(objective.expertScore - result.overall)} points`);
      });
    });
  });

  describe('Key Result Quality Scoring vs Expert Assessment', () => {
    test('should accurately score excellent key results', () => {
      const excellentKeyResults = [
        {
          text: 'Increase monthly active users from 50K to 75K (50% growth) measured by unique daily logins',
          expertScore: 88,
          parentObjective: 'Improve user engagement and product adoption',
          dimensions: {
            quantification: 95,
            outcomeVsActivity: 85,
            feasibility: 85,
            independence: 90,
            challenge: 80
          }
        },
        {
          text: 'Reduce customer acquisition cost from $120 to $85 through optimized marketing channels',
          expertScore: 91,
          parentObjective: 'Improve marketing efficiency and profitability',
          dimensions: {
            quantification: 95,
            outcomeVsActivity: 90,
            feasibility: 88,
            independence: 92,
            challenge: 85
          }
        },
        {
          text: 'Achieve customer satisfaction score of 4.7/5.0 (up from 4.2) based on post-purchase surveys',
          expertScore: 86,
          parentObjective: 'Enhance customer experience and loyalty',
          dimensions: {
            quantification: 90,
            outcomeVsActivity: 88,
            feasibility: 85,
            independence: 85,
            challenge: 82
          }
        }
      ];

      excellentKeyResults.forEach((keyResult, index) => {
        const result = qualityScorer.scoreKeyResult(keyResult.text, keyResult.parentObjective, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });

        // Overall score should be within 10 points of expert assessment
        expect(result.overall).toBeGreaterThanOrEqual(keyResult.expertScore - 10);
        expect(result.overall).toBeLessThanOrEqual(keyResult.expertScore + 10);

        // Individual dimensions should be close
        Object.entries(keyResult.dimensions).forEach(([dimension, expertScore]) => {
          const systemScore = (result.dimensions as any)[dimension];
          expect(systemScore).toBeGreaterThanOrEqual(expertScore - 15);
          expect(systemScore).toBeLessThanOrEqual(expertScore + 15);
        });

        console.log(`Excellent Key Result ${index + 1}:
          Expert: ${keyResult.expertScore}, System: ${result.overall}
          Difference: ${Math.abs(keyResult.expertScore - result.overall)} points`);
      });
    });

    test('should accurately score poor key results', () => {
      const poorKeyResults = [
        {
          text: 'Make users happier',
          expertScore: 18,
          parentObjective: 'Improve user satisfaction',
          dimensions: {
            quantification: 5,
            outcomeVsActivity: 30,
            feasibility: 20,
            independence: 25,
            challenge: 10
          }
        },
        {
          text: 'Launch the new feature successfully',
          expertScore: 25,
          parentObjective: 'Improve product capabilities',
          dimensions: {
            quantification: 10,
            outcomeVsActivity: 15,
            feasibility: 40,
            independence: 35,
            challenge: 25
          }
        },
        {
          text: 'Complete all development tasks on time',
          expertScore: 32,
          parentObjective: 'Deliver product improvements',
          dimensions: {
            quantification: 20,
            outcomeVsActivity: 25,
            feasibility: 45,
            independence: 40,
            challenge: 30
          }
        }
      ];

      poorKeyResults.forEach((keyResult, index) => {
        const result = qualityScorer.scoreKeyResult(keyResult.text, keyResult.parentObjective, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });

        // Overall score should be within 15 points of expert assessment
        expect(result.overall).toBeGreaterThanOrEqual(keyResult.expertScore - 15);
        expect(result.overall).toBeLessThanOrEqual(keyResult.expertScore + 15);

        // Should have substantial feedback for poor key results
        expect(result.feedback.length).toBeGreaterThanOrEqual(2);

        console.log(`Poor Key Result ${index + 1}:
          Expert: ${keyResult.expertScore}, System: ${result.overall}
          Difference: ${Math.abs(keyResult.expertScore - result.overall)} points`);
      });
    });
  });

  describe('Anti-Pattern Detection Accuracy', () => {
    test('should achieve high accuracy on expert-validated anti-pattern examples', () => {
      const antiPatternCases = [
        {
          category: 'activity_focused',
          examples: [
            {
              text: 'Launch 5 marketing campaigns and update the website',
              expertConfidence: 0.95,
              expectedPatterns: ['activity_focused']
            },
            {
              text: 'Implement new CRM system and train the sales team',
              expertConfidence: 0.90,
              expectedPatterns: ['activity_focused']
            },
            {
              text: 'Conduct 20 customer interviews and analyze feedback',
              expertConfidence: 0.85,
              expectedPatterns: ['activity_focused']
            }
          ]
        },
        {
          category: 'binary_thinking',
          examples: [
            {
              text: 'Successfully complete the project',
              expertConfidence: 0.92,
              expectedPatterns: ['binary_thinking']
            },
            {
              text: 'Achieve operational excellence',
              expertConfidence: 0.88,
              expectedPatterns: ['binary_thinking', 'vague_outcome']
            },
            {
              text: 'Improve customer satisfaction',
              expertConfidence: 0.85,
              expectedPatterns: ['binary_thinking', 'vague_outcome']
            }
          ]
        },
        {
          category: 'kitchen_sink',
          examples: [
            {
              text: 'Increase revenue, improve customer satisfaction, reduce costs, launch new products, optimize operations, and enhance team performance',
              expertConfidence: 0.98,
              expectedPatterns: ['kitchen_sink']
            },
            {
              text: 'Be the best company while growing fast, making customers happy, and keeping costs low',
              expertConfidence: 0.95,
              expectedPatterns: ['kitchen_sink', 'vague_outcome']
            }
          ]
        },
        {
          category: 'vanity_metrics',
          examples: [
            {
              text: 'Increase social media followers by 10,000',
              expertConfidence: 0.87,
              expectedPatterns: ['vanity_metrics']
            },
            {
              text: 'Achieve 1 million website page views',
              expertConfidence: 0.83,
              expectedPatterns: ['vanity_metrics']
            }
          ]
        }
      ];

      let totalTests = 0;
      let correctDetections = 0;
      let confidenceErrors = 0;

      antiPatternCases.forEach((category) => {
        category.examples.forEach((example) => {
          totalTests++;

          const result = antiPatternDetector.detectPatterns(example.text);

          // Check if expected patterns were detected
          example.expectedPatterns.forEach((expectedPattern) => {
            const detectedPattern = result.patterns.find(p => p.type === expectedPattern);

            if (detectedPattern) {
              correctDetections++;

              // Check confidence level accuracy
              const confidenceDiff = Math.abs(detectedPattern.confidence - example.expertConfidence);
              if (confidenceDiff <= 0.2) { // Within 20% confidence
                // Good confidence estimate
              } else {
                confidenceErrors++;
              }
            }
          });

          console.log(`Pattern Detection for "${example.text.substring(0, 50)}...":
            Expected: ${example.expectedPatterns.join(', ')}
            Detected: ${result.patterns.map(p => `${p.type}(${p.confidence.toFixed(2)})`).join(', ')}
            Expert Confidence: ${example.expertConfidence}`);
        });
      });

      const accuracy = correctDetections / totalTests;
      const confidenceAccuracy = (totalTests - confidenceErrors) / totalTests;

      console.log(`Anti-Pattern Detection Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`Confidence Estimation Accuracy: ${(confidenceAccuracy * 100).toFixed(1)}%`);

      // Should achieve high accuracy
      expect(accuracy).toBeGreaterThanOrEqual(0.85); // 85% accuracy minimum
      expect(confidenceAccuracy).toBeGreaterThanOrEqual(0.70); // 70% confidence accuracy
    });

    test('should have low false positive rate on high-quality objectives', () => {
      const highQualityObjectives = [
        'Increase monthly recurring revenue by 35% through improved customer retention and new customer acquisition in enterprise segment',
        'Transform customer support experience to achieve industry-leading Net Promoter Score of 70+ within 12 months',
        'Establish market leadership position by capturing 25% market share in the sustainable technology sector'
      ];

      let falsePositives = 0;
      let totalTests = highQualityObjectives.length;

      highQualityObjectives.forEach((objective) => {
        const result = antiPatternDetector.detectPatterns(objective);

        // High-quality objectives should have minimal or no anti-patterns detected
        const highConfidencePatterns = result.patterns.filter(p => p.confidence > 0.6);

        if (highConfidencePatterns.length > 0) {
          falsePositives++;
          console.log(`False positive detected in: "${objective}"
            Patterns: ${highConfidencePatterns.map(p => `${p.type}(${p.confidence.toFixed(2)})`).join(', ')}`);
        }
      });

      const falsePositiveRate = falsePositives / totalTests;
      console.log(`False Positive Rate: ${(falsePositiveRate * 100).toFixed(1)}%`);

      // Should have low false positive rate
      expect(falsePositiveRate).toBeLessThanOrEqual(0.2); // 20% maximum false positive rate
    });
  });

  describe('Reframing Quality Assessment', () => {
    test('should provide effective reframing suggestions', () => {
      const reframingCases = [
        {
          original: 'Launch 5 marketing campaigns',
          expertReframing: 'Increase brand awareness and lead generation to drive 30% growth in qualified prospects',
          expectedTechniques: ['five_whys', 'outcome_transformation'] // Activity-focused uses five_whys
        },
        {
          original: 'Implement new CRM system successfully',
          expertReframing: 'Improve sales process efficiency to increase conversion rate from 15% to 25%',
          expectedTechniques: ['five_whys', 'outcome_transformation']
        },
        {
          original: 'Make customers happier',
          expertReframing: 'Enhance customer satisfaction to achieve Net Promoter Score of 50+ through improved service quality',
          expectedTechniques: ['value_exploration', 'outcome_transformation']
        }
      ];

      reframingCases.forEach((testCase) => {
        const detectionResult = antiPatternDetector.detectPatterns(testCase.original);

        if (detectionResult.patterns.length > 0) {
          const reframingResult = antiPatternDetector.generateReframingResponse(
            detectionResult,
            testCase.original,
            {
              communicationStyle: 'collaborative',
              learningStyle: 'example_driven',
              resistancePatterns: [],
              preferences: {},
              priorExperience: 'intermediate'
            }
          );

          expect(reframingResult).toBeDefined();
          expect(reframingResult!.suggestion).toBeDefined();
          expect(reframingResult!.technique).toBeDefined();
          expect(reframingResult!.confidence).toBeGreaterThan(0.5);

          // Check if suggested technique is appropriate
          expect(testCase.expectedTechniques).toContain(reframingResult!.technique);

          console.log(`Reframing for "${testCase.original}":
            Technique: ${reframingResult!.technique}
            Suggestion: ${reframingResult!.suggestion.substring(0, 100)}...
            Confidence: ${reframingResult!.confidence.toFixed(2)}`);
        }
      });
    });
  });
});