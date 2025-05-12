/**
 * AdaptivePathGenerator.ts
 * 
 * Implements a path generator that adaptively selects the best strategy
 * based on movement characteristics
 */

import { PathGenerator } from '../../core/PathGenerator';
import { Point, MovementOptions, MovementStrategy } from '../../core/types';
import { StrategyFactory } from '../StrategyFactory';

/**
 * Generates mouse movement paths by selecting the most appropriate strategy
 * based on the specific movement context.
 * 
 * This meta-strategy analyzes the movement requirements and dynamically
 * selects the optimal base strategy for the given movement.
 */
export class AdaptivePathGenerator extends PathGenerator {
  /**
   * Unique identifier for this generator
   */
  readonly id = 'adaptive';
  
  /**
   * Human-readable name for this generator
   */
  readonly name = 'Adaptive Strategy';
  
  /**
   * Strategy factory for creating component strategies
   */
  private strategyFactory: StrategyFactory;
  
  /**
   * Create a new AdaptivePathGenerator
   * 
   * @param randomSeed Optional random seed for reproducibility
   */
  constructor(randomSeed?: number) {
    super(randomSeed);
    this.strategyFactory = new StrategyFactory();
  }
  
  /**
   * Generate a path by selecting the most appropriate strategy
   *
   * @param start Starting point coordinates
   * @param end Ending point coordinates
   * @param options Configuration options for the movement
   * @returns Promise resolving to array of points representing the path
   */
  async generatePath(start: Point, end: Point, options: MovementOptions): Promise<Point[]> {
    // Select the best strategy for this movement
    const selectedStrategy = this.selectBestStrategy(start, end, options);

    // Use the selected strategy to generate the path
    const generator = await this.strategyFactory.createStrategy(selectedStrategy, this.randomSeed);

    return generator.generatePath(start, end, {
      ...options,
      strategy: selectedStrategy
    });
  }
  
  /**
   * Select the best strategy based on movement characteristics
   *
   * @param start Starting point
   * @param end Ending point
   * @param options Movement options
   * @returns The selected movement strategy
   */
  private selectBestStrategy(
    start: Point,
    end: Point,
    options: MovementOptions
  ): MovementStrategy {
    // Calculate movement distance
    const distance = this.distance(start, end);

    // Calculate movement angle (useful for certain types of movements)
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const diagonality = Math.abs(Math.sin(2 * angle)); // 0 for horizontal/vertical, 1 for diagonal

    // Decision logic based on empirical observations of human movement patterns
    // Each factor gets a score for each strategy, and we select the highest-scoring strategy

    // Scoring system for each factor
    let scores = {
      [MovementStrategy.BEZIER]: 0,
      [MovementStrategy.PHYSICS]: 0,
      [MovementStrategy.MINIMUM_JERK]: 0,
      [MovementStrategy.COMPOSITE]: 0
    };

    // 1. Distance factor
    if (distance < 50) {
      // Very short distances: Minimum-jerk excels at precision
      scores[MovementStrategy.MINIMUM_JERK] += 10;
      scores[MovementStrategy.BEZIER] += 5;
    } else if (distance < 200) {
      // Short-medium distances: Bezier curves look natural
      scores[MovementStrategy.BEZIER] += 10;
      scores[MovementStrategy.MINIMUM_JERK] += 7;
      scores[MovementStrategy.COMPOSITE] += 5;
    } else if (distance < 500) {
      // Medium distances: Physics-based and composite work well
      scores[MovementStrategy.PHYSICS] += 8;
      scores[MovementStrategy.COMPOSITE] += 10;
      scores[MovementStrategy.BEZIER] += 7;
    } else {
      // Long distances: Physics-based with overshoot is most realistic
      scores[MovementStrategy.PHYSICS] += 10;
      scores[MovementStrategy.COMPOSITE] += 8;
    }

    // 2. Overshoot preference
    if (options.overshootFactor > 0.5) {
      // High overshoot: Physics-based models handle this naturally
      scores[MovementStrategy.PHYSICS] += 8;
      scores[MovementStrategy.COMPOSITE] += 5;
      scores[MovementStrategy.BEZIER] += 3;
      // Minimum-jerk doesn't handle overshoot as well
      scores[MovementStrategy.MINIMUM_JERK] -= 3;
    } else if (options.overshootFactor < 0.1) {
      // No overshoot: Minimum-jerk and Bezier are precise
      scores[MovementStrategy.MINIMUM_JERK] += 6;
      scores[MovementStrategy.BEZIER] += 5;
    }

    // 3. Complexity factor
    if (options.complexity > 0.7) {
      // High complexity: Composite and physics strategies shine
      scores[MovementStrategy.COMPOSITE] += 10;
      scores[MovementStrategy.PHYSICS] += 8;
      // Simple strategies don't handle high complexity as well
      scores[MovementStrategy.BEZIER] -= 2;
      scores[MovementStrategy.MINIMUM_JERK] -= 3;
    } else if (options.complexity < 0.3) {
      // Low complexity: Simple, efficient strategies work well
      scores[MovementStrategy.BEZIER] += 5;
      scores[MovementStrategy.MINIMUM_JERK] += 6;
    }

    // 4. Duration factor
    if (options.duration < 300) {
      // Very quick movements: Minimum-jerk is computationally efficient
      scores[MovementStrategy.MINIMUM_JERK] += 7;
      scores[MovementStrategy.BEZIER] += 5;
      // Physics simulations can be expensive for quick movements
      scores[MovementStrategy.PHYSICS] -= 2;
    } else if (options.duration > 1000) {
      // Slow movements: Complex strategies have time to calculate
      scores[MovementStrategy.PHYSICS] += 5;
      scores[MovementStrategy.COMPOSITE] += 5;
    }

    // 5. Direction factor
    if (diagonality > 0.8) {
      // Diagonal movements: Bezier curves look natural
      scores[MovementStrategy.BEZIER] += 3;
    } else {
      // Straight movements: Minimum-jerk looks more natural
      scores[MovementStrategy.MINIMUM_JERK] += 3;
    }

    // 6. Jitter consideration
    if (options.jitterAmount > 3) {
      // High jitter: Physics models handle this naturally
      scores[MovementStrategy.PHYSICS] += 5;
      scores[MovementStrategy.COMPOSITE] += 3;
    } else if (options.jitterAmount < 0.5) {
      // Low jitter: Precise strategies work well
      scores[MovementStrategy.MINIMUM_JERK] += 3;
      scores[MovementStrategy.BEZIER] += 2;
    }

    // Add slight randomization to avoid predictable patterns
    // This makes automated movements appear more human-like by introducing variety
    Object.keys(scores).forEach(strategy => {
      // Only adjust if it's a valid strategy
      if (strategy in scores) {
        scores[strategy as keyof typeof scores] += this.getRandom() * 2 - 1; // ±1 random adjustment
      }
    });

    // Find the strategy with the highest score
    let bestStrategy = MovementStrategy.BEZIER; // Default
    let bestScore = scores[bestStrategy];

    Object.entries(scores).forEach(([strategy, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy as MovementStrategy;
      }
    });

    // Log the decision process (can be enabled for debugging)
    /*
    console.log('Strategy selection for movement:');
    console.log(`Distance: ${distance.toFixed(1)}px, Angle: ${(angle * 180 / Math.PI).toFixed(1)}°`);
    console.log(`Options:`, options);
    console.log('Scores:', scores);
    console.log(`Selected strategy: ${bestStrategy} (Score: ${bestScore.toFixed(1)})`);
    */

    return bestStrategy;
  }
}