#!/usr/bin/env node

/**
 * Health Monitor Service
 * Monitors the OKR AI Agent server health and sends alerts if issues are detected
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const config = {
  monitorUrl: process.env.MONITOR_URL || 'http://localhost:3000/health',
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000, // 30 seconds
  timeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000, // 10 seconds
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 5000, // 5 seconds
  alertThreshold: parseInt(process.env.ALERT_THRESHOLD) || 3, // 3 consecutive failures

  // Alert configuration
  alertEmail: process.env.ALERT_EMAIL || null,
  alertWebhook: process.env.ALERT_WEBHOOK || null,
  slackWebhook: process.env.SLACK_WEBHOOK || null,
};

// State tracking
let consecutiveFailures = 0;
let lastHealthyTime = new Date();
let alertSent = false;

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, timeout) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'OKR-Health-Monitor/1.0',
        'Accept': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            headers: res.headers,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers,
            parseError: error,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Perform health check with retries
 */
async function performHealthCheck() {
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      console.log(`[${new Date().toISOString()}] Health check attempt ${attempt}/${config.retryAttempts}`);

      const response = await makeRequest(config.monitorUrl, config.timeout);

      if (response.statusCode === 200) {
        const healthData = response.data;

        // Check if the response indicates healthy status
        if (healthData.status === 'healthy' || healthData.status === 'degraded') {
          console.log(`✅ Health check passed: ${healthData.status}`);

          // Log additional health info
          if (healthData.database) {
            console.log(`  Database: ${healthData.database.status}`);
          }
          if (healthData.claude) {
            console.log(`  Claude API: ${healthData.claude.status}`);
          }
          if (healthData.memory) {
            console.log(`  Memory usage: ${healthData.memory.used}MB / ${healthData.memory.total}MB`);
          }

          return { healthy: true, data: healthData };
        } else {
          console.log(`❌ Health check failed: ${healthData.status}`);
          return { healthy: false, error: `Unhealthy status: ${healthData.status}`, data: healthData };
        }
      } else {
        console.log(`❌ Health check failed: HTTP ${response.statusCode}`);
        return { healthy: false, error: `HTTP ${response.statusCode}`, data: response.data };
      }
    } catch (error) {
      console.log(`❌ Health check attempt ${attempt} failed: ${error.message}`);

      if (attempt < config.retryAttempts) {
        console.log(`  Retrying in ${config.retryDelay}ms...`);
        await sleep(config.retryDelay);
      } else {
        return { healthy: false, error: error.message };
      }
    }
  }

  return { healthy: false, error: 'All retry attempts failed' };
}

/**
 * Send alert notification
 */
async function sendAlert(message, details) {
  console.log(`🚨 ALERT: ${message}`);

  const alertData = {
    timestamp: new Date().toISOString(),
    message: message,
    details: details,
    server: config.monitorUrl,
    consecutiveFailures: consecutiveFailures,
  };

  // Send to Slack if webhook configured
  if (config.slackWebhook) {
    try {
      await sendSlackAlert(alertData);
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  // Send to webhook if configured
  if (config.alertWebhook) {
    try {
      await sendWebhookAlert(alertData);
    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  // Log to console as fallback
  console.log('Alert details:', JSON.stringify(alertData, null, 2));
}

/**
 * Send Slack notification
 */
async function sendSlackAlert(alertData) {
  const payload = {
    text: `🚨 OKR AI Agent Server Alert`,
    attachments: [
      {
        color: 'danger',
        fields: [
          {
            title: 'Message',
            value: alertData.message,
            short: false,
          },
          {
            title: 'Server',
            value: alertData.server,
            short: true,
          },
          {
            title: 'Consecutive Failures',
            value: alertData.consecutiveFailures.toString(),
            short: true,
          },
          {
            title: 'Timestamp',
            value: alertData.timestamp,
            short: false,
          },
        ],
      },
    ],
  };

  await makeRequest(config.slackWebhook, 5000);
}

/**
 * Send webhook notification
 */
async function sendWebhookAlert(alertData) {
  // Implementation would depend on your webhook service
  console.log('Webhook alert would be sent to:', config.alertWebhook);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main monitoring loop
 */
async function monitorLoop() {
  while (true) {
    try {
      const healthResult = await performHealthCheck();

      if (healthResult.healthy) {
        // Reset failure count on successful check
        if (consecutiveFailures > 0) {
          console.log(`✅ Service recovered after ${consecutiveFailures} failures`);

          if (alertSent) {
            await sendAlert('Service recovered', {
              downtime: new Date().getTime() - lastHealthyTime.getTime(),
              previousFailures: consecutiveFailures,
            });
            alertSent = false;
          }
        }

        consecutiveFailures = 0;
        lastHealthyTime = new Date();
      } else {
        consecutiveFailures++;
        console.log(`❌ Consecutive failures: ${consecutiveFailures}/${config.alertThreshold}`);

        // Send alert if threshold reached
        if (consecutiveFailures >= config.alertThreshold && !alertSent) {
          await sendAlert('Service is unhealthy', {
            error: healthResult.error,
            consecutiveFailures: consecutiveFailures,
            lastHealthyTime: lastHealthyTime.toISOString(),
          });
          alertSent = true;
        }
      }
    } catch (error) {
      console.error('Error in monitoring loop:', error.message);
      consecutiveFailures++;
    }

    // Wait before next check
    await sleep(config.checkInterval);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Health monitor shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Health monitor received SIGTERM, shutting down...');
  process.exit(0);
});

// Start monitoring
console.log(`🔍 Starting health monitor for ${config.monitorUrl}`);
console.log(`📊 Check interval: ${config.checkInterval}ms`);
console.log(`⚠️  Alert threshold: ${config.alertThreshold} consecutive failures`);
console.log('---');

monitorLoop().catch((error) => {
  console.error('Health monitor crashed:', error);
  process.exit(1);
});