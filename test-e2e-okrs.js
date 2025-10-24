/**
 * End-to-End OKR Testing Script
 * Tests 20 different scenarios to validate the full OKR creation flow
 */

const http = require('http');

// Test scenarios covering diverse industries, roles, and objectives
const scenarios = [
  {
    name: "E-commerce Customer Satisfaction",
    industry: "E-commerce",
    role: "Customer Experience Manager",
    initialMessage: "I want to improve customer satisfaction scores",
    responses: [
      "We're getting complaints about slow response times and need to make customers happier",
      "Increase CSAT from 75% to 90%",
      "Reduce average response time from 24 hours to 4 hours, and increase first contact resolution from 60% to 80%"
    ]
  },
  {
    name: "SaaS Product Adoption",
    industry: "SaaS",
    role: "Product Manager",
    initialMessage: "I need to increase product adoption among enterprise customers",
    responses: [
      "We want more customers actively using our advanced features because it improves retention",
      "Drive adoption of premium features to reduce churn",
      "Increase feature activation rate from 30% to 55%, and improve 30-day retention from 70% to 85%"
    ]
  },
  {
    name: "Healthcare Patient Outcomes",
    industry: "Healthcare",
    role: "Clinical Director",
    initialMessage: "Improve patient outcomes in our cardiology department",
    responses: [
      "We want to reduce readmission rates and improve recovery times for cardiac patients",
      "Enhance patient recovery and reduce complications",
      "Reduce 30-day readmission rate from 15% to 8%, increase patient satisfaction scores from 8.2 to 9.0"
    ]
  },
  {
    name: "Retail Revenue Growth",
    industry: "Retail",
    role: "Store Manager",
    initialMessage: "I want to increase sales in our flagship store",
    responses: [
      "We need to attract more foot traffic and convert more browsers into buyers",
      "Maximize revenue per customer visit",
      "Increase average transaction value from $45 to $65, improve conversion rate from 22% to 32%"
    ]
  },
  {
    name: "Manufacturing Efficiency",
    industry: "Manufacturing",
    role: "Operations Manager",
    initialMessage: "Reduce production waste and downtime",
    responses: [
      "We're losing money due to equipment failures and material waste",
      "Optimize production efficiency and reduce costs",
      "Reduce unplanned downtime from 12% to 5%, decrease material waste from 8% to 3%"
    ]
  },
  {
    name: "Financial Services Compliance",
    industry: "Financial Services",
    role: "Compliance Officer",
    initialMessage: "Strengthen our regulatory compliance posture",
    responses: [
      "We need to reduce compliance violations and improve audit readiness",
      "Achieve regulatory excellence and zero critical findings",
      "Reduce compliance incidents from 15/quarter to 0, achieve 100% on-time regulatory reporting"
    ]
  },
  {
    name: "Education Student Engagement",
    industry: "Education",
    role: "Academic Dean",
    initialMessage: "Increase student engagement in online courses",
    responses: [
      "Students aren't participating actively and completion rates are low",
      "Foster active learning and improve course completion",
      "Increase course completion rate from 62% to 85%, improve average engagement score from 6.5 to 8.5"
    ]
  },
  {
    name: "Tech Company Innovation",
    industry: "Technology",
    role: "CTO",
    initialMessage: "Accelerate innovation and product development",
    responses: [
      "We need to ship features faster and improve our time-to-market",
      "Become a leader in rapid product innovation",
      "Reduce time-to-market from 6 months to 3 months, increase successful feature launches from 4 to 10 per quarter"
    ]
  },
  {
    name: "Hospitality Guest Experience",
    industry: "Hospitality",
    role: "Hotel General Manager",
    initialMessage: "Elevate the guest experience at our resort",
    responses: [
      "We want guests to have memorable stays that lead to positive reviews and repeat visits",
      "Create unforgettable experiences that drive loyalty",
      "Increase NPS from 45 to 70, improve repeat guest rate from 25% to 40%"
    ]
  },
  {
    name: "Logistics Delivery Performance",
    industry: "Logistics",
    role: "Distribution Center Manager",
    initialMessage: "Improve our delivery reliability",
    responses: [
      "Too many late deliveries are hurting customer satisfaction",
      "Achieve industry-leading delivery performance",
      "Increase on-time delivery rate from 87% to 98%, reduce shipping errors from 3% to 0.5%"
    ]
  },
  {
    name: "Marketing Lead Generation",
    industry: "B2B Software",
    role: "VP Marketing",
    initialMessage: "Generate more qualified leads for sales",
    responses: [
      "Sales team needs better quality leads that are more likely to convert",
      "Fuel sales pipeline with high-quality opportunities",
      "Increase marketing qualified leads from 200 to 350 per month, improve lead-to-opportunity conversion from 15% to 28%"
    ]
  },
  {
    name: "Cybersecurity Threat Prevention",
    industry: "Cybersecurity",
    role: "CISO",
    initialMessage: "Strengthen our security posture",
    responses: [
      "We need to detect and prevent security incidents faster",
      "Achieve proactive threat protection",
      "Reduce mean time to detect threats from 8 hours to 1 hour, achieve zero successful breaches"
    ]
  },
  {
    name: "Nonprofit Fundraising",
    industry: "Nonprofit",
    role: "Development Director",
    initialMessage: "Increase donations to fund our programs",
    responses: [
      "We need more sustainable funding to expand our community impact",
      "Build financial sustainability for mission growth",
      "Increase recurring donor base from 500 to 1200, raise annual donations from $2M to $3.5M"
    ]
  },
  {
    name: "HR Talent Retention",
    industry: "Technology",
    role: "VP Human Resources",
    initialMessage: "Reduce employee turnover",
    responses: [
      "High turnover is costing us and disrupting teams",
      "Build a workplace where top talent thrives",
      "Reduce voluntary turnover from 18% to 10%, increase employee engagement score from 7.2 to 8.5"
    ]
  },
  {
    name: "Media Content Engagement",
    industry: "Media",
    role: "Content Director",
    initialMessage: "Grow our audience engagement",
    responses: [
      "We need more people consuming and sharing our content",
      "Become the go-to source for industry insights",
      "Increase monthly active users from 500K to 1.2M, improve average session duration from 2.5 to 4.5 minutes"
    ]
  },
  {
    name: "Energy Sustainability",
    industry: "Energy",
    role: "Sustainability Manager",
    initialMessage: "Reduce our carbon footprint",
    responses: [
      "We need to meet our environmental commitments and reduce emissions",
      "Lead the industry in environmental stewardship",
      "Reduce CO2 emissions by 30% from baseline, achieve 50% renewable energy sourcing"
    ]
  },
  {
    name: "Food Service Quality",
    industry: "Food Service",
    role: "Restaurant Manager",
    initialMessage: "Improve food quality and consistency",
    responses: [
      "Customer complaints about inconsistent quality are hurting our reputation",
      "Deliver consistently excellent dining experiences",
      "Achieve 4.5+ star average rating, reduce food quality complaints from 12% to 2%"
    ]
  },
  {
    name: "Real Estate Sales",
    industry: "Real Estate",
    role: "Sales Director",
    initialMessage: "Increase property sales",
    responses: [
      "We need to close more deals and reduce time on market",
      "Dominate the local market with fast closings",
      "Increase closed deals from 15 to 25 per quarter, reduce average days on market from 45 to 28"
    ]
  },
  {
    name: "Automotive Customer Service",
    industry: "Automotive",
    role: "Service Manager",
    initialMessage: "Improve service department customer satisfaction",
    responses: [
      "Customers are frustrated with long wait times and unclear pricing",
      "Deliver transparent, efficient service excellence",
      "Increase CSI score from 82 to 95, reduce average service time from 3.5 hours to 2 hours"
    ]
  },
  {
    name: "Pharmaceutical Research",
    industry: "Pharmaceutical",
    role: "Research Director",
    initialMessage: "Accelerate drug development pipeline",
    responses: [
      "We need to move candidates through trials faster while maintaining safety",
      "Advance breakthrough therapies to market faster",
      "Reduce Phase 2 trial duration from 24 months to 18 months, increase candidate success rate from 40% to 55%"
    ]
  }
];

// HTTP request helper
function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(JSON.stringify(data)) : 0
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Wait helper
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test runner
async function runTest(scenario, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${index + 1}/20: ${scenario.name}`);
  console.log(`Industry: ${scenario.industry} | Role: ${scenario.role}`);
  console.log('='.repeat(80));

  const issues = [];
  let finalOKR = null;

  try {
    // Create session
    console.log('\n📝 Creating session...');
    const session = await makeRequest('POST', '/api/sessions', {
      userId: `test-user-${index}`,
      context: {
        industry: scenario.industry,
        function: scenario.role,
        timeframe: 'quarterly'
      }
    });

    if (!session.success) {
      issues.push('Failed to create session');
      return { scenario: scenario.name, issues, finalOKR: null };
    }

    const sessionId = session.data.id;
    console.log(`✅ Session created: ${sessionId}`);

    // Send initial message
    console.log(`\n💬 User: "${scenario.initialMessage}"`);
    let response = await makeRequest('POST', `/api/sessions/${sessionId}/messages`, {
      message: scenario.initialMessage
    });
    await wait(1000);

    if (response.success && response.data.response) {
      console.log(`🤖 AI: ${response.data.response.substring(0, 200)}...`);

      // Check for markdown formatting
      if (!response.data.response.includes('##') && !response.data.response.includes('**')) {
        issues.push('AI response lacks markdown formatting');
      }
    }

    // Send follow-up responses
    for (let i = 0; i < scenario.responses.length; i++) {
      await wait(2000);
      console.log(`\n💬 User: "${scenario.responses[i]}"`);

      response = await makeRequest('POST', `/api/sessions/${sessionId}/messages`, {
        message: scenario.responses[i]
      });
      await wait(1000);

      if (response.success && response.data.response) {
        console.log(`🤖 AI: ${response.data.response.substring(0, 200)}...`);

        // Check phase progression
        if (response.data.phase) {
          console.log(`📍 Phase: ${response.data.phase}`);
        }

        // Check quality scores
        if (response.data.qualityScores && response.data.qualityScores.objective) {
          console.log(`📊 Quality Score: ${response.data.qualityScores.objective.overall}/100`);
        }
      }
    }

    // Get final session state
    await wait(2000);
    const finalSession = await makeRequest('GET', `/api/sessions/${sessionId}`, null);

    if (finalSession.success && finalSession.data) {
      const sessionData = finalSession.data;

      // Extract OKR from session context
      if (sessionData.context?.current_objective) {
        finalOKR = {
          objective: sessionData.context.current_objective,
          keyResults: sessionData.context.extracted_key_results || [],
          qualityScore: sessionData.context.last_quality_scores?.objective?.overall || 0,
          phase: sessionData.phase
        };

        console.log('\n📋 FINAL OKR:');
        console.log(`   Objective: ${finalOKR.objective}`);
        console.log(`   Key Results:`);
        finalOKR.keyResults.forEach((kr, i) => {
          console.log(`     ${i + 1}. ${kr}`);
        });
        console.log(`   Quality Score: ${finalOKR.qualityScore}/100`);
        console.log(`   Final Phase: ${finalOKR.phase}`);

        // Validate OKR quality
        if (finalOKR.qualityScore < 70) {
          issues.push(`Low quality score: ${finalOKR.qualityScore}/100`);
        }
        if (!finalOKR.objective || finalOKR.objective.length < 10) {
          issues.push('Objective is missing or too short');
        }
        if (finalOKR.keyResults.length < 2) {
          issues.push(`Insufficient key results: ${finalOKR.keyResults.length}`);
        }
      } else {
        issues.push('No objective found in final session');
      }
    }

    if (issues.length === 0) {
      console.log('\n✅ Test completed successfully');
    } else {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    issues.push(`Exception: ${error.message}`);
  }

  return {
    scenario: scenario.name,
    industry: scenario.industry,
    role: scenario.role,
    issues,
    finalOKR
  };
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting End-to-End OKR Testing');
  console.log(`📊 Testing ${scenarios.length} scenarios`);
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}`);

  const results = [];

  for (let i = 0; i < scenarios.length; i++) {
    const result = await runTest(scenarios[i], i);
    results.push(result);
    await wait(3000); // Wait between tests
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.issues.length === 0).length;
  const withIssues = results.filter(r => r.issues.length > 0).length;
  const withOKRs = results.filter(r => r.finalOKR !== null).length;

  console.log(`\n✅ Successful: ${successful}/${scenarios.length}`);
  console.log(`⚠️  With Issues: ${withIssues}/${scenarios.length}`);
  console.log(`📋 OKRs Generated: ${withOKRs}/${scenarios.length}`);

  // Print all OKRs
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 ALL GENERATED OKRs');
  console.log('='.repeat(80));

  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.scenario}`);
    console.log(`   Industry: ${result.industry} | Role: ${result.role}`);

    if (result.finalOKR) {
      console.log(`   Objective: ${result.finalOKR.objective}`);
      console.log(`   Key Results:`);
      result.finalOKR.keyResults.forEach((kr, idx) => {
        console.log(`     ${idx + 1}. ${kr}`);
      });
      console.log(`   Quality: ${result.finalOKR.qualityScore}/100 | Phase: ${result.finalOKR.phase}`);
    } else {
      console.log(`   ❌ No OKR generated`);
    }

    if (result.issues.length > 0) {
      console.log(`   ⚠️  Issues:`);
      result.issues.forEach(issue => console.log(`      - ${issue}`));
    }
  });

  // Print issues breakdown
  if (withIssues > 0) {
    console.log('\n\n' + '='.repeat(80));
    console.log('⚠️  ISSUES BREAKDOWN');
    console.log('='.repeat(80));

    const allIssues = results.flatMap(r => r.issues);
    const issueTypes = {};
    allIssues.forEach(issue => {
      issueTypes[issue] = (issueTypes[issue] || 0) + 1;
    });

    Object.entries(issueTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([issue, count]) => {
        console.log(`   ${count}x: ${issue}`);
      });
  }

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));
}

// Start tests
runAllTests().catch(console.error);
