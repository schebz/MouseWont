/**
 * Example usage of the ContextTracker
 */

import { ContextTracker, ContextEventType } from './ContextTracker';

/**
 * Demonstrates how to use the ContextTracker to monitor and log mouse movements
 */
function demonstrateContextTracking(): void {
  console.log('Context Tracking Demonstration');
  console.log('-----------------------------');
  
  // Create a new context tracker
  const tracker = new ContextTracker({
    position: { x: 100, y: 100 }
  }, {
    storeHistory: true,
    maxHistorySize: 100
  });
  
  // Add a listener for all events
  tracker.addListener(undefined, (event) => {
    console.log(`Event: ${event.type}`);
    console.log(`Changed props: ${event.changedProps.join(', ')}`);
    console.log(`New position: (${event.newContext.position.x}, ${event.newContext.position.y})`);
    console.log('---');
  });
  
  // Add a specific listener for movement completion
  tracker.addListener(ContextEventType.MOVEMENT_COMPLETE, (event) => {
    console.log(`Movement completed in ${event.metadata?.duration}ms`);
    console.log(`Final position: (${event.newContext.position.x}, ${event.newContext.position.y})`);
    console.log('===');
  });
  
  // Simulate a movement
  console.log('Starting movement...');
  tracker.startMovement({ x: 500, y: 300 }, 'bezier');
  
  // Simulate movement updates
  const updateCount = 5;
  for (let i = 1; i <= updateCount; i++) {
    const progress = i / updateCount;
    const startX = 100;
    const startY = 100;
    const targetX = 500;
    const targetY = 300;
    
    // Linear interpolation for simplicity
    const currentX = startX + (targetX - startX) * progress;
    const currentY = startY + (targetY - startY) * progress;
    
    // Update the context
    tracker.updateMovement({ x: currentX, y: currentY }, progress * 1000);
  }
  
  // Complete the movement
  tracker.completeMovement({ x: 500, y: 300 }, 1000);
  
  // Show history
  console.log('\nMovement History:');
  const history = tracker.getHistory(3); // Get last 3 events
  history.forEach((event, index) => {
    console.log(`${index + 1}. ${event.type} at ${new Date(event.timestamp).toISOString()}`);
  });
}

/**
 * Example of tracking multiple movements
 */
function demonstrateMultipleMovements(): void {
  console.log('\nMultiple Movements Demonstration');
  console.log('-------------------------------');
  
  // Create a new tracker
  const tracker = new ContextTracker();
  
  // Log movement metrics
  tracker.addListener(ContextEventType.MOVEMENT_COMPLETE, (event) => {
    console.log(`Movement ${event.newContext.movementId} completed:`);
    console.log(`- Duration: ${event.newContext.metrics.lastMovementDuration}ms`);
    console.log(`- Strategy: ${event.newContext.strategy}`);
    console.log(`- Path: (${event.prevContext.position.x}, ${event.prevContext.position.y}) → (${event.newContext.position.x}, ${event.newContext.position.y})`);
  });
  
  // Simulate several movements with different strategies
  const movements = [
    { start: { x: 100, y: 100 }, end: { x: 500, y: 300 }, strategy: 'bezier', duration: 800 },
    { start: { x: 500, y: 300 }, end: { x: 200, y: 400 }, strategy: 'physics', duration: 1200 },
    { start: { x: 200, y: 400 }, end: { x: 350, y: 150 }, strategy: 'minimum_jerk', duration: 700 }
  ];
  
  // Execute movements sequentially
  movements.forEach(({ start, end, strategy, duration }) => {
    // Update position to start position
    tracker.updateContext({ position: start });
    
    // Start movement
    tracker.startMovement(end, strategy);
    
    // Skip updates for brevity
    
    // Complete movement
    tracker.completeMovement(end, duration);
  });
  
  // Show aggregate statistics
  const movementEvents = tracker.getHistory(undefined, ContextEventType.MOVEMENT_COMPLETE);
  const totalDuration = movementEvents.reduce(
    (sum, event) => sum + event.newContext.metrics.lastMovementDuration, 
    0
  );
  
  console.log('\nAggregate Statistics:');
  console.log(`- Total movements: ${movementEvents.length}`);
  console.log(`- Total duration: ${totalDuration}ms`);
  console.log(`- Average duration: ${Math.round(totalDuration / movementEvents.length)}ms`);
}

/**
 * Run all demonstrations
 */
function main(): void {
  demonstrateContextTracking();
  demonstrateMultipleMovements();
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { demonstrateContextTracking, demonstrateMultipleMovements };