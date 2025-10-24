/**
 * Global E2E Test Setup
 * Initializes test environment and database
 */

import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // Clean up any existing test data
  const testDataDir = path.join(__dirname, '../../../server/test-data');
  try {
    await fs.access(testDataDir);
    await fs.rmdir(testDataDir, { recursive: true });
  } catch (error) {
    // Directory doesn't exist, that's fine
  }

  // Create fresh test data directory
  await fs.mkdir(testDataDir, { recursive: true });

  // Launch browser for setup if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Wait for services to be ready
  let retries = 30;
  while (retries > 0) {
    try {
      // Check backend health
      const backendResponse = await page.goto('http://localhost:3000/api/health', {
        waitUntil: 'networkidle',
        timeout: 2000
      });

      if (backendResponse?.ok()) {
        // Check frontend health
        const frontendResponse = await page.goto('http://localhost:5173', {
          waitUntil: 'networkidle',
          timeout: 2000
        });

        if (frontendResponse?.ok()) {
          console.log('✅ Services are ready for E2E testing');
          break;
        }
      }
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error('Services failed to start within timeout period');
      }
      console.log(`⏳ Waiting for services to start... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  await context.close();
  await browser.close();
}

export default globalSetup;