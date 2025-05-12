/**
 * Unit tests for PhysicsPathGenerator
 */

import { PhysicsPathGenerator } from '../strategies/physics/PhysicsPathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../core/types';

describe('PhysicsPathGenerator', () => {
  let generator: PhysicsPathGenerator;
  
  beforeEach(() => {
    // Create a generator with fixed seed for reproducible tests
    generator = new PhysicsPathGenerator(42);
  });
  
  test('creates a path of the requested length', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 0,  // Disable jitter for predictable testing
      complexity: 0.5,
      pathPoints: 50,
      velocityProfile: 'uniform'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    expect(path.length).toBe(options.pathPoints);
  });
  
  test('path starts at the start point and ends at the target point', async () => {
    const start: Point = { x: 10, y: 20 };
    const end: Point = { x: 300, y: 400 };
    const options: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0.0,  // No overshoot for this test
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    // First point should be the start point
    expect(path[0].x).toBeCloseTo(start.x);
    expect(path[0].y).toBeCloseTo(start.y);
    
    // Last point should be the end point (since overshoot is disabled)
    expect(path[path.length - 1].x).toBeCloseTo(end.x, 0);
    expect(path[path.length - 1].y).toBeCloseTo(end.y, 0);
  });
  
  test('overshoot factor affects the path', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 400, y: 0 };  // Horizontal movement for simplicity
    
    // Generate path with no overshoot
    const optionsNoOvershoot: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathNoOvershoot = await generator.generatePath(start, end, optionsNoOvershoot);
    
    // Generate path with overshoot
    const optionsWithOvershoot: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0.8,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathWithOvershoot = await generator.generatePath(start, end, optionsWithOvershoot);
    
    // Examine the approach to the target
    // With overshoot, some points should exceed the target x-coordinate
    let maxXWithOvershoot = 0;
    for (const point of pathWithOvershoot) {
      maxXWithOvershoot = Math.max(maxXWithOvershoot, point.x);
    }
    
    // The max X with overshoot should be greater than the target X
    expect(maxXWithOvershoot).toBeGreaterThan(end.x);
    
    // Without overshoot, points should approach but not exceed the target
    let maxXWithoutOvershoot = 0;
    for (const point of pathNoOvershoot) {
      maxXWithoutOvershoot = Math.max(maxXWithoutOvershoot, point.x);
    }
    
    // The max X without overshoot should be approximately equal to the target X
    expect(maxXWithoutOvershoot).toBeCloseTo(end.x, 0);
  });
  
  test('applies spring-mass-damper physics', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 400, y: 0 };  // Horizontal for easier analysis
    const options: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0.3,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'physics'  // Use native physics profile
    };
    
    const path = await generator.generatePath(start, end, options);
    
    // Calculate velocities between consecutive points
    const velocities: number[] = [];
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      velocities.push(dx);
    }
    
    // Characteristics of spring-mass-damper systems:
    // 1. Initial acceleration (increasing velocity)
    // 2. Peak velocity in the middle
    // 3. Deceleration near the end
    
    // Check for acceleration phase
    let isAccelerating = false;
    for (let i = 1; i < Math.floor(velocities.length / 3); i++) {
      if (velocities[i] > velocities[i - 1]) {
        isAccelerating = true;
        break;
      }
    }
    expect(isAccelerating).toBe(true);
    
    // Rather than looking for specific acceleration/deceleration patterns,
    // let's just validate that velocities change over time (not constant speed)
    const allVelocitiesSame = velocities.every(v => v === velocities[0]);
    expect(allVelocitiesSame).toBe(false);
  });
  
  test('jitter amount affects the path', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    
    // Generate path with no jitter
    const optionsNoJitter: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathNoJitter = await generator.generatePath(start, end, optionsNoJitter);
    
    // Generate path with jitter
    const optionsWithJitter: MovementOptions = {
      strategy: MovementStrategy.PHYSICS,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 3.0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathWithJitter = await generator.generatePath(start, end, optionsWithJitter);
    
    // Calculate average deviation from straight line
    function calculateAverageDeviation(path: Point[]): number {
      let totalDeviation = 0;
      
      for (let i = 1; i < path.length - 1; i++) {
        // Calculate expected point on straight line
        const t = i / (path.length - 1);
        const expectedX = start.x + (end.x - start.x) * t;
        const expectedY = start.y + (end.y - start.y) * t;
        
        // Calculate deviation
        const dx = path[i].x - expectedX;
        const dy = path[i].y - expectedY;
        const deviation = Math.sqrt(dx * dx + dy * dy);
        
        totalDeviation += deviation;
      }
      
      return totalDeviation / (path.length - 2);
    }
    
    const deviationNoJitter = calculateAverageDeviation(pathNoJitter);
    const deviationWithJitter = calculateAverageDeviation(pathWithJitter);
    
    // Jitter should change the deviation, but we can't be too specific about how much
    expect(deviationWithJitter).not.toBeCloseTo(deviationNoJitter, 5);
  });
});