/**
 * @file BezierPathGeneratorMathModule.test.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @changelog Initial tests for BezierPathGenerator with math modules
 */

// import { expect } from 'chai';
import { BezierPathGenerator } from '../../strategies/bezier/BezierPathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../../core/types';
import { MathModuleFactory, MathModuleType, MathModule } from '../../core/MathModuleBridge';

describe('BezierPathGenerator with Math Modules', () => {
  // Default options for testing
  const defaultOptions: MovementOptions = {
    strategy: MovementStrategy.BEZIER,
    duration: 500,
    overshootFactor: 0.2,
    jitterAmount: 1.0,
    complexity: 0.5,
    pathPoints: 50,
    velocityProfile: 'minimum_jerk'
  };

  // Test with different math modules
  let mathModuleTypes = [MathModuleType.TYPESCRIPT];
  
  // We'll dynamically add other module types if they're available
  beforeAll(async () => {
    // Check for C++ module
    if (await MathModuleFactory.isModuleAvailable(MathModuleType.CPP)) {
      mathModuleTypes.push(MathModuleType.CPP);
    }
    
    // Check for Python module
    if (await MathModuleFactory.isModuleAvailable(MathModuleType.PYTHON)) {
      mathModuleTypes.push(MathModuleType.PYTHON);
    }
    
    console.log(`Testing with math modules: ${mathModuleTypes.join(', ')}`);
  });

  mathModuleTypes.forEach(moduleType => {
    describe(`with ${moduleType} math module`, () => {
      let mathModule: MathModule;
      let generator: BezierPathGenerator;
      
      beforeEach(async () => {
        // This might take some time for Python module initialization
        jest.setTimeout(5000);
        mathModule = await MathModuleFactory.getModule(moduleType);
        generator = new BezierPathGenerator(undefined, mathModule);
      });
      
      it('should generate a path between two points', async () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 500, y: 300 };
        
        const path = await generator.generatePath(start, end, defaultOptions);
        
        expect(path).toBeInstanceOf(Array);
        expect(path.length).toBe(defaultOptions.pathPoints);
        expect(path[0].x).toBeCloseTo(start.x, 0);
        expect(path[0].y).toBeCloseTo(start.y, 0);
        expect(path[path.length - 1].x).toBeCloseTo(end.x, 0);
        expect(path[path.length - 1].y).toBeCloseTo(end.y, 0);
      });
      
      it('should generate a curved path', async () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 500, y: 300 };
        
        const path = await generator.generatePath(start, end, defaultOptions);
        
        // Check that points aren't just on a straight line
        // by measuring distance from straight line
        let maxDist = 0;
        for (const point of path) {
          // Calculate distance from point to line from start to end
          const t = ((point.x - start.x) * (end.x - start.x) + 
                    (point.y - start.y) * (end.y - start.y)) / 
                   (Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          
          const projX = start.x + t * (end.x - start.x);
          const projY = start.y + t * (end.y - start.y);
          
          const dist = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
          maxDist = Math.max(maxDist, dist);
        }
        
        // Distance should show some deviation from a straight line
        expect(maxDist).toBeGreaterThan(5);
      });
      
      it('should respect complexity parameter', async () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 500, y: 300 };
        
        // Generate with low complexity
        const lowComplexityOptions = { 
          ...defaultOptions, 
          complexity: 0.1,
          jitterAmount: 0 // Turn off jitter for cleaner comparison
        };
        const lowComplexityPath = await generator.generatePath(start, end, lowComplexityOptions);
        
        // Generate with high complexity
        const highComplexityOptions = { 
          ...defaultOptions, 
          complexity: 0.9,
          jitterAmount: 0 // Turn off jitter for cleaner comparison
        };
        const highComplexityPath = await generator.generatePath(start, end, highComplexityOptions);
        
        // Measure curve complexity as max distance from straight line
        let lowMaxDist = 0;
        let highMaxDist = 0;
        
        for (const point of lowComplexityPath) {
          const t = ((point.x - start.x) * (end.x - start.x) + 
                    (point.y - start.y) * (end.y - start.y)) / 
                   (Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          
          const projX = start.x + t * (end.x - start.x);
          const projY = start.y + t * (end.y - start.y);
          
          const dist = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
          lowMaxDist = Math.max(lowMaxDist, dist);
        }
        
        for (const point of highComplexityPath) {
          const t = ((point.x - start.x) * (end.x - start.x) + 
                    (point.y - start.y) * (end.y - start.y)) / 
                   (Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          
          const projX = start.x + t * (end.x - start.x);
          const projY = start.y + t * (end.y - start.y);
          
          const dist = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
          highMaxDist = Math.max(highMaxDist, dist);
        }
        
        // Higher complexity should result in more curve deviation
        expect(highMaxDist).toBeGreaterThan(lowMaxDist);
      });
      
      it('should respect overshoot parameter', async () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 500, y: 300 };
        
        // Generate without overshoot
        const noOvershootOptions = { 
          ...defaultOptions, 
          overshootFactor: 0,
          jitterAmount: 0
        };
        const noOvershootPath = await generator.generatePath(start, end, noOvershootOptions);
        
        // Generate with overshoot
        const withOvershootOptions = { 
          ...defaultOptions, 
          overshootFactor: 0.5,
          jitterAmount: 0
        };
        const withOvershootPath = await generator.generatePath(start, end, withOvershootOptions);
        
        // Without overshoot, the end point should be very close to the target
        const noOvershootEnd = noOvershootPath[noOvershootPath.length - 1];
        expect(noOvershootEnd.x).toBeCloseTo(end.x, 0);
        expect(noOvershootEnd.y).toBeCloseTo(end.y, 0);
        
        // With overshoot, we should see points that go beyond the target
        // Overshoot typically happens in the mid-to-late section of the curve
        let foundOvershoot = false;
        for (let i = Math.floor(withOvershootPath.length * 0.6); i < withOvershootPath.length; i++) {
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const dotProduct = dx * (withOvershootPath[i].x - start.x) + dy * (withOvershootPath[i].y - start.y);
          const projLength = Math.sqrt(dx*dx + dy*dy);
          const projDistance = dotProduct / projLength;
          
          if (projDistance > projLength) {
            foundOvershoot = true;
            break;
          }
        }
        
        expect(foundOvershoot).toBe(true);
      });
      
      it('should apply velocity profile correctly', async () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 500, y: 300 };
        
        // Generate with minimum jerk velocity profile
        const options = { 
          ...defaultOptions, 
          velocityProfile: 'minimum_jerk',
          jitterAmount: 0
        };
        const path = await generator.generatePath(start, end, options);
        
        // Calculate point-to-point distances to check velocity profile
        const distances = [];
        for (let i = 1; i < path.length; i++) {
          distances.push(Math.sqrt(
            Math.pow(path[i].x - path[i-1].x, 2) + 
            Math.pow(path[i].y - path[i-1].y, 2)
          ));
        }
        
        // In a minimum jerk profile:
        // - Distances should start small (slow start)
        // - Increase in the middle (faster middle)
        // - Decrease at the end (slow end)
        
        // Velocity profile should create different spacing than uniform
        // Let's check if at least the first point has slower velocity than mid-point
        const firstSegmentVelocity = distances[0];
        const midSegmentVelocity = distances[Math.floor(distances.length / 2)];

        // First segment should be slower than middle segment
        expect(firstSegmentVelocity).toBeLessThan(midSegmentVelocity);
      });
      
      it('should handle edge case of very short movement', async () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 101, y: 101 };
        
        const path = await generator.generatePath(start, end, defaultOptions);
        
        expect(path).toBeInstanceOf(Array);
        expect(path.length).toBe(defaultOptions.pathPoints);
        expect(path[0].x).toBeCloseTo(start.x, 1);
        expect(path[0].y).toBeCloseTo(start.y, 1);
        expect(path[path.length - 1].x).toBeCloseTo(end.x, 1);
        expect(path[path.length - 1].y).toBeCloseTo(end.y, 1);
      });
    });
  });
});