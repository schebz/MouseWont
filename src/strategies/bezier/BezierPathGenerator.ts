/**
 * BezierPathGenerator.ts
 *
 * Implements a path generator using cubic Bézier curves for natural-looking mouse movements
 */

import { PathGenerator } from '../../core/PathGenerator';
import { Point, MovementOptions } from '../../core/types';
import { MathModule } from '../../core/MathModuleBridge';
import { globalThreadPool } from '../../utils/threading';

/**
 * Generates mouse movement paths using cubic Bézier curves
 *
 * This strategy creates smooth, natural-looking cursor movements by using
 * cubic Bézier curves with control points that mimic human hand movements.
 */
export class BezierPathGenerator extends PathGenerator {
  /**
   * Unique identifier for this generator
   */
  readonly id = 'bezier';

  /**
   * Human-readable name for this generator
   */
  readonly name = 'Bézier Curve';

  /**
   * Math module for optimized calculations
   */
  private mathModule?: MathModule;

  /**
   * Create a new BezierPathGenerator
   *
   * @param randomSeed Optional seed for random number generation
   * @param mathModule Optional math module for optimized calculations
   */
  constructor(randomSeed?: number, mathModule?: MathModule) {
    super(randomSeed);
    this.mathModule = mathModule;
  }

  /**
   * Generate a path from start to end point based on movement options
   *
   * @param start Starting point coordinates
   * @param end Ending point coordinates
   * @param options Configuration options for the movement
   * @returns Array of points representing the path
   */
  async generatePath(start: Point, end: Point, options: MovementOptions): Promise<Point[]> {
    // Calculate direct distance for scaling factors
    const distance = this.distance(start, end);

    // Create control points for the Bézier curve
    const controlPoints = this.generateControlPoints(start, end, options);

    // Generate the raw path points using the Bézier formula
    let rawPath: Point[];

    if (this.mathModule) {
      // Use optimized math module if available
      rawPath = await this.mathModule.generateBezierCurve(
        start,
        controlPoints[0], // First control point
        controlPoints[1], // Second control point
        end,
        options.pathPoints
      );
    } else {
      // Fall back to internal implementation
      rawPath = await this.generateBezierCurveWithThreadPool(
        start,
        controlPoints[0], // First control point
        controlPoints[1], // Second control point
        end,
        options.pathPoints
      );
    }

    // Apply the velocity profile to get the final path
    if (this.mathModule) {
      // Use optimized math module if available
      return await this.mathModule.applyVelocityProfile(
        rawPath,
        options.velocityProfile,
        options.pathPoints
      );
    } else {
      // Fall back to internal implementation
      return this.applyVelocityProfile(
        rawPath,
        options.velocityProfile,
        options.pathPoints
      );
    }
  }

  /**
   * Generate multiple paths in parallel
   * 
   * @param startPoints Array of starting points
   * @param endPoints Array of ending points
   * @param options Movement options
   * @returns Array of arrays of points representing the paths
   */
  async generatePaths(
    startPoints: Point[],
    endPoints: Point[],
    options: MovementOptions
  ): Promise<Point[][]> {
    if (startPoints.length !== endPoints.length) {
      throw new Error('Start and end points arrays must have the same length');
    }
    
    if (startPoints.length === 0) {
      return [];
    }
    
    try {
      // Use the C++ batch operations if available
      if (this.mathModule && 'batchGenerateBezierPaths' in this.mathModule) {
        // Cast to any since the method might not be defined in the interface
        const mathModuleWithBatch = this.mathModule as any;
        return await mathModuleWithBatch.batchGenerateBezierPaths(
          startPoints,
          endPoints,
          options.pathPoints,
          options.complexity,
          options.overshootFactor,
          options.jitterAmount,
          this.randomSeed
        );
      }
    } catch (error) {
      console.warn('C++ batch Bézier path generation failed, falling back to JS thread pool:', error);
    }
    
    // Otherwise, use the thread pool to generate multiple paths in parallel
    return globalThreadPool.generateBezierPaths(
      startPoints,
      endPoints,
      {
        numPoints: options.pathPoints,
        complexity: options.complexity,
        overshootFactor: options.overshootFactor,
        jitterAmount: options.jitterAmount,
        seed: this.randomSeed
      }
    );
  }

  /**
   * Generate control points for the Bézier curve that create natural movement
   *
   * @param start Starting point
   * @param end Ending point
   * @param options Movement options
   * @returns Array of two control points
   */
  private generateControlPoints(start: Point, end: Point, options: MovementOptions): [Point, Point] {
    // Vector from start to end
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Distance for scaling the control point influences
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Base influence factors scaled by complexity and distance
    // Longer movements need longer control points for natural curves
    const baseInfluence = Math.min(0.5, Math.max(0.2, distance / 1000)) * (0.5 + options.complexity * 0.5);

    // We use slightly different influences for each control point to create asymmetric curves
    const influence1 = baseInfluence * (0.8 + 0.4 * this.getRandom());
    const influence2 = baseInfluence * (0.8 + 0.4 * this.getRandom());

    // Add randomness to control point positions based on jitter and complexity
    const jitterAmount = Math.min(50, distance * 0.2) * options.jitterAmount * 0.1;
    const jitterX1 = this.getNormalRandom(0, jitterAmount);
    const jitterY1 = this.getNormalRandom(0, jitterAmount);
    const jitterX2 = this.getNormalRandom(0, jitterAmount);
    const jitterY2 = this.getNormalRandom(0, jitterAmount);

    // Create control points with offsets perpendicular to the movement direction
    // This creates natural arcs in the movement
    const perpX = -dy * (options.complexity * 0.5 * (this.getRandom() - 0.5));
    const perpY = dx * (options.complexity * 0.5 * (this.getRandom() - 0.5));

    // Calculate control points with influence factors and perpendicular components
    // First control point - closer to start
    const cp1: Point = {
      x: start.x + dx * influence1 + perpX + jitterX1,
      y: start.y + dy * influence1 + perpY + jitterY1
    };

    // Second control point - closer to end
    const cp2: Point = {
      x: end.x - dx * influence2 - perpX + jitterX2,
      y: end.y - dy * influence2 - perpY + jitterY2
    };

    // Apply overshoot effect if requested
    if (options.overshootFactor > 0 && distance > 100) {
      const overshootAmount = options.overshootFactor * (0.1 + 0.1 * this.getRandom());
      cp2.x = end.x + dx * overshootAmount;
      cp2.y = end.y + dy * overshootAmount;
    }

    return [cp1, cp2];
  }

  /**
   * Generate Bézier curve using the thread pool for better performance
   *
   * @param p0 Start point
   * @param p1 First control point
   * @param p2 Second control point
   * @param p3 End point
   * @param numPoints Number of points to generate
   * @returns Promise resolving to array of points along the curve
   */
  private async generateBezierCurveWithThreadPool(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    numPoints: number
  ): Promise<Point[]> {
    // Use thread pool to parallelize the computation
    const generateBezierPoints = (params: {
      start: number,
      end: number,
      numPoints: number,
      p0: Point,
      p1: Point,
      p2: Point,
      p3: Point
    }) => {
      const { start, end, numPoints, p0, p1, p2, p3 } = params;
      const partialPath: Point[] = [];
      
      for (let i = start; i <= end; i++) {
        const t = i / (numPoints - 1);
        
        // Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
        const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
        
        partialPath.push({ x, y });
      }
      
      return partialPath;
    };
    
    try {
      // For small numbers of points, it's more efficient to calculate directly
      if (numPoints <= 50) {
        return this.generateBezierCurveInternal(p0, p1, p2, p3, numPoints);
      }
      
      // Otherwise, split the work across multiple threads
      // Determine number of chunks based on available threads
      const poolInfo = globalThreadPool.getThreadPoolInfo();
      const numThreads = Math.max(1, poolInfo.totalThreads);
      const pointsPerThread = Math.ceil(numPoints / numThreads);
      
      // Create tasks for each chunk
      const tasks = [];
      for (let i = 0; i < numThreads; i++) {
        const start = i * pointsPerThread;
        const end = Math.min((i + 1) * pointsPerThread - 1, numPoints - 1);
        
        if (start <= end) {
          tasks.push(globalThreadPool.scheduleTask(generateBezierPoints, {
            start,
            end,
            numPoints,
            p0,
            p1,
            p2,
            p3
          }));
        }
      }
      
      // Wait for all tasks to complete and collect results
      const results = await Promise.all(tasks);
      
      // Combine results in the correct order
      const path: Point[] = [];
      for (const partialPath of results) {
        path.push(...partialPath);
      }
      
      // Sort by t-value to ensure correct order
      // (this may not be necessary if the chunks are processed in order)
      path.sort((a, b) => {
        const indexA = Math.round((a.x - p0.x) / (p3.x - p0.x) * (numPoints - 1));
        const indexB = Math.round((b.x - p0.x) / (p3.x - p0.x) * (numPoints - 1));
        return indexA - indexB;
      });
      
      return path;
    } catch (error) {
      console.warn('Thread pool Bézier curve generation failed, falling back to synchronous:', error);
      return this.generateBezierCurveInternal(p0, p1, p2, p3, numPoints);
    }
  }

  /**
   * Generate points along a cubic Bézier curve (internal implementation)
   *
   * @param p0 Start point
   * @param p1 First control point
   * @param p2 Second control point
   * @param p3 End point
   * @param numPoints Number of points to generate
   * @returns Array of points along the curve
   */
  private generateBezierCurveInternal(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    numPoints: number
  ): Point[] {
    const path: Point[] = [];

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);

      // Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;

      const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
      const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

      path.push({ x, y });
    }

    return path;
  }
}