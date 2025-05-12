/**
 * CompositePathGenerator.ts
 * 
 * Implements a path generator that combines multiple strategies
 */

import { PathGenerator } from '../../core/PathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../../core/types';
import { StrategyFactory } from '../StrategyFactory';

/**
 * Generates mouse movement paths by combining multiple strategies
 * 
 * This strategy creates complex, natural-looking mouse movements by
 * blending the outputs of multiple base strategies using weighted combinations.
 */
export class CompositePathGenerator extends PathGenerator {
  /**
   * Unique identifier for this generator
   */
  readonly id = 'composite';
  
  /**
   * Human-readable name for this generator
   */
  readonly name = 'Composite Strategy';
  
  /**
   * Strategy factory for creating component strategies
   */
  private strategyFactory: StrategyFactory;
  
  /**
   * Create a new CompositePathGenerator
   * 
   * @param randomSeed Optional random seed for reproducibility
   */
  constructor(randomSeed?: number) {
    super(randomSeed);
    this.strategyFactory = new StrategyFactory();
  }
  
  /**
   * Generate a path from start to end point by combining multiple strategies
   *
   * @param start Starting point coordinates
   * @param end Ending point coordinates
   * @param options Configuration options for the movement
   * @returns Promise resolving to array of points representing the path
   */
  async generatePath(start: Point, end: Point, options: MovementOptions): Promise<Point[]> {
    // Define the component strategies and their weights
    const strategies = this.getComponentStrategies(options);

    // Generate paths from each component strategy
    const pathPromises = await Promise.all(strategies.map(async s => {
      const generator = await this.strategyFactory.createStrategy(s.strategy, this.randomSeed);
      return {
        path: await generator.generatePath(start, end, {
          ...options,
          strategy: s.strategy
        }),
        weight: s.weight
      };
    }));
    
    // Normalize weights to sum to 1
    const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
    const normalizedWeights = strategies.map(s => s.weight / totalWeight);
    
    // Extract paths from the results
    const paths = pathPromises.map(p => p.path);

    // Blend the paths using the normalized weights
    const compositePath = this.blendPaths(paths, normalizedWeights);

    // Ensure start and end points are exact
    if (compositePath.length > 0) {
      compositePath[0] = { ...start };
      compositePath[compositePath.length - 1] = { ...end };
    }

    return compositePath;
  }
  
  /**
   * Determine which strategies to use and their weights based on options
   * 
   * @param options Movement options
   * @returns Array of strategies and their weights
   */
  private getComponentStrategies(options: MovementOptions): Array<{
    strategy: MovementStrategy;
    weight: number;
  }> {
    // Base strategies with context-dependent weights
    const strategies: Array<{
      strategy: MovementStrategy;
      weight: number;
    }> = [
      { 
        strategy: MovementStrategy.BEZIER, 
        weight: 1.0 - 0.3 * options.complexity  // Less weight for high complexity
      },
      { 
        strategy: MovementStrategy.PHYSICS, 
        weight: 0.5 + 0.5 * options.complexity  // More weight for high complexity
      },
      { 
        strategy: MovementStrategy.MINIMUM_JERK, 
        weight: 0.5 + 0.5 * (1 - options.overshootFactor)  // Less weight for high overshoot
      }
    ];
    
    return strategies;
  }
  
  /**
   * Blend multiple paths using weighted averaging
   * 
   * @param paths Array of paths to blend
   * @param weights Weight for each path (must sum to 1)
   * @returns Blended composite path
   */
  private blendPaths(paths: Point[][], weights: number[]): Point[] {
    if (paths.length === 0 || paths[0].length === 0) {
      return [];
    }
    
    // All paths should have the same number of points
    const numPoints = paths[0].length;
    
    // Create the blended path
    const result: Point[] = [];
    
    // For each point index, blend the corresponding points from all paths
    for (let i = 0; i < numPoints; i++) {
      let x = 0;
      let y = 0;
      
      // Weighted sum of each path's point at this index
      for (let j = 0; j < paths.length; j++) {
        x += paths[j][i].x * weights[j];
        y += paths[j][i].y * weights[j];
      }
      
      result.push({ x, y });
    }
    
    return result;
  }
}