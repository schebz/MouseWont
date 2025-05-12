/**
 * @file basic-usage.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @author Mika Tokamak
 *
 * Basic usage example for MousePlayWrong
 * Demonstrates how to use the library with Playwright
 */

import { chromium } from 'playwright';
import { MousePlayWrong, MovementStrategy } from '../index';

async function example() {
  // Launch a new browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to a test page
    await page.goto('https://example.com');
    
    // Create a MousePlayWrong instance with the page
    const mouse = new MousePlayWrong(page);
    
    // Get system status
    console.log('System status:', mouse.getStatus());
    
    // Move to an element with default options
    console.log('Moving to the heading...');
    await mouse.moveToElement('h1');
    
    // Click with default options
    console.log('Clicking the heading...');
    await mouse.click();
    
    // Move to a link with custom options
    console.log('Moving to the link with custom options...');
    await mouse.moveToElement('a', {
      strategy: MovementStrategy.BEZIER,
      duration: 800,
      overshootFactor: 0.3,
      jitterAmount: 1.5,
      complexity: 0.7,
      pathPoints: 100,
      velocityProfile: 'asymmetric'
    });
    
    // Click with custom options
    console.log('Clicking the link...');
    await mouse.click({
      button: 'left',
      clickCount: 1,
      delay: 50
    });
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Move and click in one operation
    console.log('Moving and clicking in one operation...');
    await mouse.moveAndClick('a', {
      strategy: MovementStrategy.PHYSICS
    });
    
    // Perform a drag operation
    console.log('Performing a drag operation...');
    await mouse.drag(
      { x: 100, y: 100 },
      { x: 300, y: 200 },
      { strategy: MovementStrategy.MINIMUM_JERK }
    );
    
    console.log('Example completed successfully');
  } catch (error) {
    console.error('Error during example:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  example().catch(console.error);
}

export { example };