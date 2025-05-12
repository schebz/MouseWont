/**
 * @file MathModuleBridge.ts
 * @version 0.2.0
 * @lastModified 2025-11-05
 * @author Mika Tokamak
 * @changelog
 * - 0.1.0: Added modular bridge interface for connecting to optimized mathematical implementations
 * - 0.2.0: Enhanced interface with improved module selection, initialization, and benchmarking
 *
 * Bridge interface for connecting to optimized mathematical implementations
 * in other languages like C++, Python, and Fortran from the parent project.
 */

import { Point, MovementOptions } from './types';

/**
 * Interface that defines all mathematical operations that can be accelerated
 * through external implementations in C++, Python, or Fortran
 */
export interface MathModule {
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
  generateBezierCurve(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    numPoints: number
  ): Promise<Point[]>;
  
  /**
   * Generate a minimum-jerk trajectory from start to end
   * 
   * @param start Starting point
   * @param end Ending point
   * @param numPoints Number of points to generate
   * @returns Array of points along the minimum-jerk trajectory
   */
  generateMinimumJerkTrajectory(
    start: Point,
    end: Point,
    numPoints: number
  ): Promise<Point[]>;
  
  /**
   * Generate Ornstein-Uhlenbeck jitter process
   * 
   * @param points Number of jitter points to generate
   * @param theta Mean reversion rate
   * @param sigma Volatility
   * @param dt Time step
   * @returns Array of [x, y] jitter offsets
   */
  generateOrnsteinUhlenbeckProcess(
    points: number,
    theta: number,
    sigma: number,
    dt: number
  ): Promise<[number[], number[]]>;
  
  /**
   * Simulate physics-based movement
   * 
   * @param start Starting point
   * @param end Target ending point
   * @param options Physics simulation parameters
   * @returns Array of points representing the path
   */
  simulatePhysicsMovement(
    start: Point,
    end: Point,
    options: any
  ): Promise<Point[]>;
  
  /**
   * Apply a velocity profile to reparameterize path points
   * 
   * @param path Raw path with uniform time distribution
   * @param velocityProfile Type of velocity profile to apply
   * @param numPoints Number of points in the output path
   * @returns Reparameterized path with the specified velocity profile
   */
  applyVelocityProfile(
    path: Point[],
    velocityProfile: string,
    numPoints: number
  ): Promise<Point[]>;
  
  /**
   * Check if this module implementation is available and functional
   * @returns True if the module is available and working
   */
  isAvailable?(): Promise<boolean>;
}

/**
 * Implementation types available for math acceleration
 */
export enum MathModuleType {
  TYPESCRIPT = 'typescript', // Pure TypeScript implementation (fallback)
  CPP = 'cpp',               // C++ implementation via Node.js addon or WebAssembly
  PYTHON = 'python',         // Python implementation via HTTP API
  FORTRAN = 'fortran'        // Fortran implementation via compiled library
}

/**
 * Factory for creating MathModule instances
 */
export class MathModuleFactory {
  private static instances: Map<MathModuleType, MathModule> = new Map();
  private static activeType: MathModuleType = MathModuleType.TYPESCRIPT;
  private static isInitialized: boolean = false;
  private static isInitializing: boolean = false;
  private static initializationPromise: Promise<void> | null = null;
  
  /**
   * Initialize the math module system by checking which modules are available
   * and establishing the optimal default
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    if (this.isInitializing) {
      return this.initializationPromise as Promise<void>;
    }
    
    this.isInitializing = true;
    this.initializationPromise = this.initializeModules();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }
  
  /**
   * Private method to initialize all available modules
   */
  private static async initializeModules(): Promise<void> {
    // TypeScript implementation (always available)
    const tsModule = await this.createTypeScriptModule();
    this.instances.set(MathModuleType.TYPESCRIPT, tsModule);
    
    // Try to initialize C++ module
    try {
      const cppModule = await this.createCppModule();
      if (cppModule.isAvailable && await cppModule.isAvailable()) {
        this.instances.set(MathModuleType.CPP, cppModule);
        console.log('C++ math module initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize C++ math module:', error);
    }
    
    // Try to initialize Python module
    try {
      const pythonModule = await this.createPythonModule();
      if (pythonModule.isAvailable && await pythonModule.isAvailable()) {
        this.instances.set(MathModuleType.PYTHON, pythonModule);
        console.log('Python math module initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize Python math module:', error);
    }
    
    // Try to initialize Fortran module
    try {
      const fortranModule = await this.createFortranModule();
      if (fortranModule.isAvailable && await fortranModule.isAvailable()) {
        this.instances.set(MathModuleType.FORTRAN, fortranModule);
        console.log('Fortran math module initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize Fortran math module:', error);
    }
    
    // Set the active type to the best available
    this.activeType = await this.getBestAvailableType();
    console.log(`Using ${this.activeType} as default math module`);
  }
  
  /**
   * Get a MathModule instance of the specified type
   * 
   * @param type Type of math module implementation to use
   * @returns MathModule instance
   */
  static async getModule(type: MathModuleType = MathModuleType.TYPESCRIPT): Promise<MathModule> {
    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // If the requested type is not available, use the active type
    if (!this.instances.has(type)) {
      console.warn(`Math module type ${type} not available, using ${this.activeType} instead`);
      type = this.activeType;
    }
    
    // Return the requested module
    return this.instances.get(type)!;
  }
  
  /**
   * Create a pure TypeScript implementation
   * @returns TypeScript MathModule implementation
   */
  private static async createTypeScriptModule(): Promise<MathModule> {
    // Import the TypeScript implementation dynamically
    const { TypeScriptMathModule } = await import('./math/TypeScriptMathModule');
    return new TypeScriptMathModule();
  }
  
  /**
   * Create a C++ implementation
   * @returns C++ MathModule implementation
   */
  private static async createCppModule(): Promise<MathModule> {
    try {
      // Import the C++ bridge implementation dynamically
      const { CppMathModule } = await import('./math/CppMathModule');
      return new CppMathModule();
    } catch (error) {
      console.warn('Failed to load C++ math module, falling back to TypeScript:', error);
      return this.createTypeScriptModule();
    }
  }
  
  /**
   * Create a Python implementation
   * @returns Python MathModule implementation
   */
  private static async createPythonModule(): Promise<MathModule> {
    try {
      // Import the Python bridge implementation dynamically
      const { PythonMathModule } = await import('./math/PythonMathModule');
      return new PythonMathModule();
    } catch (error) {
      console.warn('Failed to load Python math module, falling back to TypeScript:', error);
      return this.createTypeScriptModule();
    }
  }
  
  /**
   * Create a Fortran implementation
   * @returns Fortran MathModule implementation
   */
  private static async createFortranModule(): Promise<MathModule> {
    try {
      // Import the Fortran bridge implementation dynamically
      const { FortranMathModule } = await import('./math/FortranMathModule');
      return new FortranMathModule();
    } catch (error) {
      console.warn('Failed to load Fortran math module, falling back to TypeScript:', error);
      return this.createTypeScriptModule();
    }
  }
  
  /**
   * Set the active math module type
   * 
   * @param type Module type to set as active
   * @returns True if the module type was set successfully
   */
  static async setActiveType(type: MathModuleType): Promise<boolean> {
    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Check if requested type is available
    if (!this.instances.has(type)) {
      console.warn(`Cannot set active type to ${type}, not available`);
      return false;
    }
    
    this.activeType = type;
    console.log(`Active math module set to ${type}`);
    return true;
  }
  
  /**
   * Get the currently active math module type
   * @returns Current active math module type
   */
  static getCurrentType(): MathModuleType {
    return this.activeType;
  }
  
  /**
   * Check if a specific module type is available
   * 
   * @param type Module type to check
   * @returns True if the module is available
   */
  static async isModuleAvailable(type: MathModuleType): Promise<boolean> {
    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.instances.has(type);
  }
  
  /**
   * Get the best available math module type based on availability and performance
   * 
   * @returns Best available math module type
   */
  static async getBestAvailableType(): Promise<MathModuleType> {
    // First check if any modules are available besides TypeScript
    const availableTypes: MathModuleType[] = [];
    
    for (const type of [
      MathModuleType.CPP,
      MathModuleType.PYTHON,
      MathModuleType.FORTRAN,
      MathModuleType.TYPESCRIPT
    ]) {
      if (this.instances.has(type)) {
        availableTypes.push(type);
      }
    }
    
    // If only TypeScript is available, return it
    if (availableTypes.length === 1 && availableTypes[0] === MathModuleType.TYPESCRIPT) {
      return MathModuleType.TYPESCRIPT;
    }
    
    // If multiple options are available, prefer optimized implementations in this order:
    // 1. C++ (typically fastest for most operations)
    // 2. Fortran (fastest for physics simulations)
    // 3. Python (good for complex operations)
    // 4. TypeScript (fallback)
    const preferredOrder = [
      MathModuleType.CPP,
      MathModuleType.FORTRAN,
      MathModuleType.PYTHON,
      MathModuleType.TYPESCRIPT
    ];
    
    for (const type of preferredOrder) {
      if (this.instances.has(type)) {
        return type;
      }
    }
    
    // Default to TypeScript if nothing else is available
    return MathModuleType.TYPESCRIPT;
  }
  
  /**
   * Run performance benchmarks to determine the fastest module
   * for different operations and movement types
   * 
   * @returns Best module type to use based on benchmarks
   */
  static async benchmarkAndSelectBest(): Promise<MathModuleType> {
    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Define test cases
    const testCases = [
      {
        name: 'Short Bezier',
        operation: 'bezier',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        points: 50
      },
      {
        name: 'Long Bezier',
        operation: 'bezier',
        start: { x: 0, y: 0 },
        end: { x: 1000, y: 500 },
        points: 200
      },
      {
        name: 'Minimum Jerk',
        operation: 'minimumJerk',
        start: { x: 0, y: 0 },
        end: { x: 500, y: 300 },
        points: 100
      },
      {
        name: 'Physics Simulation',
        operation: 'physics',
        start: { x: 0, y: 0 },
        end: { x: 800, y: 400 },
        options: {
          mass: 1.0,
          springConstant: 8.0,
          dampingFactor: 0.7
        }
      }
    ];
    
    // Available module types to test (filter to only available ones)
    const availableTypes: MathModuleType[] = [];
    for (const type of Object.values(MathModuleType)) {
      if (this.instances.has(type)) {
        availableTypes.push(type as MathModuleType);
      }
    }
    
    // If only TypeScript is available, return it immediately
    if (availableTypes.length === 1 && availableTypes[0] === MathModuleType.TYPESCRIPT) {
      return MathModuleType.TYPESCRIPT;
    }
    
    // Run benchmarks
    const results: Record<MathModuleType, number> = {
      [MathModuleType.TYPESCRIPT]: 0,
      [MathModuleType.CPP]: 0,
      [MathModuleType.PYTHON]: 0,
      [MathModuleType.FORTRAN]: 0
    };
    
    // Run each test case for each available module
    for (const testCase of testCases) {
      for (const moduleType of availableTypes) {
        const module = await this.getModule(moduleType);
        
        // Measure execution time (average of 3 runs)
        let totalTime = 0;
        const numRuns = 3;
        
        for (let run = 0; run < numRuns; run++) {
          const start = performance.now();
          
          // Run the appropriate operation
          switch (testCase.operation) {
            case 'bezier':
              // Simple test with control points between start and end
              const p1 = {
                x: testCase.start.x + (testCase.end.x - testCase.start.x) / 3,
                y: testCase.start.y + (testCase.end.y - testCase.start.y) / 3
              };
              const p2 = {
                x: testCase.start.x + 2 * (testCase.end.x - testCase.start.x) / 3,
                y: testCase.start.y + 2 * (testCase.end.y - testCase.start.y) / 3
              };
              await module.generateBezierCurve(
                testCase.start,
                p1,
                p2,
                testCase.end,
                testCase.points || 100
              );
              break;
              
            case 'minimumJerk':
              await module.generateMinimumJerkTrajectory(
                testCase.start,
                testCase.end,
                testCase.points || 100
              );
              break;
              
            case 'physics':
              await module.simulatePhysicsMovement(
                testCase.start,
                testCase.end,
                testCase.options
              );
              break;
          }
          
          const end = performance.now();
          totalTime += (end - start);
        }
        
        // Calculate average time
        const avgTime = totalTime / numRuns;
        
        // Add inverse of duration to results (faster = higher score)
        // Weight the score by operation type (higher weights for more common operations)
        let weight = 1.0;
        switch (testCase.operation) {
          case 'bezier':
            weight = 1.5;
            break;
          case 'minimumJerk':
            weight = 1.2;
            break;
          case 'physics':
            weight = 0.8;
            break;
        }
        
        results[moduleType] += (1000 / avgTime) * weight;
      }
    }
    
    // Find the module with the highest score
    let bestModule = MathModuleType.TYPESCRIPT;
    let bestScore = results[MathModuleType.TYPESCRIPT];
    
    for (const [moduleType, score] of Object.entries(results)) {
      if (score > bestScore && this.instances.has(moduleType as MathModuleType)) {
        bestModule = moduleType as MathModuleType;
        bestScore = score;
      }
    }
    
    console.log('Math module benchmark results:', results);
    console.log('Selected best module:', bestModule);
    
    // Set the active type to the benchmark winner
    this.activeType = bestModule;
    
    return bestModule;
  }
}

// Auto-initialize the math module system when this file is imported
MathModuleFactory.initialize().catch(error => {
  console.error('Error initializing math modules:', error);
});