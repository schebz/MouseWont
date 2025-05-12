/**
 * @file TypeScriptMathModule.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @changelog Implemented pure TypeScript fallback for mathematical operations
 *
 * Pure TypeScript implementation of mathematical operations for mouse movement generation.
 * Used as fallback when optimized implementations are not available.
 */

import { Point } from '../types';
import { MathModule } from '../MathModuleBridge';

/**
 * Pure TypeScript implementation of the MathModule interface
 */
export class TypeScriptMathModule implements MathModule {
  /**
   * Generate points along a cubic Bézier curve
   * 
   * @param p0 Start point
   * @param p1 First control point
   * @param p2 Second control point
   * @param p3 End point
   * @param numPoints Number of points to generate
   * @returns Array of points along the curve
   */
  async generateBezierCurve(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    numPoints: number
  ): Promise<Point[]> {
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
  
  /**
   * Generate a minimum-jerk trajectory from start to end
   * 
   * @param start Starting point
   * @param end Ending point
   * @param numPoints Number of points to generate
   * @returns Array of points along the minimum-jerk trajectory
   */
  async generateMinimumJerkTrajectory(
    start: Point,
    end: Point,
    numPoints: number
  ): Promise<Point[]> {
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
   * Generate Ornstein-Uhlenbeck jitter process
   * 
   * @param points Number of jitter points to generate
   * @param theta Mean reversion rate
   * @param sigma Volatility
   * @param dt Time step
   * @returns Array of [x, y] jitter offsets
   */
  async generateOrnsteinUhlenbeckProcess(
    points: number,
    theta: number,
    sigma: number,
    dt: number
  ): Promise<[number[], number[]]> {
    const jitterX: number[] = Array(points).fill(0);
    const jitterY: number[] = Array(points).fill(0);
    
    // Start with zero jitter
    jitterX[0] = 0;
    jitterY[0] = 0;
    
    // Generate the process
    for (let i = 1; i < points; i++) {
      // Update jitter using Ornstein-Uhlenbeck process
      // dX = θ(μ - X)dt + σdW, where μ = 0 (mean reversion level)
      const sqrtDt = Math.sqrt(dt);
      
      // Generate Gaussian random numbers using Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
      
      // Update jitter values with mean reversion to zero
      jitterX[i] = jitterX[i-1] * (1 - theta * dt) + sigma * sqrtDt * z1;
      jitterY[i] = jitterY[i-1] * (1 - theta * dt) + sigma * sqrtDt * z2;
    }
    
    return [jitterX, jitterY];
  }
  
  /**
   * Simulate physics-based movement
   * 
   * @param start Starting point
   * @param end Target ending point
   * @param options Physics simulation parameters
   * @returns Array of points representing the path
   */
  async simulatePhysicsMovement(
    start: Point,
    end: Point,
    options: any
  ): Promise<Point[]> {
    const {
      mass = 1.0,
      springConstant = 8.0,
      dampingFactor = 0.7,
      timeStep = 0.016, // ~60fps
      maxSteps = 1000,
      stoppingThreshold = 0.1
    } = options;
    
    // Calculate the natural frequency
    const omega = Math.sqrt(springConstant / mass);
    
    // Calculate the damping ratio
    const zeta = dampingFactor / (2 * Math.sqrt(mass * springConstant));
    
    // Current state
    const position = { x: start.x, y: start.y };
    const velocity = { x: 0, y: 0 };
    
    // Path
    const path: Point[] = [{ ...position }];
    
    // Run simulation
    for (let step = 0; step < maxSteps; step++) {
      // Calculate spring force (proportional to distance from target)
      const dx = end.x - position.x;
      const dy = end.y - position.y;
      
      // Calculate acceleration
      const ax = (springConstant * dx - dampingFactor * velocity.x) / mass;
      const ay = (springConstant * dy - dampingFactor * velocity.y) / mass;
      
      // Update velocity (semi-implicit Euler integration)
      velocity.x += ax * timeStep;
      velocity.y += ay * timeStep;
      
      // Update position
      position.x += velocity.x * timeStep;
      position.y += velocity.y * timeStep;
      
      // Add to path
      path.push({ ...position });
      
      // Check if we're close enough to the target and almost stopped
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      if (distance < stoppingThreshold && speed < stoppingThreshold) {
        break;
      }
    }
    
    return path;
  }
  
  /**
   * Apply a velocity profile to reparameterize path points
   * 
   * @param path Raw path with uniform time distribution
   * @param velocityProfile Type of velocity profile to apply
   * @param numPoints Number of points in the output path
   * @returns Reparameterized path with the specified velocity profile
   */
  async applyVelocityProfile(
    path: Point[],
    velocityProfile: string,
    numPoints: number
  ): Promise<Point[]> {
    // If the velocity profile is uniform, return the path as is
    if (velocityProfile === 'uniform') {
      return path;
    }
    
    // Create a new array for the reparameterized path
    const reparameterizedPath: Point[] = [];
    
    // Generate the time values based on the velocity profile
    const timeValues = this.generateTimeValues(numPoints, velocityProfile);
    
    // For each time value, find the corresponding point on the path
    for (const t of timeValues) {
      const index = Math.floor(t * (path.length - 1));
      const fraction = t * (path.length - 1) - index;
      
      // If we're at the last point, just return it
      if (index >= path.length - 1) {
        reparameterizedPath.push(path[path.length - 1]);
        continue;
      }
      
      // Otherwise, linearly interpolate between the two nearest points
      const p1 = path[index];
      const p2 = path[index + 1];
      
      reparameterizedPath.push({
        x: p1.x + fraction * (p2.x - p1.x),
        y: p1.y + fraction * (p2.y - p1.y)
      });
    }
    
    return reparameterizedPath;
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
}