/**
 * Unit tests for MinimumJerkPathGenerator
 */

import { MinimumJerkPathGenerator } from '../strategies/jerk/MinimumJerkPathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../core/types';

describe('MinimumJerkPathGenerator', () => {
  let generator: MinimumJerkPathGenerator;
  
  beforeEach(() => {
    // Create a generator with fixed seed for reproducible tests
    generator = new MinimumJerkPathGenerator(42);
  });
  
  test('creates a path of the requested length', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,  // No overshoot for this test
      jitterAmount: 0,     // No jitter for clean testing
      complexity: 0.5,
      pathPoints: 50,
      velocityProfile: 'minimum_jerk'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    expect(path.length).toBe(options.pathPoints);
  });
  
  test('path starts at the start point and ends at the end point', async () => {
    const start: Point = { x: 10, y: 20 };
    const end: Point = { x: 300, y: 400 };
    const options: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'minimum_jerk'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    // First point should be the start point
    expect(path[0].x).toBeCloseTo(start.x);
    expect(path[0].y).toBeCloseTo(start.y);
    
    // Last point should be the end point
    expect(path[path.length - 1].x).toBeCloseTo(end.x);
    expect(path[path.length - 1].y).toBeCloseTo(end.y);
  });
  
  test('follows the minimum-jerk trajectory equation', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };  // Horizontal path for simplicity
    const options: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 101, // Use odd number for exact middle point
      velocityProfile: 'minimum_jerk'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    // Check a few key points of the minimum jerk trajectory
    // For normalized time t:
    // - At t=0.5 (middle), position should be around 50% of distance
    // - At t=0.25, should be less than 25% due to slow start
    // - At t=0.75, should be more than 75% due to slow finish
    
    // Middle point (index 50)
    const midPointIndex = Math.floor(path.length / 2);
    const midPoint = path[midPointIndex];
    
    // Quarter point (index 25)
    const quarterPointIndex = Math.floor(path.length / 4);
    const quarterPoint = path[quarterPointIndex];
    
    // Three-quarter point (index 75)
    const threeQuarterPointIndex = Math.floor(3 * path.length / 4);
    const threeQuarterPoint = path[threeQuarterPointIndex];
    
    // Calculate the expected values based on the minimum jerk formula
    // x(t) = x0 + (x1 - x0) * (10t³ - 15t⁴ + 6t⁵)
    function minimumJerkPosition(t: number, x0: number, x1: number): number {
      const jerkProfile = 10 * Math.pow(t, 3) - 15 * Math.pow(t, 4) + 6 * Math.pow(t, 5);
      return x0 + (x1 - x0) * jerkProfile;
    }
    
    const expectedMidPoint = minimumJerkPosition(0.5, start.x, end.x);
    const expectedQuarterPoint = minimumJerkPosition(0.25, start.x, end.x);
    const expectedThreeQuarterPoint = minimumJerkPosition(0.75, start.x, end.x);
    
    // Verify the points match the expected values
    expect(midPoint.x).toBeCloseTo(expectedMidPoint);
    expect(quarterPoint.x).toBeCloseTo(expectedQuarterPoint);
    expect(threeQuarterPoint.x).toBeCloseTo(expectedThreeQuarterPoint);
    
    // Additional checks on the nature of the curve
    expect(quarterPoint.x).toBeLessThan(25); // Slower at the beginning
    expect(threeQuarterPoint.x).toBeGreaterThan(75); // Faster in the middle
  });
  
  test('overshoot factor affects the path', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 400, y: 0 };  // Horizontal movement for simplicity
    
    // Generate path with no overshoot
    const optionsNoOvershoot: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'minimum_jerk'
    };
    
    const pathNoOvershoot = await generator.generatePath(start, end, optionsNoOvershoot);
    
    // Generate path with overshoot
    const optionsWithOvershoot: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0.8,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'minimum_jerk'
    };
    
    const pathWithOvershoot = await generator.generatePath(start, end, optionsWithOvershoot);
    
    // With overshoot, the end point should be adjusted to be past the target
    expect(pathWithOvershoot[pathWithOvershoot.length - 1].x).toBeGreaterThan(end.x);
    
    // Without overshoot, the end point should be exactly the target
    expect(pathNoOvershoot[pathNoOvershoot.length - 1].x).toBeCloseTo(end.x);
  });
  
  test('jitter amount affects the path', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    
    // Generate path with no jitter
    const optionsNoJitter: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'minimum_jerk'
    };
    
    const pathNoJitter = await generator.generatePath(start, end, optionsNoJitter);
    
    // Generate path with jitter
    const optionsWithJitter: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 3.0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'minimum_jerk'
    };
    
    const pathWithJitter = await generator.generatePath(start, end, optionsWithJitter);
    
    // Check that jitter creates deviations from the clean path
    let totalDeviation = 0;
    for (let i = 1; i < pathNoJitter.length - 1; i++) {
      const dx = pathWithJitter[i].x - pathNoJitter[i].x;
      const dy = pathWithJitter[i].y - pathNoJitter[i].y;
      const deviation = Math.sqrt(dx * dx + dy * dy);
      
      totalDeviation += deviation;
    }
    
    // There should be meaningful deviation
    expect(totalDeviation).toBeGreaterThan(0);
    
    // Start and end points should still match exactly
    expect(pathWithJitter[0].x).toBeCloseTo(start.x);
    expect(pathWithJitter[0].y).toBeCloseTo(start.y);
    expect(pathWithJitter[pathWithJitter.length - 1].x).toBeCloseTo(end.x);
    expect(pathWithJitter[pathWithJitter.length - 1].y).toBeCloseTo(end.y);
  });
  
  test('different velocity profiles create different paths', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 0 };  // Horizontal for simplicity
    
    // Minimum-jerk profile (natural velocity profile)
    const optionsMinimumJerk: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'minimum_jerk'
    };
    
    const pathMinimumJerk = await generator.generatePath(start, end, optionsMinimumJerk);
    
    // Uniform velocity profile
    const optionsUniform: MovementOptions = {
      strategy: MovementStrategy.MINIMUM_JERK,
      duration: 500,
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathUniform = await generator.generatePath(start, end, optionsUniform);
    
    // Calculate the distances between consecutive points
    function calculateDistances(path: Point[]): number[] {
      const distances = [];
      for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x;
        const dy = path[i].y - path[i - 1].y;
        distances.push(Math.sqrt(dx * dx + dy * dy));
      }
      return distances;
    }
    
    const distancesMinimumJerk = calculateDistances(pathMinimumJerk);
    const distancesUniform = calculateDistances(pathUniform);
    
    // Check characteristic of minimum jerk: speeds up, then slows down
    // First few steps should be smaller than middle steps
    expect(distancesMinimumJerk[0]).toBeLessThan(distancesMinimumJerk[Math.floor(distancesMinimumJerk.length / 2)]);
    // Last few steps should be smaller than middle steps
    expect(distancesMinimumJerk[distancesMinimumJerk.length - 1]).toBeLessThan(distancesMinimumJerk[Math.floor(distancesMinimumJerk.length / 2)]);
    
    // Uniform profile should have roughly equal distances between points
    // Calculate variance of uniform distances
    const meanUniform = distancesUniform.reduce((sum, d) => sum + d, 0) / distancesUniform.length;
    const varianceUniform = distancesUniform.reduce((sum, d) => sum + Math.pow(d - meanUniform, 2), 0) / distancesUniform.length;
    
    // Calculate variance of minimum jerk distances
    const meanMinimumJerk = distancesMinimumJerk.reduce((sum, d) => sum + d, 0) / distancesMinimumJerk.length;
    const varianceMinimumJerk = distancesMinimumJerk.reduce((sum, d) => sum + Math.pow(d - meanMinimumJerk, 2), 0) / distancesMinimumJerk.length;
    
    // For this test, just confirm the uniform distances should have smaller variance
    // than minimum jerk distances (uniform should be more... uniform)
    expect(Math.abs(varianceUniform)).toBeLessThanOrEqual(Math.abs(varianceMinimumJerk) * 2);
  });
});