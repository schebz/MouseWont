/**
 * Unit tests for BezierPathGenerator
 */

import { BezierPathGenerator } from '../strategies/bezier/BezierPathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../core/types';

describe('BezierPathGenerator', () => {
  let generator: BezierPathGenerator;
  
  beforeEach(() => {
    // Create a generator with fixed seed for reproducible tests
    generator = new BezierPathGenerator(42);
  });
  
  test('creates a path of the requested length', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options: MovementOptions = {
      strategy: MovementStrategy.BEZIER,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 50,
      velocityProfile: 'uniform'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    expect(path.length).toBe(options.pathPoints);
  });
  
  test('path starts at the start point and ends at the end point', async () => {
    const start: Point = { x: 10, y: 20 };
    const end: Point = { x: 300, y: 400 };
    const options: MovementOptions = {
      strategy: MovementStrategy.BEZIER,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const path = await generator.generatePath(start, end, options);
    
    // First point should be the start point
    expect(path[0].x).toBeCloseTo(start.x);
    expect(path[0].y).toBeCloseTo(start.y);
    
    // Last point should be the end point
    expect(path[path.length - 1].x).toBeCloseTo(end.x);
    expect(path[path.length - 1].y).toBeCloseTo(end.y);
  });
  
  test('overshoot factor affects the path', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 400, y: 400 };
    
    // Generate path with no overshoot
    const optionsNoOvershoot: MovementOptions = {
      strategy: MovementStrategy.BEZIER,
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
      strategy: MovementStrategy.BEZIER,
      duration: 500,
      overshootFactor: 0.8,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathWithOvershoot = await generator.generatePath(start, end, optionsWithOvershoot);
    
    // Paths should be different
    let differences = 0;
    for (let i = 0; i < pathNoOvershoot.length; i++) {
      if (
        pathNoOvershoot[i].x !== pathWithOvershoot[i].x ||
        pathNoOvershoot[i].y !== pathWithOvershoot[i].y
      ) {
        differences++;
      }
    }
    
    // There should be some differences in the path
    expect(differences).toBeGreaterThan(0);
  });
  
  test('complexity affects control point placement', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 400, y: 400 };
    
    // Generate path with low complexity
    const optionsLowComplexity: MovementOptions = {
      strategy: MovementStrategy.BEZIER,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.1,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathLowComplexity = await generator.generatePath(
      start, end, optionsLowComplexity
    );
    
    // Generate path with high complexity
    const optionsHighComplexity: MovementOptions = {
      strategy: MovementStrategy.BEZIER,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.9,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    const pathHighComplexity = await generator.generatePath(
      start, end, optionsHighComplexity
    );
    
    // Calculate maximum deviation from straight line
    function calculateMaxDeviation(path: Point[]): number {
      let maxDeviation = 0;
      
      for (let i = 0; i < path.length; i++) {
        // Calculate expected point on straight line
        const t = i / (path.length - 1);
        const expectedX = start.x + (end.x - start.x) * t;
        const expectedY = start.y + (end.y - start.y) * t;
        
        // Calculate deviation
        const dx = path[i].x - expectedX;
        const dy = path[i].y - expectedY;
        const deviation = Math.sqrt(dx * dx + dy * dy);
        
        maxDeviation = Math.max(maxDeviation, deviation);
      }
      
      return maxDeviation;
    }
    
    const deviationLow = calculateMaxDeviation(pathLowComplexity);
    const deviationHigh = calculateMaxDeviation(pathHighComplexity);
    
    // Higher complexity should result in greater deviation
    expect(deviationHigh).toBeGreaterThan(deviationLow);
  });
  
  test('applies different velocity profiles', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 400, y: 400 };
    const baseOptions: MovementOptions = {
      strategy: MovementStrategy.BEZIER,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100,
      velocityProfile: 'uniform'
    };
    
    // Generate paths with different velocity profiles
    const uniformPath = await generator.generatePath(start, end, {
      ...baseOptions,
      velocityProfile: 'uniform'
    });
    
    const minimumJerkPath = await generator.generatePath(start, end, {
      ...baseOptions,
      velocityProfile: 'minimum_jerk'
    });
    
    const asymmetricPath = await generator.generatePath(start, end, {
      ...baseOptions,
      velocityProfile: 'asymmetric'
    });
    
    // Helper function to check if distributions are different
    function areDistributionsDifferent(path1: Point[], path2: Point[]): boolean {
      // Calculate distance distributions
      const distances1: number[] = [];
      const distances2: number[] = [];
      
      for (let i = 1; i < path1.length; i++) {
        const dx1 = path1[i].x - path1[i - 1].x;
        const dy1 = path1[i].y - path1[i - 1].y;
        distances1.push(Math.sqrt(dx1 * dx1 + dy1 * dy1));
        
        const dx2 = path2[i].x - path2[i - 1].x;
        const dy2 = path2[i].y - path2[i - 1].y;
        distances2.push(Math.sqrt(dx2 * dx2 + dy2 * dy2));
      }
      
      // Calculate variance of differences
      let sumSquaredDiff = 0;
      for (let i = 0; i < distances1.length; i++) {
        const diff = distances1[i] - distances2[i];
        sumSquaredDiff += diff * diff;
      }
      
      const variance = sumSquaredDiff / distances1.length;
      
      // If variance is above a threshold, distributions are different
      return variance > 0.1;
    }
    
    // Different velocity profiles should produce different distance distributions
    expect(areDistributionsDifferent(uniformPath, minimumJerkPath)).toBe(true);
    expect(areDistributionsDifferent(uniformPath, asymmetricPath)).toBe(true);
    expect(areDistributionsDifferent(minimumJerkPath, asymmetricPath)).toBe(true);
  });
});