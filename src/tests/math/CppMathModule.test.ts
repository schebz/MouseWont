/**
 * @file CppMathModule.test.ts
 * @version 0.1.0
 * @lastModified 2025-11-06
 * @changelog Initial tests for CppMathModule
 */

import { CppMathModule } from '../../core/math/CppMathModule';
import { Point } from '../../core/types';

describe('CppMathModule', () => {
  let cppMathModule: CppMathModule;

  beforeAll(() => {
    cppMathModule = new CppMathModule();
  });

  it('should check if module is available', async () => {
    const isAvailable = await cppMathModule.isAvailable();
    console.log(`CppMathModule available: ${isAvailable}`);
    
    // We don't assert the result since it depends on the build environment
    // The test is successful if it completes without errors
  });

  it('should get module info', async () => {
    const moduleInfo = await (cppMathModule as any).getModuleInfo();
    console.log('CppMathModule info:', moduleInfo);
    
    // We expect moduleInfo to have certain properties, but don't check their values
    expect(moduleInfo).toHaveProperty('moduleReady');
    expect(moduleInfo).toHaveProperty('moduleType');
    expect(moduleInfo).toHaveProperty('simdAvailable');
    expect(moduleInfo).toHaveProperty('version');
  });

  it('should generate Bézier curve', async () => {
    const p0: Point = { x: 0, y: 0 };
    const p1: Point = { x: 33, y: 50 };
    const p2: Point = { x: 66, y: 50 };
    const p3: Point = { x: 100, y: 100 };
    const numPoints = 10;

    const path = await cppMathModule.generateBezierCurve(p0, p1, p2, p3, numPoints);
    
    // Test for correct structure and endpoints
    expect(path).toHaveLength(numPoints);
    expect(path[0]).toEqual(p0);
    expect(path[numPoints - 1]).toEqual(p3);
  });

  it('should generate Bézier path with calculated control points', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const complexity = 0.5;
    const overshootFactor = 0.2;
    const jitterAmount = 1.0;
    const numPoints = 10;

    const path = await cppMathModule.generateBezierPath(
      start, end, complexity, overshootFactor, jitterAmount, numPoints
    );
    
    // Test for correct structure and endpoints
    expect(path).toHaveLength(numPoints);
    expect(path[0]).toEqual(start);
    expect(path[numPoints - 1]).toEqual(end);
  });

  it('should generate minimum jerk trajectory', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const numPoints = 10;

    const path = await cppMathModule.generateMinimumJerkTrajectory(start, end, numPoints);
    
    // Test for correct structure and endpoints
    expect(path).toHaveLength(numPoints);
    expect(path[0]).toEqual(start);
    expect(path[numPoints - 1]).toEqual(end);
  });

  it('should generate Ornstein-Uhlenbeck process', async () => {
    const points = 100;
    const theta = 0.7;
    const sigma = 0.5;
    const dt = 0.1;
    
    const [jitterX, jitterY] = await cppMathModule.generateOrnsteinUhlenbeckProcess(
      points, theta, sigma, dt
    );
    
    // Test for correct structure
    expect(jitterX).toHaveLength(points);
    expect(jitterY).toHaveLength(points);
  });

  it('should simulate physics movement', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };
    const options = {
      mass: 1.0,
      springConstant: 8.0,
      dampingFactor: 0.7,
      timeStep: 0.016,
      maxSteps: 200,
      stoppingThreshold: 0.1
    };
    
    const path = await cppMathModule.simulatePhysicsMovement(start, end, options);
    
    // Test for basic structure
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual(start);
  });

  it('should apply velocity profile', async () => {
    // Create a simple straight-line path
    const path: Point[] = Array.from({ length: 10 }, (_, i) => ({
      x: i * 10,
      y: i * 10
    }));
    
    const velocityProfile = 'minimum_jerk';
    const numPoints = 20;
    
    const result = await cppMathModule.applyVelocityProfile(path, velocityProfile, numPoints);
    
    // Test for correct structure and endpoints
    expect(result).toHaveLength(numPoints);
    expect(result[0]).toEqual(path[0]);
    expect(result[numPoints - 1]).toEqual(path[path.length - 1]);
  });

  it('should handle invalid inputs gracefully', async () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 100, y: 100 };

    // Call with invalid input (numPoints < 2)
    const result = await cppMathModule.generateBezierCurve(
      start, { x: 33, y: 50 }, { x: 66, y: 50 }, end, 0
    );

    // The implementation should return an empty array or handle it gracefully
    expect(Array.isArray(result)).toBe(true);
  });
});