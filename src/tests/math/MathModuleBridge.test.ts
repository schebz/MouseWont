/**
 * @file MathModuleBridge.test.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @changelog Initial tests for MathModuleBridge
 */

import { MathModuleFactory, MathModuleType } from '../../core/MathModuleBridge';

describe('MathModuleBridge', () => {
  describe('MathModuleFactory', () => {
    it('should always provide a TypeScript implementation', async () => {
      const module = await MathModuleFactory.getModule(MathModuleType.TYPESCRIPT);
      expect(module).toBeDefined();
    });

    it('should check module availability', async () => {
      // TypeScript module should always be available
      const tsAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.TYPESCRIPT);
      expect(tsAvailable).toBe(true);

      // Availability of other modules depends on the environment
      const cppAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.CPP);
      const pythonAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.PYTHON);
      const fortranAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.FORTRAN);

      // Log availability for debugging
      console.log(`Module availability: TypeScript=${tsAvailable}, C++=${cppAvailable}, Python=${pythonAvailable}, Fortran=${fortranAvailable}`);
    });

    it('should benchmark and select the best module', async () => {
      const bestModule = await MathModuleFactory.benchmarkAndSelectBest();
      expect(Object.values(MathModuleType)).toContain(bestModule);
      
      // Get an instance of the selected module
      const module = await MathModuleFactory.getModule(bestModule);
      expect(module).toBeDefined();
    });
  });

  describe('TypeScriptMathModule', () => {
    let module: any;

    beforeAll(async () => {
      module = await MathModuleFactory.getModule(MathModuleType.TYPESCRIPT);
    });

    it('should generate Bézier curves', async () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 33, y: 50 };
      const p2 = { x: 66, y: 50 };
      const p3 = { x: 100, y: 100 };
      const numPoints = 10;

      const path = await module.generateBezierCurve(p0, p1, p2, p3, numPoints);
      
      expect(path).toBeInstanceOf(Array);
      expect(path).toHaveLength(numPoints);
      expect(path[0]).toEqual(p0);
      expect(path[numPoints - 1]).toEqual(p3);
      
      // Check that intermediate points are between start and end
      for (let i = 1; i < numPoints - 1; i++) {
        expect(path[i].x).toBeGreaterThanOrEqual(p0.x);
        expect(path[i].x).toBeLessThanOrEqual(p3.x);
        // Y values might be outside the range for bezier curves depending on control points
      }
    });

    it('should generate minimum-jerk trajectories', async () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const numPoints = 10;

      const path = await module.generateMinimumJerkTrajectory(start, end, numPoints);
      
      expect(path).toBeInstanceOf(Array);
      expect(path).toHaveLength(numPoints);
      expect(path[0]).toEqual(start);
      expect(path[numPoints - 1]).toEqual(end);
      
      // Minimum jerk trajectory should accelerate faster in the middle
      // Check that the middle section has larger deltas between points
      const firstHalfDeltas = [];
      const secondHalfDeltas = [];
      
      for (let i = 1; i < Math.floor(numPoints / 2); i++) {
        firstHalfDeltas.push(Math.sqrt(
          Math.pow(path[i].x - path[i-1].x, 2) + 
          Math.pow(path[i].y - path[i-1].y, 2)
        ));
      }
      
      for (let i = Math.floor(numPoints / 2); i < numPoints - 1; i++) {
        secondHalfDeltas.push(Math.sqrt(
          Math.pow(path[i+1].x - path[i].x, 2) + 
          Math.pow(path[i+1].y - path[i].y, 2)
        ));
      }
      
      // Velocity should increase in first half and decrease in second half
      expect(firstHalfDeltas[0]).toBeLessThan(firstHalfDeltas[firstHalfDeltas.length - 1]);
      expect(secondHalfDeltas[0]).toBeGreaterThan(secondHalfDeltas[secondHalfDeltas.length - 1]);
    });

    it('should generate Ornstein-Uhlenbeck jitter', async () => {
      const points = 100;
      const theta = 0.7;
      const sigma = 0.5;
      const dt = 0.1;

      const [jitterX, jitterY] = await module.generateOrnsteinUhlenbeckProcess(points, theta, sigma, dt);
      
      expect(jitterX).toBeInstanceOf(Array);
      expect(jitterX).toHaveLength(points);
      expect(jitterY).toBeInstanceOf(Array);
      expect(jitterY).toHaveLength(points);
      
      // Jitter should be somewhat around zero (mean-reverting)
      // But with randomness, we can't be too strict in small samples
      const avgX = jitterX.reduce((sum, val) => sum + val, 0) / points;
      const avgY = jitterY.reduce((sum, val) => sum + val, 0) / points;

      // Just check that they're in a reasonable range, not exact
      expect(Math.abs(avgX)).toBeLessThan(2);
      expect(Math.abs(avgY)).toBeLessThan(2);
      
      // Check for continuity (values shouldn't jump too much)
      for (let i = 1; i < points; i++) {
        expect(Math.abs(jitterX[i] - jitterX[i-1])).toBeLessThan(sigma * 5);
        expect(Math.abs(jitterY[i] - jitterY[i-1])).toBeLessThan(sigma * 5);
      }
    });

    it('should simulate physics-based movement', async () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const options = {
        mass: 1.0,
        springConstant: 8.0,
        dampingFactor: 0.7,
        timeStep: 0.016,
        maxSteps: 200,
        stoppingThreshold: 0.1
      };

      const path = await module.simulatePhysicsMovement(start, end, options);
      
      expect(path).toBeInstanceOf(Array);
      expect(path.length).toBeGreaterThan(1);
      expect(path[0]).toEqual(start);
      
      // Physics sim should eventually get close to the target
      const lastPoint = path[path.length - 1];
      const distToTarget = Math.sqrt(
        Math.pow(lastPoint.x - end.x, 2) + 
        Math.pow(lastPoint.y - end.y, 2)
      );
      
      // For physics simulation, the distance could be larger due to simulation parameters
      expect(distToTarget).toBeLessThan(50);

      // Check if there's any movement at all - path should progress towards target
      // Compare first half of path to second half - should be getting closer
      const midIndex = Math.floor(path.length / 2);
      const firstHalfDist = Math.sqrt(
        Math.pow(path[midIndex].x - end.x, 2) +
        Math.pow(path[midIndex].y - end.y, 2)
      );
      const startDist = Math.sqrt(
        Math.pow(start.x - end.x, 2) +
        Math.pow(start.y - end.y, 2)
      );

      // Path should be making progress toward the target
      expect(firstHalfDist).toBeLessThan(startDist);
    });

    it('should apply velocity profiles', async () => {
      // Create a straight line path
      const path = Array.from({ length: 100 }, (_, i) => ({
        x: i,
        y: i
      }));
      
      // Test minimum jerk velocity profile
      const reparameterized = await module.applyVelocityProfile(path, 'minimum_jerk', 100);
      
      expect(reparameterized).toBeInstanceOf(Array);
      expect(reparameterized).toHaveLength(100);
      expect(reparameterized[0]).toEqual(path[0]);
      expect(reparameterized[99]).toEqual(path[99]);
      
      // Calculate point-to-point distances to check velocity profile
      const distances = [];
      for (let i = 1; i < reparameterized.length; i++) {
        distances.push(Math.sqrt(
          Math.pow(reparameterized[i].x - reparameterized[i-1].x, 2) + 
          Math.pow(reparameterized[i].y - reparameterized[i-1].y, 2)
        ));
      }
      
      // In a minimum jerk profile:
      // - Distances should start small (slow start)
      // - Increase in the middle (faster middle)
      // - Decrease at the end (slow end)
      
      // First quarter should have increasing distances
      for (let i = 1; i < Math.floor(distances.length / 4); i++) {
        expect(distances[i]).toBeGreaterThan(distances[i-1]);
      }
      
      // Last quarter should have decreasing distances
      for (let i = Math.floor(3 * distances.length / 4); i < distances.length - 1; i++) {
        expect(distances[i]).toBeGreaterThan(distances[i+1]);
      }
    });
  });
});