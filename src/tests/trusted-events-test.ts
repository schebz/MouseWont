/**
 * trusted-events-test.ts
 * 
 * Tests whether mouse movements with MousePlayWrong trigger trusted events
 * This is a critical test for the primary purpose of the library
 */

import { chromium, Browser, Page } from 'playwright';
import { MousePlayWrong, MovementStrategy } from '../index';

// Create a simple HTML test page with event detection
const TEST_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Trusted Events Test</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    #target { 
      width: 200px; 
      height: 200px; 
      background-color: #f0f0f0; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      margin: 50px;
      cursor: pointer;
    }
    #log { 
      border: 1px solid #ccc; 
      padding: 10px; 
      height: 200px; 
      overflow-y: auto; 
      margin-top: 20px;
      font-family: monospace;
    }
    .trusted { color: green; }
    .untrusted { color: red; }
  </style>
</head>
<body>
  <h1>Trusted Events Test</h1>
  <div id="target">Target Area</div>
  <div>
    <button id="clear">Clear Log</button>
  </div>
  <div id="log"></div>

  <script>
    const target = document.getElementById('target');
    const log = document.getElementById('log');
    const clear = document.getElementById('clear');
    
    // Track events
    let eventCount = 0;
    let trustedCount = 0;
    let untrustedCount = 0;
    
    // Log an event
    function logEvent(event) {
      eventCount++;
      const isTrusted = event.isTrusted;
      
      if (isTrusted) {
        trustedCount++;
      } else {
        untrustedCount++;
      }
      
      const entry = document.createElement('div');
      entry.className = isTrusted ? 'trusted' : 'untrusted';
      entry.textContent = \`[\${event.type}] isTrusted: \${isTrusted} | (\${event.clientX}, \${event.clientY})\`;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
      
      // Update global event counters for test access
      window.eventStats = {
        total: eventCount,
        trusted: trustedCount,
        untrusted: untrustedCount
      };
    }
    
    // Listen for mouse events
    ['mousemove', 'mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
      target.addEventListener(eventType, logEvent);
    });
    
    // Clear log
    clear.addEventListener('click', () => {
      log.innerHTML = '';
      eventCount = 0;
      trustedCount = 0;
      untrustedCount = 0;
      window.eventStats = { total: 0, trusted: 0, untrusted: 0 };
    });
    
    // Initialize stats
    window.eventStats = { total: 0, trusted: 0, untrusted: 0 };
  </script>
</body>
</html>
`;

/**
 * Main test function to verify trusted event generation
 */
async function testTrustedEvents() {
  let browser: Browser | null = null;
  
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: false, // Need to see what's happening
      slowMo: 50 // Slow down operations for better visibility
    });
    
    // Create context and page
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Load test HTML
    await page.setContent(TEST_HTML);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    console.log('Testing standard Playwright mouse move...');
    
    // First, test with standard Playwright mouse methods
    // Move to target with standard Playwright method
    const targetElement = await page.$('#target');
    if (!targetElement) {
      throw new Error('Target element not found');
    }
    
    const boundingBox = await targetElement.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get bounding box for target');
    }
    
    // Clear stats
    await page.click('#clear');
    
    // Move to center of target
    const targetX = boundingBox.x + boundingBox.width / 2;
    const targetY = boundingBox.y + boundingBox.height / 2;
    
    // Use standard Playwright mouse move
    await page.mouse.move(targetX, targetY);
    
    // Click the target
    await page.mouse.click(targetX, targetY);
    
    // Wait for events to be processed
    await page.waitForTimeout(1000);
    
    // Get stats for standard Playwright method
    const standardStats = await page.evaluate(() => {
      return window.eventStats;
    });
    
    console.log('Standard Playwright results:');
    console.log(`  Total events: ${standardStats?.total ?? 0}`);
    console.log(`  Trusted events: ${standardStats?.trusted ?? 0}`);
    console.log(`  Untrusted events: ${standardStats?.untrusted ?? 0}`);
    
    // Now test with MousePlayWrong
    console.log('\nTesting MousePlayWrong mouse move...');
    
    // Clear stats
    await page.click('#clear');
    
    // Create MousePlayWrong instance
    const mouse = new MousePlayWrong(page);
    
    // Move to target with MousePlayWrong (starts from current position)
    await mouse.moveTo({ x: targetX, y: targetY }, {
      strategy: MovementStrategy.BEZIER,
      duration: 800,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 50,
      velocityProfile: 'minimum_jerk'
    });
    
    // Click with MousePlayWrong
    await mouse.click();
    
    // Wait for events to be processed
    await page.waitForTimeout(1000);
    
    // Get stats for MousePlayWrong
    const enhancedStats = await page.evaluate(() => {
      return window.eventStats;
    });
    
    console.log('MousePlayWrong results:');
    console.log(`  Total events: ${enhancedStats?.total ?? 0}`);
    console.log(`  Trusted events: ${enhancedStats?.trusted ?? 0}`);
    console.log(`  Untrusted events: ${enhancedStats?.untrusted ?? 0}`);
    
    // Test with other strategies
    const strategies = [
      MovementStrategy.PHYSICS,
      MovementStrategy.MINIMUM_JERK, 
      MovementStrategy.COMPOSITE,
      MovementStrategy.ADAPTIVE
    ];
    
    for (const strategy of strategies) {
      console.log(`\nTesting ${strategy} strategy...`);
      
      // Clear stats
      await page.click('#clear');
      
      // Move away from target first
      await mouse.moveTo({ x: 100, y: 100 });
      
      // Move to target with current strategy
      await mouse.moveTo({ x: targetX, y: targetY }, {
        strategy,
        duration: 800,
        overshootFactor: 0.2,
        jitterAmount: 1.0,
        complexity: 0.5,
        pathPoints: 50,
        velocityProfile: 'minimum_jerk'
      });
      
      // Click with MousePlayWrong
      await mouse.click();
      
      // Wait for events to be processed
      await page.waitForTimeout(1000);
      
      // Get stats for this strategy
      const strategyStats = await page.evaluate(() => {
        return window.eventStats;
      });
      
      console.log(`${strategy} strategy results:`);
      console.log(`  Total events: ${strategyStats?.total ?? 0}`);
      console.log(`  Trusted events: ${strategyStats?.trusted ?? 0}`);
      console.log(`  Untrusted events: ${strategyStats?.untrusted ?? 0}`);
    }
    
    // Wait before closing
    console.log('\nTests completed. Press Ctrl+C to exit.');
    await new Promise(() => {}); // Keep browser open
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Clean up
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testTrustedEvents().catch(console.error);
}

export { testTrustedEvents };