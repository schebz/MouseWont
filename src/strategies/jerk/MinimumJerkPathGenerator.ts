/**
 * MinimumJerkPathGenerator.ts
 * 
 * Implements a path generator using the minimum-jerk trajectory model
 * based on Flash & Hogan's research on human arm movements
 */

import { PathGenerator } from '../../core/PathGenerator';
import { Point, MovementOptions } from '../../core/types';

/**
 * Generates mouse movement paths using the minimum-jerk trajectory model
 * 
 * This strategy creates natural human-like cursor movements by minimizing jerk
 * (the derivative of acceleration), which has been shown to be a characteristic
 * of human motor control in point-to-point movements.
 */
export class MinimumJerkPathGenerator extends PathGenerator {
  /**
   * Unique identifier for this generator
   */
  readonly id = 'minimum_jerk';
  
  /**
   * Human-readable name for this generator
   */
  readonly name = 'Minimum-Jerk Trajectory';
  
  /**
   * Generate a path from start to end point based on movement options
   * 
   * @param start Starting point coordinates
   * @param end Ending point coordinates
   * @param options Configuration options for the movement
   * @returns Promise resolving to array of points representing the path
   */
  async generatePath(start: Point, end: Point, options: MovementOptions): Promise<Point[]> {
    // Add slight jitter to end point if overshoot is enabled
    const adjustedEnd = this.adjustEndPoint(start, end, options);
    
    // Create the raw minimum-jerk trajectory
    const rawPath = this.generateMinimumJerkTrajectory(
      start,
      adjustedEnd,
      options.pathPoints
    );
    
    // Apply jitter to the raw path based on options
    const jitteredPath = this.applyJitter(rawPath, options);
    
    // No need to apply velocity profile since minimum-jerk already has a natural profile
    // But we'll honor the explicit request if it's not 'minimum_jerk'
    if (options.velocityProfile !== 'minimum_jerk') {
      return this.applyVelocityProfile(
        jitteredPath,
        options.velocityProfile,
        options.pathPoints
      );
    }
    
    return jitteredPath;
  }
  
  /**
   * Adjust the end point to create natural overshoot if needed
   * 
   * @param start Starting point
   * @param end Target end point
   * @param options Movement options
   * @returns Adjusted end point
   */
  private adjustEndPoint(start: Point, end: Point, options: MovementOptions): Point {
    // If no overshoot requested, return the original end point
    if (options.overshootFactor <= 0) {
      return { ...end };
    }
    
    // Calculate distance between points
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only apply overshoot for longer movements
    if (distance < 50) {
      return { ...end };
    }
    
    // Calculate overshoot amount (higher for longer distances, but capped)
    const baseOvershoot = Math.min(0.2, Math.max(0.05, distance / 1000));
    const overshootAmount = baseOvershoot * options.overshootFactor * (0.8 + 0.4 * this.getRandom());
    
    // Calculate adjusted end point with overshoot
    return {
      x: end.x + dx * overshootAmount,
      y: end.y + dy * overshootAmount
    };
  }
  
  /**
   * Generate a minimum-jerk trajectory from start to end
   * 
   * @param start Starting point
   * @param end Ending point
   * @param numPoints Number of points to generate
   * @returns Array of points along the minimum-jerk trajectory
   */
  private generateMinimumJerkTrajectory(
    start: Point,
    end: Point,
    numPoints: number
  ): Point[] {
    const path: Point[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      // Normalized time parameter [0, 1]
      const t = i / (numPoints - 1);
      
      // Minimum-jerk position profile: x(t) = x₀ + (x₁ - x₀)(10t³ - 15t⁴ + 6t⁵)
      const jerkProfile = 10 * Math.pow(t, 3) - 15 * Math.pow(t, 4) + 6 * Math.pow(t, 5);
      
      // Calculate position at this time
      const x = start.x + (end.x - start.x) * jerkProfile;
      const y = start.y + (end.y - start.y) * jerkProfile;
      
      path.push({ x, y });
    }
    
    return path;
  }
  
  /**
   * Apply natural jitter to the path
   * 
   * @param path Original path
   * @param options Movement options
   * @returns Path with jitter applied
   */
  private applyJitter(path: Point[], options: MovementOptions): Point[] {
    // If no jitter requested, return the original path
    if (options.jitterAmount <= 0) {
      return path;
    }
    
    // Calculate distance between start and end points for scaling
    const start = path[0];
    const end = path[path.length - 1];
    const distance = this.distance(start, end);
    
    // Calculate base jitter amplitude (scaled by distance)
    const baseJitter = Math.min(2.5, Math.max(0.5, distance / 200));
    const jitterScale = baseJitter * options.jitterAmount;
    
    // Parameters for Ornstein-Uhlenbeck process (realistic hand tremor model)
    const theta = 0.7; // Mean reversion rate
    const sigma = 0.5 * jitterScale; // Volatility
    
    // Current jitter state
    let jitterX = 0;
    let jitterY = 0;
    
    // Apply jitter to each point except the first and last
    const jitteredPath = [{ ...path[0] }]; // Start with exact start point
    
    for (let i = 1; i < path.length - 1; i++) {
      // Update jitter using Ornstein-Uhlenbeck process
      // dX = θ(μ - X)dt + σdW, where μ = 0 (mean reversion level)
      const dt = 1.0;
      const sqrtDt = Math.sqrt(dt);
      
      // Mean reversion to zero
      jitterX = jitterX * (1 - theta * dt) + sigma * sqrtDt * this.getNormalRandom();
      jitterY = jitterY * (1 - theta * dt) + sigma * sqrtDt * this.getNormalRandom();
      
      // Apply jitter to point (scaled by distance from endpoints)
      // Less jitter near start and end points
      const normalizedPosition = i / (path.length - 1);
      const edgeWeight = 4 * normalizedPosition * (1 - normalizedPosition); // Peaks at 0.5
      
      // Apply jitter and add to path
      jitteredPath.push({
        x: path[i].x + jitterX * edgeWeight,
        y: path[i].y + jitterY * edgeWeight
      });
    }
    
    // End with exact end point
    jitteredPath.push({ ...path[path.length - 1] });
    
    return jitteredPath;
  }
}