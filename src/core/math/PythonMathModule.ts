/**
 * @file PythonMathModule.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @changelog Implemented bridge to Python implementation via HTTP API
 *
 * Bridge to Python implementation of mathematical operations for mouse movement generation.
 * Connects to a Python server running the optimized algorithms from the parent project.
 */

import { Point } from '../types';
import { MathModule } from '../MathModuleBridge';

/**
 * Python implementation of the MathModule interface
 * Uses HTTP requests to communicate with a Python server
 */
export class PythonMathModule implements MathModule {
  /**
   * Base URL for the Python server
   */
  private baseUrl: string = 'http://localhost:3000/api';
  
  /**
   * Constructor for PythonMathModule
   * 
   * @param serverUrl Optional custom server URL
   */
  constructor(serverUrl?: string) {
    if (serverUrl) {
      this.baseUrl = serverUrl;
    }
  }
  
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
    try {
      const response = await fetch(`${this.baseUrl}/bezier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p0, p1, p2, p3, numPoints
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.path;
    } catch (error) {
      console.error('Error in Python Bézier curve generation:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.generateBezierCurve(p0, p1, p2, p3, numPoints);
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/minimum-jerk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start, end, numPoints
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.path;
    } catch (error) {
      console.error('Error in Python minimum-jerk trajectory generation:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.generateMinimumJerkTrajectory(start, end, numPoints);
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/ou-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points, theta, sigma, dt
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return [data.jitterX, data.jitterY];
    } catch (error) {
      console.error('Error in Python Ornstein-Uhlenbeck process generation:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.generateOrnsteinUhlenbeckProcess(points, theta, sigma, dt);
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/physics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start, end, options
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.path;
    } catch (error) {
      console.error('Error in Python physics simulation:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.simulatePhysicsMovement(start, end, options);
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/velocity-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path, velocityProfile, numPoints
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.path;
    } catch (error) {
      console.error('Error in Python velocity profile application:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.applyVelocityProfile(path, velocityProfile, numPoints);
    }
  }
  
  /**
   * Check if the Python server is running
   * 
   * @returns True if the server is available
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET'
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}