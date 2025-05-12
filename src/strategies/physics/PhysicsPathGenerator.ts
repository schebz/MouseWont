/**
 * PhysicsPathGenerator.ts
 * 
 * Implements a path generator using physics-based simulation model
 * with spring-mass-damper dynamics
 */

import { PathGenerator } from '../../core/PathGenerator';
import { Point, MovementOptions } from '../../core/types';

/**
 * Represents the state of a physical system
 */
interface PhysicalState {
  // Position
  x: number;
  y: number;
  // Velocity
  vx: number;
  vy: number;
  // Acceleration
  ax: number;
  ay: number;
  // Time
  t: number;
}

/**
 * Generates mouse movement paths using a physics-based simulation
 * 
 * This strategy simulates cursor movement using a spring-mass-damper system,
 * which creates realistic acceleration, deceleration, and optional overshooting
 * behavior similar to human hand movements.
 */
export class PhysicsPathGenerator extends PathGenerator {
  /**
   * Unique identifier for this generator
   */
  readonly id = 'physics';
  
  /**
   * Human-readable name for this generator
   */
  readonly name = 'Physics-Based Simulation';
  
  /**
   * Generate a path from start to end point based on movement options
   * 
   * @param start Starting point coordinates
   * @param end Ending point coordinates
   * @param options Configuration options for the movement
   * @returns Promise resolving to array of points representing the path
   */
  async generatePath(start: Point, end: Point, options: MovementOptions): Promise<Point[]> {
    // Calculate the appropriate physics parameters based on the movement options
    const physicsParams = this.calculatePhysicsParameters(start, end, options);
    
    // Simulate the spring-mass-damper system
    const rawPath = this.simulatePhysics(start, end, physicsParams, options.pathPoints);
    
    // Apply jitter to the path
    const jitteredPath = this.applyPhysicsJitter(rawPath, options);
    
    // Apply velocity profile reparameterization if requested
    if (options.velocityProfile !== 'physics') {
      return this.applyVelocityProfile(
        jitteredPath,
        options.velocityProfile,
        options.pathPoints
      );
    }
    
    return jitteredPath;
  }
  
  /**
   * Calculate physics parameters based on movement options
   * 
   * @param start Starting point
   * @param end Ending point
   * @param options Movement options
   * @returns Physics parameter object
   */
  private calculatePhysicsParameters(
    start: Point,
    end: Point,
    options: MovementOptions
  ): {
    mass: number;
    springConstant: number;
    dampingCoefficient: number;
    timeStep: number;
    totalTime: number;
  } {
    // Calculate distance for scaling
    const distance = this.distance(start, end);
    
    // Base parameters that work well for typical movements
    let mass = 1.0;
    
    // Spring constant affects "stiffness" - higher values create faster, more direct movements
    // Scale based on distance and complexity
    let baseK = 1000 / Math.max(1, options.duration);
    let springConstant = baseK * (1.0 - 0.5 * options.complexity);
    
    // Damping coefficient affects "smoothness" - critical damping at 2*sqrt(k*m)
    // We want slight underdamping for more natural movement
    const criticalDamping = 2 * Math.sqrt(springConstant * mass);
    
    // Damping ratio ζ (zeta): 
    // ζ < 1: underdamped (oscillation)
    // ζ = 1: critically damped (no oscillation, fastest approach)
    // ζ > 1: overdamped (slow approach)
    let dampingRatio = 0.7; // Default: slightly underdamped
    
    // Adjust damping ratio based on overshoot factor
    // More overshoot = less damping = more oscillation
    if (options.overshootFactor > 0) {
      dampingRatio = Math.max(0.3, 0.8 - options.overshootFactor * 0.5);
    }
    
    // Calculate damping coefficient from ratio
    let dampingCoefficient = dampingRatio * criticalDamping;
    
    // Time step for simulation (lower = more accurate but slower)
    const timeStep = options.duration / (options.pathPoints * 10);
    
    // Total simulation time (slightly longer than requested duration to allow for settling)
    const totalTime = options.duration * 1.2;
    
    return {
      mass,
      springConstant,
      dampingCoefficient,
      timeStep,
      totalTime
    };
  }
  
  /**
   * Simulate the physics of a spring-mass-damper system
   * 
   * @param start Starting point
   * @param end Target end point
   * @param params Physics parameters
   * @param numPoints Number of points to include in the result
   * @returns Array of points along the simulated path
   */
  private simulatePhysics(
    start: Point,
    end: Point,
    params: {
      mass: number;
      springConstant: number;
      dampingCoefficient: number;
      timeStep: number;
      totalTime: number;
    },
    numPoints: number
  ): Point[] {
    // Initial state
    const initialState: PhysicalState = {
      x: start.x,
      y: start.y,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      t: 0
    };
    
    // Storage for simulation results
    const simulationPoints: PhysicalState[] = [initialState];
    
    // Current state
    let currentState = { ...initialState };
    
    // Run simulation until we reach total time
    while (currentState.t < params.totalTime) {
      // Calculate spring force: F = -k * (x - target)
      const forceX = params.springConstant * (end.x - currentState.x);
      const forceY = params.springConstant * (end.y - currentState.y);
      
      // Calculate damping force: F = -c * v
      const dampingForceX = -params.dampingCoefficient * currentState.vx;
      const dampingForceY = -params.dampingCoefficient * currentState.vy;
      
      // Net force: spring + damping
      const netForceX = forceX + dampingForceX;
      const netForceY = forceY + dampingForceY;
      
      // Calculate acceleration from Newton's second law: a = F/m
      const ax = netForceX / params.mass;
      const ay = netForceY / params.mass;
      
      // Update velocity: v = v + a * dt
      const vx = currentState.vx + ax * params.timeStep;
      const vy = currentState.vy + ay * params.timeStep;
      
      // Update position: x = x + v * dt
      const x = currentState.x + vx * params.timeStep;
      const y = currentState.y + vy * params.timeStep;
      
      // Update current state with new values
      currentState = {
        x,
        y,
        vx,
        vy,
        ax,
        ay,
        t: currentState.t + params.timeStep
      };
      
      // Store the new state
      simulationPoints.push(currentState);
    }
    
    // Sample the simulation to get the desired number of points
    const result: Point[] = [];
    
    // Always include the exact start point
    result.push({ x: start.x, y: start.y });
    
    // Sample the middle points
    const interval = (simulationPoints.length - 2) / (numPoints - 2);
    
    for (let i = 1; i < numPoints - 1; i++) {
      const index = Math.floor(i * interval);
      result.push({
        x: simulationPoints[index].x,
        y: simulationPoints[index].y
      });
    }
    
    // Always include the exact end point of the simulation
    const finalPoint = simulationPoints[simulationPoints.length - 1];
    result.push({ x: finalPoint.x, y: finalPoint.y });
    
    return result;
  }
  
  /**
   * Apply physics-based jitter to the path
   * 
   * @param path Original path
   * @param options Movement options
   * @returns Path with jitter applied
   */
  private applyPhysicsJitter(path: Point[], options: MovementOptions): Point[] {
    // If no jitter requested, return the original path
    if (options.jitterAmount <= 0) {
      return path;
    }
    
    // Physiological tremor simulation using an Ornstein-Uhlenbeck process
    // Different parameters than minimum-jerk to create a more "shaky" effect
    
    // Parameters for Ornstein-Uhlenbeck process
    const theta = 0.9; // Higher mean reversion rate
    const sigma = 0.7 * options.jitterAmount; // Scale by jitter amount
    
    // Current jitter state
    let jitterX = 0;
    let jitterY = 0;
    
    // Apply jitter to each point except the first and last
    const jitteredPath = [{ ...path[0] }]; // Start with exact start point
    
    for (let i = 1; i < path.length - 1; i++) {
      // Update jitter using Ornstein-Uhlenbeck process
      const dt = 1.0;
      const sqrtDt = Math.sqrt(dt);
      
      // Mean reversion to zero
      jitterX = jitterX * (1 - theta * dt) + sigma * sqrtDt * this.getNormalRandom();
      jitterY = jitterY * (1 - theta * dt) + sigma * sqrtDt * this.getNormalRandom();
      
      // Higher-frequency component for physics-based tremor
      const highFreqX = sigma * 0.3 * this.getNormalRandom();
      const highFreqY = sigma * 0.3 * this.getNormalRandom();
      
      // Apply combined jitter
      jitteredPath.push({
        x: path[i].x + jitterX + highFreqX,
        y: path[i].y + jitterY + highFreqY
      });
    }
    
    // End with exact end point
    jitteredPath.push({ ...path[path.length - 1] });
    
    return jitteredPath;
  }
}