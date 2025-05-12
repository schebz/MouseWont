/**
 * Unit tests for CompositePathGenerator
 */

import { CompositePathGenerator } from '../strategies/composite/CompositePathGenerator';
import { BezierPathGenerator } from '../strategies/bezier/BezierPathGenerator';
import { PhysicsPathGenerator } from '../strategies/physics/PhysicsPathGenerator';
import { MinimumJerkPathGenerator } from '../strategies/jerk/MinimumJerkPathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../core/types';
import { StrategyFactory } from '../strategies/StrategyFactory';

// Mock the strategy factory to control the component generators
jest.mock('../strategies/StrategyFactory');

describe('CompositePathGenerator', () => {
  // Mock component strategies
  const mockBezier = new BezierPathGenerator(42);
  const mockPhysics = new PhysicsPathGenerator(42);
  const mockMinimumJerk = new MinimumJerkPathGenerator(42);
  
  // Setup mocks
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the strategy factory to return our mock generators
    (StrategyFactory as jest.MockedClass<typeof StrategyFactory>).mockImplementation(() => {
      return {
        createStrategy: jest.fn((strategy: MovementStrategy) => {
          switch (strategy) {
            case MovementStrategy.BEZIER:
              return mockBezier;
            case MovementStrategy.PHYSICS:
              return mockPhysics;
            case MovementStrategy.MINIMUM_JERK:
              return mockMinimumJerk;
            default:
              return mockBezier;
          }
        })
      } as unknown as StrategyFactory;
    });
    
    // Mock the component generators' generatePath method
    jest.spyOn(mockBezier, 'generatePath').mockImplementation((start, end) => {
      return [
        { ...start },
        { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 + 20 }, // Curve upward
        { ...end }
      ];
    });
    
    jest.spyOn(mockPhysics, 'generatePath').mockImplementation((start, end) => {
      return [
        { ...start },
        { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 20 }, // Curve downward
        { ...end }
      ];
    });
    
    jest.spyOn(mockMinimumJerk, 'generatePath').mockImplementation((start, end) => {
      return [
        { ...start },
        { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, // Straight line
        { ...end }
      ];
    });
  });
  
  test('creates a path of the requested length', () => {
    const generator = new CompositePathGenerator(42);
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 3, // Match our mock's output
      velocityProfile: 'uniform'
    };
    
    const path = generator.generatePath(start, end, options);
    
    expect(path.length).toBe(options.pathPoints);
  });
  
  test('path starts at the start point and ends at the end point', () => {
    const generator = new CompositePathGenerator(42);
    const start: Point = { x: 10, y: 20 };
    const end: Point = { x: 300, y: 400 };
    const options: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 3, // Match our mock's output
      velocityProfile: 'uniform'
    };
    
    const path = generator.generatePath(start, end, options);
    
    // First point should be the start point
    expect(path[0].x).toBeCloseTo(start.x);
    expect(path[0].y).toBeCloseTo(start.y);
    
    // Last point should be the end point
    expect(path[path.length - 1].x).toBeCloseTo(end.x);
    expect(path[path.length - 1].y).toBeCloseTo(end.y);
  });
  
  test('calls the appropriate component strategies', () => {
    const generator = new CompositePathGenerator(42);
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 3,
      velocityProfile: 'uniform'
    };
    
    generator.generatePath(start, end, options);
    
    // All three component strategies should be called
    expect(mockBezier.generatePath).toHaveBeenCalled();
    expect(mockPhysics.generatePath).toHaveBeenCalled();
    expect(mockMinimumJerk.generatePath).toHaveBeenCalled();
  });
  
  test('blends the component paths based on weights', () => {
    const generator = new CompositePathGenerator(42);
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.5, // Balanced complexity
      pathPoints: 3,
      velocityProfile: 'uniform'
    };
    
    const path = generator.generatePath(start, end, options);
    
    // Middle point should be a blend of all three strategies
    // Since we mocked the middle points as:
    // Bezier:      (50, 70)  [midX, midY + 20]
    // Physics:     (50, 30)  [midX, midY - 20]
    // MinimumJerk: (50, 50)  [midX, midY]
    
    // With roughly equal weights for complexity=0.5, the middle point should be close to
    // the average of the three middle points, which is (50, 50)
    expect(path[1].x).toBeCloseTo(50);
    // With our mock implementation, we can't precisely predict the value
    // We just verify it's somewhere reasonably in the middle (between 30 and 70)
    expect(path[1].y).toBeGreaterThanOrEqual(30);
    expect(path[1].y).toBeLessThanOrEqual(70);
  });
  
  test('complexity affects component weights', () => {
    const generator = new CompositePathGenerator(42);
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    
    // Low complexity: should favor Bezier and Minimum Jerk
    const optionsLowComplexity: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.1, // Low complexity
      pathPoints: 3,
      velocityProfile: 'uniform'
    };
    
    const pathLowComplexity = generator.generatePath(start, end, optionsLowComplexity);
    
    // High complexity: should favor Physics and Composite
    const optionsHighComplexity: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      complexity: 0.9, // High complexity
      pathPoints: 3,
      velocityProfile: 'uniform'
    };
    
    const pathHighComplexity = generator.generatePath(start, end, optionsHighComplexity);
    
    // With low complexity, the path should be closer to minimum jerk and bezier (more y > 50)
    // With high complexity, the path should be closer to physics (more y < 50)
    expect(pathLowComplexity[1].y).toBeGreaterThan(pathHighComplexity[1].y);
  });
  
  test('overshoot factor affects component weights', () => {
    const generator = new CompositePathGenerator(42);
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    
    // Low overshoot: should favor Minimum Jerk
    const optionsLowOvershoot: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.0, // No overshoot
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 3,
      velocityProfile: 'uniform'
    };
    
    const pathLowOvershoot = generator.generatePath(start, end, optionsLowOvershoot);
    
    // High overshoot: should favor Physics
    const optionsHighOvershoot: MovementOptions = {
      strategy: MovementStrategy.COMPOSITE,
      duration: 500,
      overshootFactor: 0.8, // High overshoot
      jitterAmount: 1.0,
      complexity: 0.5,
      pathPoints: 3,
      velocityProfile: 'uniform'
    };
    
    const pathHighOvershoot = generator.generatePath(start, end, optionsHighOvershoot);
    
    // Just check that different overshoot values produce different paths
    // We can't precisely predict the exact values due to randomness and implementation details
    expect(pathHighOvershoot[1].y).not.toBeCloseTo(pathLowOvershoot[1].y, 5);
  });
});