/**
 * Artillery Load Testing Scenarios
 * Provides realistic test data and scenario helpers
 */

// Test data generators for realistic load testing
const activityBasedObjectives = [
  'Launch 5 new marketing campaigns',
  'Implement customer feedback system',
  'Build analytics dashboard',
  'Deploy machine learning model',
  'Conduct 10 user interviews',
  'Create mobile app',
  'Update website design',
  'Train customer service team'
];

const improvedObjectives = [
  'Increase customer satisfaction from 7.2 to 8.5 through improved support response times',
  'Grow monthly recurring revenue by 35% through enhanced customer retention',
  'Reduce customer acquisition cost from $120 to $80 through optimized marketing channels',
  'Improve product adoption rate from 40% to 65% through better onboarding',
  'Increase daily active users from 10,000 to 15,000 through feature improvements',
  'Boost conversion rate from 2.1% to 3.5% through UX optimization',
  'Enhance employee engagement score from 6.8 to 8.2 through culture initiatives',
  'Reduce operational costs by 20% while maintaining service quality'
];

const keyResultsSets = [
  'Reduce average response time from 24 hours to 4 hours, increase first-contact resolution to 80%, achieve 95% customer satisfaction on support interactions',
  'Increase trial-to-paid conversion from 12% to 18%, reduce monthly churn from 8% to 5%, improve net revenue retention to 115%',
  'Decrease cost per acquisition by 30%, increase conversion rate by 25%, achieve 85% customer lifetime value improvement',
  'Increase feature adoption in first 30 days to 60%, reduce time-to-first-value from 7 to 3 days, achieve 90% onboarding completion rate',
  'Grow session duration by 40%, increase feature discovery rate to 75%, achieve 65% weekly retention rate'
];

const randomMessages = [
  'How can we improve our business metrics?',
  'I want to focus on customer outcomes',
  'Let\'s refine our objective to be more specific',
  'Can you help me create better key results?',
  'What about adding measurable targets?',
  'This looks good, let\'s finalize it',
  'How do we measure success here?',
  'Can we make this more ambitious?'
];

// Custom functions for Artillery
function randomString() {
  return Math.random().toString(36).substring(2, 15);
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomActivityBasedObjective(context, events, done) {
  const objective = pickRandom(activityBasedObjectives);
  return done(null, objective);
}

function randomImprovedObjective(context, events, done) {
  const objective = pickRandom(improvedObjectives);
  return done(null, objective);
}

function randomKeyResults(context, events, done) {
  const keyResults = pickRandom(keyResultsSets);
  return done(null, keyResults);
}

function randomMessage(context, events, done) {
  const message = pickRandom(randomMessages);
  return done(null, message);
}

// Performance monitoring hooks
function logMetrics(requestParams, response, context, events, done) {
  // Log critical performance metrics
  if (response.timings) {
    const { response: responseTime } = response.timings;

    if (responseTime > 5000) {
      console.warn(`🚨 Slow response detected: ${responseTime}ms for ${requestParams.url}`);
    }

    if (responseTime > 10000) {
      console.error(`❌ Timeout risk: ${responseTime}ms for ${requestParams.url}`);
    }
  }

  // Log error responses
  if (response.statusCode >= 400) {
    console.error(`❌ Error response: ${response.statusCode} for ${requestParams.url}`);
  }

  return done();
}

function checkMemoryUsage(context, events, done) {
  // This would be expanded in real implementation to monitor server memory
  const memoryData = process.memoryUsage();
  const memoryUsageMB = memoryData.heapUsed / 1024 / 1024;

  if (memoryUsageMB > 300) {
    console.warn(`⚠️  High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
  }

  return done();
}

// Performance test scenarios
function stressTestScenario(context, events, done) {
  // Simulate high-stress user behavior
  const stressMessages = [
    'Launch 20 features, improve everything, increase all metrics by 500%, revolutionize the industry',
    'Build better products and make customers happy while growing revenue and reducing costs',
    'I need the best OKRs ever created that will transform our company completely'
  ];

  const message = pickRandom(stressMessages);
  return done(null, message);
}

function concurrentUserScenario(context, events, done) {
  // Simulate realistic concurrent usage patterns
  const phases = ['discovery', 'refinement', 'key_results_discovery', 'validation'];
  const currentPhase = pickRandom(phases);

  let message;
  switch (currentPhase) {
    case 'discovery':
      message = pickRandom(activityBasedObjectives);
      break;
    case 'refinement':
      message = pickRandom(improvedObjectives);
      break;
    case 'key_results_discovery':
      message = pickRandom(keyResultsSets);
      break;
    case 'validation':
      message = 'These OKRs look great, let\'s finalize them';
      break;
    default:
      message = pickRandom(randomMessages);
  }

  return done(null, message);
}

// Export functions for Artillery
module.exports = {
  randomActivityBasedObjective,
  randomImprovedObjective,
  randomKeyResults,
  randomMessage,
  logMetrics,
  checkMemoryUsage,
  stressTestScenario,
  concurrentUserScenario
};