/**
 * StrategyFactory.ts
 *
 * Factory for creating movement strategy instances
 */

import { PathGenerator } from '../core/PathGenerator';
import { MovementStrategy } from '../core/types';
import { BezierPathGenerator } from './bezier/BezierPathGenerator';
import { PhysicsPathGenerator } from './physics/PhysicsPathGenerator';
import { MinimumJerkPathGenerator } from './jerk/MinimumJerkPathGenerator';
import { CompositePathGenerator } from './composite/CompositePathGenerator';
import { AdaptivePathGenerator } from './adaptive/AdaptivePathGenerator';
import { MathModuleFactory, MathModuleType } from '../core/MathModuleBridge';

/**
 * Factory class for creating path generator strategy instances
 *
 * Uses the Factory Method pattern to create strategy objects
 * without exposing the instantiation logic to the client.
 */
export class StrategyFactory {
  /**
   * Map of cached strategy instances
   */
  private strategyInstances: Map<string, PathGenerator> = new Map();

  /**
   * The type of math module to use
   */
  private mathModuleType: MathModuleType = MathModuleType.TYPESCRIPT;

  /**
   * Flag indicating whether the math module has been initialized
   */
  private initialized = false;

  /**
   * Constructor for StrategyFactory
   */
  constructor() {
    // Initialize math module in background
    this.initMathModule();
  }

  /**
   * Initialize the math module
   */
  private async initMathModule(): Promise<void> {
    try {
      // Run benchmarks to select the best module
      this.mathModuleType = await MathModuleFactory.benchmarkAndSelectBest();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing math module:', error);
      // Fallback to TypeScript implementation
      this.mathModuleType = MathModuleType.TYPESCRIPT;
      this.initialized = true;
    }
  }

  /**
   * Create a path generator based on the specified strategy
   *
   * @param strategy Type of movement strategy to create
   * @param randomSeed Optional random seed for reproducibility
   * @returns Instance of the requested path generator
   */
  async createStrategy(strategy: MovementStrategy, randomSeed?: number): Promise<PathGenerator> {
    // Wait for initialization if not done yet
    if (!this.initialized) {
      await this.initMathModule();
    }

    // Create a cache key
    const cacheKey = `${strategy}-${randomSeed || 'default'}-${this.mathModuleType}`;

    // Check if we already have an instance with these parameters
    if (this.strategyInstances.has(cacheKey)) {
      return this.strategyInstances.get(cacheKey)!;
    }

    // Get the math module
    const mathModule = await MathModuleFactory.getModule(this.mathModuleType);

    // Create a new instance based on the strategy type
    let instance: PathGenerator;

    switch (strategy) {
      case MovementStrategy.BEZIER:
        try {
          // First try with both parameters
          instance = new BezierPathGenerator(randomSeed, mathModule);
        } catch (error) {
          // Fallback to just randomSeed
          instance = new BezierPathGenerator(randomSeed);
        }
        break;

      case MovementStrategy.PHYSICS:
        // PhysicsPathGenerator doesn't accept mathModule parameter
        instance = new PhysicsPathGenerator(randomSeed);
        break;

      case MovementStrategy.MINIMUM_JERK:
        // MinimumJerkPathGenerator doesn't accept mathModule parameter
        instance = new MinimumJerkPathGenerator(randomSeed);
        break;

      case MovementStrategy.COMPOSITE:
        // CompositePathGenerator doesn't accept mathModule in the constructor
        if (mathModule) {
          instance = new CompositePathGenerator(randomSeed);
        } else {
          instance = new CompositePathGenerator(randomSeed);
        }
        break;

      case MovementStrategy.ADAPTIVE:
        // AdaptivePathGenerator doesn't accept mathModule in the constructor
        if (mathModule) {
          instance = new AdaptivePathGenerator(randomSeed);
        } else {
          instance = new AdaptivePathGenerator(randomSeed);
        }
        break;

      default:
        // Default to bezier if unknown strategy
        console.warn(`Unknown strategy: ${strategy}, falling back to BEZIER`);
        instance = new BezierPathGenerator(randomSeed, mathModule);
    }

    // Cache the instance
    this.strategyInstances.set(cacheKey, instance);

    return instance;
  }

  /**
   * Set the math module type to use
   *
   * @param moduleType Type of math module to use
   */
  async setMathModuleType(moduleType: MathModuleType): Promise<void> {
    // Check if the module is available
    if (await MathModuleFactory.isModuleAvailable(moduleType)) {
      this.mathModuleType = moduleType;
      // Clear cache to force new instances with the new module
      this.clearCache();
    } else {
      console.warn(`Math module ${moduleType} is not available, using ${this.mathModuleType} instead`);
    }
  }

  /**
   * Get the current math module type
   *
   * @returns Current math module type
   */
  getMathModuleType(): MathModuleType {
    return this.mathModuleType;
  }

  /**
   * Clear the strategy instance cache
   */
  clearCache(): void {
    this.strategyInstances.clear();
  }

  /**
   * Get all available strategy types
   *
   * @returns Array of available strategy types
   */
  getAvailableStrategies(): MovementStrategy[] {
    return Object.values(MovementStrategy);
  }
}