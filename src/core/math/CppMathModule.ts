/**
 * @file CppMathModule.ts
 * @version 0.2.0
 * @lastModified 2025-11-06
 * @changelog 
 * - 0.1.0: Implemented bridge to C++ implementation via Node.js addon or WebAssembly
 * - 0.2.0: Added enhanced error handling, performance optimizations, and SIMD detection
 *
 * Bridge to high-performance C++ implementation of mathematical operations for mouse movement generation.
 * Uses Node.js N-API addon or WebAssembly to connect to the optimized C++ algorithms with SIMD acceleration.
 */

import { Point } from '../types';
import { MathModule } from '../MathModuleBridge';

/**
 * Type definition for the C++ math module when loaded as a Node.js addon
 */
interface CppMathNativeModule {
  // Core mathematical operations
  generateBezierCurve(p0: Point, p1: Point, p2: Point, p3: Point, numPoints: number): Point[];
  generateBezierPath(start: Point, end: Point, complexity: number, overshootFactor: number, jitterAmount: number, numPoints: number, seed?: number): Point[];
  generateMinimumJerkTrajectory(start: Point, end: Point, numPoints: number): Point[];
  generateOrnsteinUhlenbeckProcess(points: number, theta: number, sigma: number, dt: number, seed?: number): {
    jitterX: number[];
    jitterY: number[];
  };
  simulatePhysicsMovement(start: Point, end: Point, mass: number, springConstant: number, dampingFactor: number, 
                         timeStep: number, maxSteps: number, stoppingThreshold: number, seed?: number): Point[];
  // Alternative physics movement signature that accepts an options object
  simulatePhysicsMovement(start: Point, end: Point, options: any): Point[];
  applyVelocityProfile(path: Point[], velocityProfile: string, numPoints: number): Point[];
  
  // Module information and status
  isAvailable(): boolean;
  isSIMDAvailable(): boolean;
  version: string;
}

/**
 * Type definition for the C++ WebAssembly module
 */
interface CppMathWasmModule {
  init(): Promise<void>;
  
  // Core mathematical operations
  generateBezierCurve(p0x: number, p0y: number, p1x: number, p1y: number, 
                      p2x: number, p2y: number, p3x: number, p3y: number, 
                      numPoints: number): Float64Array;
  generateBezierPath(startX: number, startY: number, endX: number, endY: number,
                    complexity: number, overshootFactor: number, jitterAmount: number, 
                    numPoints: number, seed?: number): Float64Array;
  generateMinimumJerkTrajectory(startX: number, startY: number, endX: number, endY: number, 
                               numPoints: number): Float64Array;
  generateOrnsteinUhlenbeckProcess(points: number, theta: number, sigma: number, dt: number, seed?: number): {
    jitterX: Float64Array;
    jitterY: Float64Array;
  };
  simulatePhysicsMovement(startX: number, startY: number, endX: number, endY: number, 
                         mass: number, springConstant: number, dampingFactor: number,
                         timeStep: number, maxSteps: number, stoppingThreshold: number, seed?: number): Float64Array;
  applyVelocityProfile(pathBuffer: Float64Array, velocityProfile: string, numPoints: number): Float64Array;
  
  // Module information and status
  isAvailable(): boolean;
  isSIMDAvailable(): boolean;
  version: string;
}

/**
 * Implementation that uses either a Node.js addon or WebAssembly to connect to C++ optimized algorithms
 * with SIMD acceleration when available
 */
export class CppMathModule implements MathModule {
  /**
   * Reference to the native C++ module when running in Node.js
   */
  private nativeModule?: CppMathNativeModule;
  
  /**
   * Reference to the WebAssembly module when running in the browser
   */
  private wasmModule?: CppMathWasmModule;
  
  /**
   * Flag indicating whether the module is ready to use
   */
  private moduleReady = false;
  
  /**
   * Flag indicating whether SIMD acceleration is available
   */
  private simdAvailable = false;
  
  /**
   * Module version string
   */
  private moduleVersion = '0.0.0';
  
  /**
   * Maximum attempts to initialize the module
   */
  private readonly MAX_INIT_ATTEMPTS = 3;
  
  /**
   * Current initialization attempt
   */
  private initAttempts = 0;
  
  /**
   * Promise that resolves when initialization is complete
   */
  private initPromise: Promise<void> | null = null;
  
  /**
   * Constructor for CppMathModule
   */
  constructor() {
    this.initModule();
  }
  
  /**
   * Initialize the appropriate C++ module based on the environment
   */
  private async initModule(): Promise<void> {
    // If we're already initializing, return the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Start initialization
    this.initPromise = this._initModule();
    return this.initPromise;
  }
  
  /**
   * Private implementation of module initialization
   */
  private async _initModule(): Promise<void> {
    try {
      // Increment attempt counter
      this.initAttempts++;
      
      // Check if we're running in Node.js
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Use Node.js addon
        try {
          // Try the predefined binary location first
          try {
            this.nativeModule = require('../../../native/bin/cpp/mouse_math.node');
            this.moduleReady = true;
            console.log('Loaded C++ module from predefined binary location');
          } catch (binaryErr) {
            // Fall back to build location
            this.nativeModule = require('../../../build/Release/mouse_math.node');
            this.moduleReady = true;
            console.log('Loaded C++ module from build/Release location');
          }

          // Check SIMD availability
          if (this.nativeModule && typeof this.nativeModule.isSIMDAvailable === 'function') {
            this.simdAvailable = this.nativeModule.isSIMDAvailable();
          }

          // Get module version
          if (this.nativeModule && this.nativeModule.version) {
            this.moduleVersion = this.nativeModule.version;
          }

          console.log(`C++ math module initialized (SIMD: ${this.simdAvailable ? 'enabled' : 'disabled'}, Version: ${this.moduleVersion})`);
          return;
        } catch (addonError) {
          console.warn('Failed to load Release build of C++ math module, trying Debug build:', addonError);
          
          // Try debug build
          try {
            this.nativeModule = require('../../../build/Debug/mouse_math.node');
            this.moduleReady = true;
            
            // Check SIMD availability
            if (this.nativeModule && typeof this.nativeModule.isSIMDAvailable === 'function') {
              this.simdAvailable = this.nativeModule.isSIMDAvailable();
            }

            // Get module version
            if (this.nativeModule && this.nativeModule.version) {
              this.moduleVersion = this.nativeModule.version;
            }
            
            console.log(`C++ math module initialized from Debug build (SIMD: ${this.simdAvailable ? 'enabled' : 'disabled'}, Version: ${this.moduleVersion})`);
            return;
          } catch (debugError) {
            // Both Release and Debug builds failed, try WebAssembly or fall back to TypeScript
            console.warn('Failed to load Debug build of C++ math module:', debugError);
            throw new Error('Failed to load Node.js addon');
          }
        }
      }
      
      // We're in the browser, use WebAssembly
      console.log('Attempting to load WebAssembly module');
      try {
        // Dynamic import to avoid bundling issues
        // Note: The import will fail if the file doesn't exist, but we handle that
        let importSuccess = false;

        try {
          // Use dynamic import with a string that we know won't be statically analyzed
          // This prevents TypeScript from trying to resolve the module at compile time
          const wasmPath = '../../../build/mouse_math_wasm.js';
          const wasmModuleImport = await import(wasmPath);
          this.wasmModule = wasmModuleImport.default;
          importSuccess = true;
        } catch (importError) {
          console.warn('Failed to import WebAssembly module:', importError);
          // Create a fallback empty module to satisfy TypeScript
          this.wasmModule = {
            init: async () => {},
            isAvailable: () => false,
            isSIMDAvailable: () => false,
            version: '0.0.0',
            // Other methods will throw errors if used
            generateBezierCurve: () => { throw new Error('WASM module not available'); },
            generateBezierPath: () => { throw new Error('WASM module not available'); },
            generateMinimumJerkTrajectory: () => { throw new Error('WASM module not available'); },
            generateOrnsteinUhlenbeckProcess: () => { throw new Error('WASM module not available'); },
            simulatePhysicsMovement: () => { throw new Error('WASM module not available'); },
            applyVelocityProfile: () => { throw new Error('WASM module not available'); }
          } as any;
        }
        
        // Only try to initialize if the import succeeded
        if (importSuccess && this.wasmModule && typeof this.wasmModule.init === 'function') {
          await this.wasmModule.init();
          this.moduleReady = true;

          // Check SIMD availability
          if (this.wasmModule && typeof this.wasmModule.isSIMDAvailable === 'function') {
            this.simdAvailable = this.wasmModule.isSIMDAvailable();
          }

          // Get module version
          if (this.wasmModule && this.wasmModule.version) {
            this.moduleVersion = this.wasmModule.version;
          }

          console.log(`WebAssembly math module initialized (SIMD: ${this.simdAvailable ? 'enabled' : 'disabled'}, Version: ${this.moduleVersion})`);
        } else if (importSuccess) {
          // The import succeeded but the module didn't have an init function
          throw new Error('Invalid WebAssembly module: init method not found');
        } else {
          // The import failed, but we already created a fallback module
          // Just log the error and continue without the WASM module
          console.warn('WebAssembly module not available, using fallback');
          this.moduleReady = false;
        }
      } catch (wasmError) {
        console.warn('Failed to initialize WebAssembly module:', wasmError);
        throw new Error('Failed to load WebAssembly module');
      }
    } catch (error) {
      // If we haven't reached the maximum number of attempts, try again
      if (this.initAttempts < this.MAX_INIT_ATTEMPTS) {
        console.warn(`Attempt ${this.initAttempts} failed, retrying...`);
        
        // Wait for a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clear the init promise so we can start a new one
        this.initPromise = null;
        
        // Try again
        return this.initModule();
      }
      
      console.error('Failed to initialize C++ math module after multiple attempts:', error);
      this.moduleReady = false;
      this.initPromise = null;
    }
  }
  
  /**
   * Check if the module is available for use
   * @returns True if the module is available and ready
   */
  async isAvailable(): Promise<boolean> {
    // If module is not ready, try to initialize it
    if (!this.moduleReady) {
      try {
        await this.initModule();
      } catch (error) {
        return false;
      }
    }
    
    if (this.nativeModule && typeof this.nativeModule.isAvailable === 'function') {
      return this.nativeModule.isAvailable();
    }
    
    if (this.wasmModule && typeof this.wasmModule.isAvailable === 'function') {
      return this.wasmModule.isAvailable();
    }
    
    return this.moduleReady;
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
      // Wait for module to be ready
      if (!this.moduleReady) {
        await this.initModule();
      }
      
      // If module is still not ready, fall back to TypeScript
      if (!this.moduleReady) {
        throw new Error('C++ math module is not available');
      }
      
      // Validate inputs
      if (numPoints < 2) {
        throw new Error('numPoints must be at least 2');
      }
      
      if (this.nativeModule) {
        // Use Node.js addon
        return this.nativeModule.generateBezierCurve(p0, p1, p2, p3, numPoints);
      } else if (this.wasmModule) {
        // Use WebAssembly
        const result = this.wasmModule.generateBezierCurve(
          p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, numPoints
        );
        
        // Convert Float64Array to array of Points
        const path: Point[] = [];
        for (let i = 0; i < result.length; i += 2) {
          path.push({ x: result[i], y: result[i + 1] });
        }
        
        return path;
      }
      
      throw new Error('No C++ implementation available');
    } catch (error) {
      console.error('Error in C++ Bézier curve generation:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.generateBezierCurve(p0, p1, p2, p3, numPoints);
    }
  }
  
  /**
   * Generate a Bézier path with calculated control points for natural motion
   * 
   * @param start Starting point
   * @param end Ending point
   * @param complexity Curve complexity factor [0-1]
   * @param overshootFactor Overshoot amount [0-1]
   * @param jitterAmount Randomness amount [0-5]
   * @param numPoints Number of points to generate
   * @param seed Optional random seed for reproducible results
   * @returns Array of points along the Bézier path
   */
  async generateBezierPath(
    start: Point,
    end: Point,
    complexity: number = 0.5,
    overshootFactor: number = 0.2,
    jitterAmount: number = 1.0,
    numPoints: number = 100,
    seed?: number
  ): Promise<Point[]> {
    try {
      // Wait for module to be ready
      if (!this.moduleReady) {
        await this.initModule();
      }
      
      // If module is still not ready, fall back to TypeScript
      if (!this.moduleReady) {
        throw new Error('C++ math module is not available');
      }
      
      // Validate inputs
      if (numPoints < 2) {
        throw new Error('numPoints must be at least 2');
      }
      if (complexity < 0 || complexity > 1) {
        throw new Error('complexity must be between 0 and 1');
      }
      if (overshootFactor < 0 || overshootFactor > 1) {
        throw new Error('overshootFactor must be between 0 and 1');
      }
      if (jitterAmount < 0 || jitterAmount > 5) {
        throw new Error('jitterAmount must be between 0 and 5');
      }
      
      if (this.nativeModule) {
        // Use Node.js addon
        return this.nativeModule.generateBezierPath(
          start, end, complexity, overshootFactor, jitterAmount, numPoints, seed
        );
      } else if (this.wasmModule) {
        // Use WebAssembly
        const result = this.wasmModule.generateBezierPath(
          start.x, start.y, end.x, end.y,
          complexity, overshootFactor, jitterAmount, numPoints, seed
        );
        
        // Convert Float64Array to array of Points
        const path: Point[] = [];
        for (let i = 0; i < result.length; i += 2) {
          path.push({ x: result[i], y: result[i + 1] });
        }
        
        return path;
      }
      
      throw new Error('No C++ implementation available');
    } catch (error) {
      console.error('Error in C++ Bézier path generation:', error);
      
      // For the fallback, we'll calculate our own Bézier path
      // First get start and end point distance
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate control points with complexity factor
      const cp1 = {
        x: start.x + dx * 0.3 + (Math.random() - 0.5) * distance * 0.1 * complexity,
        y: start.y + dy * 0.3 + (Math.random() - 0.5) * distance * 0.1 * complexity
      };
      
      const cp2 = {
        x: start.x + dx * 0.7 + (Math.random() - 0.5) * distance * 0.1 * complexity,
        y: start.y + dy * 0.7 + (Math.random() - 0.5) * distance * 0.1 * complexity
      };
      
      // Use the Bézier curve method for the fallback
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.generateBezierCurve(start, cp1, cp2, end, numPoints);
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
      // Wait for module to be ready
      if (!this.moduleReady) {
        await this.initModule();
      }
      
      // If module is still not ready, fall back to TypeScript
      if (!this.moduleReady) {
        throw new Error('C++ math module is not available');
      }
      
      // Validate inputs
      if (numPoints < 2) {
        throw new Error('numPoints must be at least 2');
      }
      
      if (this.nativeModule) {
        // Use Node.js addon
        return this.nativeModule.generateMinimumJerkTrajectory(start, end, numPoints);
      } else if (this.wasmModule) {
        // Use WebAssembly
        const result = this.wasmModule.generateMinimumJerkTrajectory(
          start.x, start.y, end.x, end.y, numPoints
        );
        
        // Convert Float64Array to array of Points
        const path: Point[] = [];
        for (let i = 0; i < result.length; i += 2) {
          path.push({ x: result[i], y: result[i + 1] });
        }
        
        return path;
      }
      
      throw new Error('No C++ implementation available');
    } catch (error) {
      console.error('Error in C++ minimum-jerk trajectory generation:', error);
      
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
   * @param seed Optional random seed for reproducible results
   * @returns Array of [x, y] jitter offsets
   */
  async generateOrnsteinUhlenbeckProcess(
    points: number,
    theta: number,
    sigma: number,
    dt: number,
    seed?: number
  ): Promise<[number[], number[]]> {
    try {
      // Wait for module to be ready
      if (!this.moduleReady) {
        await this.initModule();
      }
      
      // If module is still not ready, fall back to TypeScript
      if (!this.moduleReady) {
        throw new Error('C++ math module is not available');
      }
      
      // Validate inputs
      if (points < 1) {
        throw new Error('points must be at least 1');
      }
      if (theta <= 0) {
        throw new Error('theta must be positive');
      }
      if (sigma <= 0) {
        throw new Error('sigma must be positive');
      }
      if (dt <= 0) {
        throw new Error('dt must be positive');
      }
      
      if (this.nativeModule) {
        // Use Node.js addon
        const result = this.nativeModule.generateOrnsteinUhlenbeckProcess(points, theta, sigma, dt, seed);
        return [result.jitterX, result.jitterY];
      } else if (this.wasmModule) {
        // Use WebAssembly
        const result = this.wasmModule.generateOrnsteinUhlenbeckProcess(points, theta, sigma, dt, seed);
        
        // Convert Float64Arrays to number arrays
        return [Array.from(result.jitterX), Array.from(result.jitterY)];
      }
      
      throw new Error('No C++ implementation available');
    } catch (error) {
      console.error('Error in C++ Ornstein-Uhlenbeck process generation:', error);
      
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
      // Wait for module to be ready
      if (!this.moduleReady) {
        await this.initModule();
      }
      
      // If module is still not ready, fall back to TypeScript
      if (!this.moduleReady) {
        throw new Error('C++ math module is not available');
      }
      
      if (this.nativeModule) {
        // Use Node.js addon
        return this.nativeModule.simulatePhysicsMovement(start, end, options);
      } else if (this.wasmModule) {
        // Extract options with defaults
        const {
          mass = 1.0,
          springConstant = 8.0,
          dampingFactor = 0.7,
          timeStep = 0.016,
          maxSteps = 1000,
          stoppingThreshold = 0.1,
          seed
        } = options;
        
        // Validate inputs
        if (mass <= 0) {
          throw new Error('mass must be positive');
        }
        if (springConstant <= 0) {
          throw new Error('springConstant must be positive');
        }
        if (timeStep <= 0) {
          throw new Error('timeStep must be positive');
        }
        if (maxSteps <= 0) {
          throw new Error('maxSteps must be positive');
        }
        if (stoppingThreshold <= 0) {
          throw new Error('stoppingThreshold must be positive');
        }
        
        const result = this.wasmModule.simulatePhysicsMovement(
          start.x, start.y, end.x, end.y,
          mass, springConstant, dampingFactor,
          timeStep, maxSteps, stoppingThreshold,
          seed
        );
        
        // Convert Float64Array to array of Points
        const path: Point[] = [];
        for (let i = 0; i < result.length; i += 2) {
          path.push({ x: result[i], y: result[i + 1] });
        }
        
        return path;
      }
      
      throw new Error('No C++ implementation available');
    } catch (error) {
      console.error('Error in C++ physics simulation:', error);
      
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
      // Wait for module to be ready
      if (!this.moduleReady) {
        await this.initModule();
      }
      
      // If module is still not ready, fall back to TypeScript
      if (!this.moduleReady) {
        throw new Error('C++ math module is not available');
      }
      
      // Validate inputs
      if (path.length < 2) {
        throw new Error('Path must contain at least 2 points');
      }
      if (numPoints < 2) {
        throw new Error('numPoints must be at least 2');
      }
      
      if (this.nativeModule) {
        // Use Node.js addon
        return this.nativeModule.applyVelocityProfile(path, velocityProfile, numPoints);
      } else if (this.wasmModule) {
        // Use WebAssembly
        // Convert path to Float64Array
        const pathBuffer = new Float64Array(path.length * 2);
        for (let i = 0; i < path.length; i++) {
          pathBuffer[i * 2] = path[i].x;
          pathBuffer[i * 2 + 1] = path[i].y;
        }
        
        const result = this.wasmModule.applyVelocityProfile(pathBuffer, velocityProfile, numPoints);
        
        // Convert Float64Array to array of Points
        const resultPath: Point[] = [];
        for (let i = 0; i < result.length; i += 2) {
          resultPath.push({ x: result[i], y: result[i + 1] });
        }
        
        return resultPath;
      }
      
      throw new Error('No C++ implementation available');
    } catch (error) {
      console.error('Error in C++ velocity profile application:', error);
      
      // Fallback to TypeScript implementation
      const { TypeScriptMathModule } = await import('./TypeScriptMathModule');
      const fallback = new TypeScriptMathModule();
      return fallback.applyVelocityProfile(path, velocityProfile, numPoints);
    }
  }
  
  /**
   * Get information about the C++ math module
   * 
   * @returns Object containing module information
   */
  async getModuleInfo(): Promise<{
    moduleReady: boolean;
    moduleType: 'native' | 'wasm' | 'none';
    simdAvailable: boolean;
    version: string;
  }> {
    // Make sure module is initialized
    if (!this.moduleReady) {
      await this.initModule();
    }
    
    return {
      moduleReady: this.moduleReady,
      moduleType: this.nativeModule ? 'native' : (this.wasmModule ? 'wasm' : 'none'),
      simdAvailable: this.simdAvailable,
      version: this.moduleVersion
    };
  }
}