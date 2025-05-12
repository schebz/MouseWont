/**
 * Base interface for path generation strategies
 */

import { Point, MovementOptions, MovementMetrics } from './types';

/**
 * Abstract base class for path generation strategies
 * 
 * Defines the interface that all movement strategies must implement
 * while providing some common utility methods.
 */
export abstract class PathGenerator {
  /**
   * Unique identifier for this generator
   */
  abstract readonly id: string;
  
  /**
   * Human-readable name for this generator
   */
  abstract readonly name: string;
  
  /**
   * Random number generator seed
   */
  protected randomSeed?: number;
  
  /**
   * Construct a new path generator
   * 
   * @param randomSeed Optional seed for random number generation
   */
  constructor(randomSeed?: number) {
    this.randomSeed = randomSeed;
  }
  
  /**
   * Generate a path from start to end point based on movement options
   *
   * @param start Starting point coordinates
   * @param end Ending point coordinates
   * @param options Configuration options for the movement
   * @returns Promise resolving to array of points representing the path
   */
  abstract generatePath(start: Point, end: Point, options: MovementOptions): Promise<Point[]>;
  
  /**
   * Calculate performance metrics for a generated path
   * 
   * @param path The generated path
   * @param options The options used to generate the path
   * @returns Movement metrics for analysis
   */
  calculateMetrics(path: Point[], options: MovementOptions): MovementMetrics {
    const startTime = performance.now();
    
    // Calculate path length
    let pathLength = 0;
    let maxVelocity = 0;
    let totalVelocity = 0;
    let maxAcceleration = 0;
    let maxJerk = 0;
    
    // We'll use these to track velocities, accelerations, and jerks
    const velocities: number[] = [];
    const accelerations: number[] = [];
    const jerks: number[] = [];
    
    // Time interval between points (ms)
    const timeInterval = options.duration / (path.length - 1);
    
    // Calculate distances between consecutive points
    for (let i = 1; i < path.length; i++) {
      const prevPoint = path[i - 1];
      const currentPoint = path[i];
      
      const dx = currentPoint.x - prevPoint.x;
      const dy = currentPoint.y - prevPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      pathLength += distance;
      
      // Calculate instantaneous velocity (pixels/ms)
      const velocity = distance / timeInterval;
      velocities.push(velocity);
      
      maxVelocity = Math.max(maxVelocity, velocity);
      totalVelocity += velocity;
    }
    
    // Calculate accelerations
    for (let i = 1; i < velocities.length; i++) {
      const acceleration = (velocities[i] - velocities[i - 1]) / timeInterval;
      accelerations.push(acceleration);
      
      maxAcceleration = Math.max(maxAcceleration, Math.abs(acceleration));
    }
    
    // Calculate jerks
    for (let i = 1; i < accelerations.length; i++) {
      const jerk = (accelerations[i] - accelerations[i - 1]) / timeInterval;
      jerks.push(jerk);
      
      maxJerk = Math.max(maxJerk, Math.abs(jerk));
    }
    
    // Calculate overshoot (if any)
    const end = path[path.length - 1];
    const target = path[path.length - 1]; // In this base implementation, we assume the last point is the target
    const overshootDistance = Math.sqrt(
      Math.pow(end.x - target.x, 2) + Math.pow(end.y - target.y, 2)
    );
    
    // Calculation time
    const computationTime = performance.now() - startTime;
    
    return {
      pathLength,
      maxVelocity,
      avgVelocity: totalVelocity / velocities.length,
      maxAcceleration,
      maxJerk,
      overshootDistance,
      computationTime
    };
  }
  
  /**
   * Apply time parameterization to a path based on the velocity profile
   * 
   * @param path Raw path with uniform time distribution
   * @param velocityProfile Type of velocity profile to apply
   * @param pathPoints Number of points to include in the final path
   * @returns Reparameterized path with the specified velocity profile
   */
  protected applyVelocityProfile(
    path: Point[],
    velocityProfile: string,
    pathPoints: number
  ): Point[] {
    // If the velocity profile is uniform, return the path as is
    if (velocityProfile === 'uniform') {
      return path;
    }
    
    // Generate uniformly spaced points from the path
    const uniformPath = this.resamplePath(path, pathPoints);
    
    // Create a new array for the reparameterized path
    const reparameterizedPath: Point[] = [];
    
    // Generate the time values based on the velocity profile
    const timeValues = this.generateTimeValues(pathPoints, velocityProfile);
    
    // For each time value, find the corresponding point on the path
    for (const t of timeValues) {
      const index = Math.floor(t * (uniformPath.length - 1));
      const fraction = t * (uniformPath.length - 1) - index;
      
      // If we're at the last point, just return it
      if (index >= uniformPath.length - 1) {
        reparameterizedPath.push(uniformPath[uniformPath.length - 1]);
        continue;
      }
      
      // Otherwise, linearly interpolate between the two nearest points
      const p1 = uniformPath[index];
      const p2 = uniformPath[index + 1];
      
      reparameterizedPath.push({
        x: p1.x + fraction * (p2.x - p1.x),
        y: p1.y + fraction * (p2.y - p1.y)
      });
    }
    
    return reparameterizedPath;
  }
  
  /**
   * Resample a path to have the specified number of points
   * 
   * @param path The original path
   * @param numPoints The desired number of points
   * @returns Resampled path with uniform spacing
   */
  private resamplePath(path: Point[], numPoints: number): Point[] {
    if (path.length <= 1 || numPoints <= 1) {
      return path;
    }
    
    const result: Point[] = [];
    
    // Add the first point
    result.push({ ...path[0] });
    
    // Calculate the path length
    const pathLengths: number[] = [0];
    let totalLength = 0;
    
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      
      totalLength += segmentLength;
      pathLengths.push(totalLength);
    }
    
    // Generate evenly spaced points
    for (let i = 1; i < numPoints - 1; i++) {
      const targetLength = (i / (numPoints - 1)) * totalLength;
      
      // Find the segment that contains the target length
      let segmentIndex = 0;
      while (segmentIndex < pathLengths.length - 1 && 
             pathLengths[segmentIndex + 1] < targetLength) {
        segmentIndex++;
      }
      
      // Calculate the fraction of the way through the segment
      const segmentStart = pathLengths[segmentIndex];
      const segmentEnd = pathLengths[segmentIndex + 1];
      const segmentFraction = segmentEnd > segmentStart 
        ? (targetLength - segmentStart) / (segmentEnd - segmentStart)
        : 0;
      
      // Interpolate between the points
      const p1 = path[segmentIndex];
      const p2 = path[segmentIndex + 1];
      
      result.push({
        x: p1.x + segmentFraction * (p2.x - p1.x),
        y: p1.y + segmentFraction * (p2.y - p1.y)
      });
    }
    
    // Add the last point
    result.push({ ...path[path.length - 1] });
    
    return result;
  }
  
  /**
   * Generate time values based on the specified velocity profile
   * 
   * @param numPoints Number of points to generate
   * @param velocityProfile Type of velocity profile to use
   * @returns Array of time values between 0 and 1
   */
  private generateTimeValues(numPoints: number, velocityProfile: string): number[] {
    // Start and end points
    const timeValues: number[] = [0];
    
    switch (velocityProfile) {
      case 'minimum_jerk': {
        // Minimum jerk profile: slow start, fast middle, slow end
        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          // Apply minimum jerk formula: t³(10 - 15t + 6t²)
          const adjusted = t * t * t * (10 - 15 * t + 6 * t * t);
          timeValues.push(adjusted);
        }
        break;
      }
      
      case 'asymmetric': {
        // Asymmetric profile: fast acceleration, slower deceleration
        // Using beta distribution approximation
        const a = 1.8; // Shape parameter (controls rise)
        const b = 2.2; // Shape parameter (controls fall)
        
        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          // Simple approximation of beta distribution CDF
          const adjusted = Math.pow(t, a) / (Math.pow(t, a) + Math.pow(1 - t, b));
          timeValues.push(adjusted);
        }
        break;
      }
      
      case 'sigmoid': {
        // Sigmoid profile: smooth acceleration and deceleration
        for (let i = 1; i < numPoints - 1; i++) {
          const t = i / (numPoints - 1);
          // Transform t using sigmoid function
          const adjusted = 1 / (1 + Math.exp(-12 * (t - 0.5)));
          timeValues.push(adjusted);
        }
        break;
      }
      
      default: {
        // Uniform profile (linear)
        for (let i = 1; i < numPoints - 1; i++) {
          timeValues.push(i / (numPoints - 1));
        }
      }
    }
    
    // End point
    timeValues.push(1);
    
    return timeValues;
  }
  
  /**
   * Get a deterministic random number based on the seed
   * 
   * @returns Random number between 0 and 1
   */
  protected getRandom(): number {
    if (this.randomSeed === undefined) {
      return Math.random();
    }
    
    // Simple seeded random number generator
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    return this.randomSeed / 233280;
  }
  
  /**
   * Get a normally distributed random number
   * 
   * @param mean Mean of the distribution
   * @param stdDev Standard deviation
   * @returns Random number from normal distribution
   */
  protected getNormalRandom(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.getRandom();
    const u2 = this.getRandom();
    
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    return mean + z0 * stdDev;
  }
  
  /**
   * Calculate the Euclidean distance between two points
   * 
   * @param p1 First point
   * @param p2 Second point
   * @returns Distance between the points
   */
  protected distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}