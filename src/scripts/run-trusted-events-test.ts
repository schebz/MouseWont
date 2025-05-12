/**
 * Script to run the trusted events test
 * 
 * This is a standalone script that can be run with ts-node
 */

import { testTrustedEvents } from '../tests/trusted-events-test';

// Run the test
console.log('Running trusted events test...');
testTrustedEvents().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});