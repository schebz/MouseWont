/**
 * @file index.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @author Mika Tokamak
 *
 * MousePlayWrong - Enhanced mouse movement simulation for Playwright
 * Main entry point exporting all public API components
 */

// Export main class
export { MousePlayWrong } from './core/MousePlayWrong';

// Export core types
export {
  Point,
  MovementStrategy,
  MovementOptions,
  ClickOptions,
  DEFAULT_MOVEMENT_OPTIONS,
  DEFAULT_CLICK_OPTIONS,
  MouseButton,
  JitterOptions,
  MovementMetrics,
  SystemStatus
} from './core/types';

// Export path generator base class for extension
export { PathGenerator } from './core/PathGenerator';

// Export strategy factory
export { StrategyFactory } from './strategies/StrategyFactory';

// Export individual strategies
export { BezierPathGenerator } from './strategies/bezier/BezierPathGenerator';
export { PhysicsPathGenerator } from './strategies/physics/PhysicsPathGenerator';
export { MinimumJerkPathGenerator } from './strategies/jerk/MinimumJerkPathGenerator';
export { CompositePathGenerator } from './strategies/composite/CompositePathGenerator';
export { AdaptivePathGenerator } from './strategies/adaptive/AdaptivePathGenerator';

/**
 * Library version
 */
export const VERSION = '0.1.0';