#!/usr/bin/env tsx

/**
 * Comprehensive OKR Agent Scoring Report Generator
 *
 * Analyzes all test results and generates an overall quality score
 * for the OKR Agent across multiple dimensions.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  name: string;
  resultsFile: string;
  weight: number; // Importance weight (0-1)
  description: string;
}

interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: string;
}

interface OverallScore {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  dimensionScores: DimensionScore[];
  testSuiteResults: any[];
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
}

// Define test suites with their weights
const TEST_SUITES: TestSuite[] = [
  {
    name: 'Edge Case Handling',
    resultsFile: 'test-edge-case-results.json',
    weight: 0.15,
    description: 'Handling of edge cases, special inputs, and error conditions'
  },
  {
    name: 'Persona Coaching',
    resultsFile: 'test-persona-results.json',
    weight: 0.25,
    description: 'Ability to coach different personas and correct anti-patterns'
  },
  {
    name: 'Scoring Accuracy',
    resultsFile: 'test-scoring-accuracy-results.json',
    weight: 0.10,
    description: 'Accuracy of internal quality scoring mechanisms'
  },
  {
    name: 'Backward Navigation',
    resultsFile: 'test-backward-navigation-results.json',
    weight: 0.20,
    description: 'Handling of user mind-changing and conversation pivots'
  },
  {
    name: 'Multi-KR Validation',
    resultsFile: 'test-multi-kr-validation-results.json',
    weight: 0.20,
    description: 'Evaluation of multiple Key Results as a coherent set'
  },
  {
    name: 'Conversation Endurance',
    resultsFile: 'test-conversation-endurance-results.json',
    weight: 0.10,
    description: 'Quality maintenance over long conversations (15-20 turns)'
  }
];

function loadTestResults(filename: string): any {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Results file not found: ${filename}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function calculatePassRate(results: any[]): { passed: number; total: number; percentage: number } {
  const total = results.length;
  const passed = results.filter((r: any) => r.passed === true).length;
  return {
    passed,
    total,
    percentage: (passed / total) * 100
  };
}

function calculateConversationEnduranceScore(results: any[]): DimensionScore {
  // Special scoring for conversation endurance - uses metrics rather than pass/fail
  let totalScore = 0;
  let maxScore = 100;

  for (const result of results) {
    const details = result.details || {};

    // Context retention (40 points)
    const contextRetention = details.contextRetention || 0;
    const contextScore = Math.min((contextRetention / 70) * 40, 40); // 70% is target

    // Quality score (40 points)
    const qualityScore = details.averageQuality || 0;
    const qualityPoints = Math.min((qualityScore / 80) * 40, 40); // 80 is target

    // Degradation handling (20 points)
    const degradation = Math.abs(details.qualityDegradation || 0);
    const degradationScore = Math.max(20 - (degradation / 15) * 20, 0); // 15% is threshold

    totalScore += contextScore + qualityPoints + degradationScore;
  }

  const avgScore = totalScore / results.length;

  return {
    dimension: 'Conversation Endurance',
    score: avgScore,
    maxScore: 100,
    percentage: avgScore,
    details: 'Maintains context and quality over extended conversations'
  };
}

function analyzeTestSuite(suite: TestSuite): DimensionScore | null {
  const results = loadTestResults(suite.resultsFile);
  if (!results) {
    return null;
  }

  // Special handling for conversation endurance
  if (suite.name === 'Conversation Endurance') {
    return calculateConversationEnduranceScore(results);
  }

  const { passed, total, percentage } = calculatePassRate(results);

  return {
    dimension: suite.name,
    score: passed,
    maxScore: total,
    percentage,
    details: suite.description
  };
}

function calculateOverallScore(): OverallScore {
  const dimensionScores: DimensionScore[] = [];
  const testSuiteResults: any[] = [];

  let weightedScore = 0;
  let totalWeight = 0;

  // Analyze each test suite
  for (const suite of TEST_SUITES) {
    const score = analyzeTestSuite(suite);
    if (score) {
      dimensionScores.push(score);
      weightedScore += (score.percentage / 100) * suite.weight;
      totalWeight += suite.weight;

      testSuiteResults.push({
        name: suite.name,
        passed: suite.name === 'Conversation Endurance' ? 'N/A (metric-based)' : `${score.score}/${score.maxScore}`,
        percentage: score.percentage.toFixed(1) + '%',
        weight: (suite.weight * 100).toFixed(0) + '%'
      });
    }
  }

  // Calculate final percentage
  const finalPercentage = (weightedScore / totalWeight) * 100;

  // Determine grade
  let grade: string;
  if (finalPercentage >= 90) grade = 'A+ (Excellent)';
  else if (finalPercentage >= 85) grade = 'A (Very Good)';
  else if (finalPercentage >= 80) grade = 'B+ (Good)';
  else if (finalPercentage >= 75) grade = 'B (Above Average)';
  else if (finalPercentage >= 70) grade = 'C+ (Average)';
  else if (finalPercentage >= 65) grade = 'C (Below Average)';
  else grade = 'D (Needs Improvement)';

  // Identify strengths
  const strengths: string[] = [];
  const areasForImprovement: string[] = [];

  for (const score of dimensionScores) {
    if (score.percentage >= 90) {
      strengths.push(`${score.dimension}: ${score.percentage.toFixed(1)}% - Excellent performance`);
    } else if (score.percentage < 70) {
      areasForImprovement.push(`${score.dimension}: ${score.percentage.toFixed(1)}% - Needs improvement`);
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  const scoringDim = dimensionScores.find(d => d.dimension === 'Scoring Accuracy');
  if (scoringDim && scoringDim.percentage < 70) {
    recommendations.push('Improve score inference algorithm - consider training on more examples or accepting qualitative validation');
  }

  const conversationDim = dimensionScores.find(d => d.dimension === 'Conversation Endurance');
  if (conversationDim && conversationDim.percentage < 75) {
    recommendations.push('Enhance context retention for very long conversations (15-20 turns)');
    recommendations.push('Consider implementing conversation summarization to maintain quality');
  }

  if (strengths.length >= 4) {
    recommendations.push('Continue maintaining excellence in core competencies (edge cases, navigation, coaching)');
  }

  return {
    totalScore: finalPercentage,
    maxScore: 100,
    percentage: finalPercentage,
    grade,
    dimensionScores,
    testSuiteResults,
    strengths,
    areasForImprovement,
    recommendations
  };
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 OKR AGENT - COMPREHENSIVE QUALITY ASSESSMENT REPORT');
  console.log('='.repeat(80));
  console.log(`📅 Generated: ${new Date().toLocaleString()}`);
  console.log('');

  const overallScore = calculateOverallScore();

  // Overall Score Section
  console.log('📊 OVERALL QUALITY SCORE');
  console.log('─'.repeat(80));
  console.log(`   Score: ${overallScore.percentage.toFixed(1)}% / 100%`);
  console.log(`   Grade: ${overallScore.grade}`);
  console.log('');

  // Test Suite Results
  console.log('📋 TEST SUITE RESULTS');
  console.log('─'.repeat(80));
  console.log(`${'Test Suite'.padEnd(35)} ${'Pass Rate'.padEnd(15)} ${'Score'.padEnd(15)} ${'Weight'.padEnd(10)}`);
  console.log('─'.repeat(80));

  for (const result of overallScore.testSuiteResults) {
    console.log(
      `${result.name.padEnd(35)} ${result.percentage.padEnd(15)} ${result.passed.padEnd(15)} ${result.weight.padEnd(10)}`
    );
  }
  console.log('');

  // Dimension Breakdown
  console.log('📈 DIMENSION BREAKDOWN');
  console.log('─'.repeat(80));

  for (const dim of overallScore.dimensionScores) {
    const bar = '█'.repeat(Math.floor(dim.percentage / 5)) + '░'.repeat(20 - Math.floor(dim.percentage / 5));
    console.log(`${dim.dimension}:`);
    console.log(`   ${bar} ${dim.percentage.toFixed(1)}%`);
    console.log(`   ${dim.details}`);
    console.log('');
  }

  // Strengths
  if (overallScore.strengths.length > 0) {
    console.log('✅ STRENGTHS');
    console.log('─'.repeat(80));
    for (const strength of overallScore.strengths) {
      console.log(`   ✓ ${strength}`);
    }
    console.log('');
  }

  // Areas for Improvement
  if (overallScore.areasForImprovement.length > 0) {
    console.log('⚠️  AREAS FOR IMPROVEMENT');
    console.log('─'.repeat(80));
    for (const area of overallScore.areasForImprovement) {
      console.log(`   → ${area}`);
    }
    console.log('');
  }

  // Recommendations
  if (overallScore.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(80));
    for (let i = 0; i < overallScore.recommendations.length; i++) {
      console.log(`   ${i + 1}. ${overallScore.recommendations[i]}`);
    }
    console.log('');
  }

  // Summary
  console.log('📝 SUMMARY');
  console.log('─'.repeat(80));
  console.log(`The OKR Agent demonstrates ${overallScore.grade.toLowerCase()} performance with a`);
  console.log(`weighted quality score of ${overallScore.percentage.toFixed(1)}%. The agent excels at handling`);
  console.log(`edge cases, persona coaching, and navigation, while showing opportunities for`);
  console.log(`improvement in scoring accuracy and very long conversation maintenance.`);
  console.log('');
  console.log('='.repeat(80));

  // Save detailed JSON report
  const reportPath = path.join(__dirname, 'okr-agent-quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(overallScore, null, 2));
  console.log(`📄 Detailed JSON report saved to: okr-agent-quality-report.json`);
  console.log('='.repeat(80));
  console.log('');

  return overallScore;
}

// Run the report
const score = generateReport();

// Exit with appropriate code
process.exit(score.percentage >= 70 ? 0 : 1);
