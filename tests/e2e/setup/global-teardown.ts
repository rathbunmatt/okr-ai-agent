/**
 * Global E2E Test Teardown
 * Cleans up test environment
 */

import fs from 'fs/promises';
import path from 'path';

async function globalTeardown() {
  // Clean up test data
  const testDataDir = path.join(__dirname, '../../../server/test-data');
  try {
    await fs.rmdir(testDataDir, { recursive: true });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    // Directory might not exist, that's fine
  }

  // Additional cleanup if needed
  console.log('✅ E2E test environment cleaned up');
}

export default globalTeardown;