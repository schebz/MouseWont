/**
 * @file types.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @author Mika Tokamak
 *
 * Core type definitions for MousePlayWrong
 */

/**
 * Represents a 2D point with x and y coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Enum defining available movement strategies
 */
export enum MovementStrategy {
  BEZIER = "bezier",           // Bézier curve-based paths
  PHYSICS = "physics",         // Physics-based simulation
  MINIMUM_JERK = "minimum_jerk", // Minimum-jerk trajectory
  COMPOSITE = "composite",     // Combination of multiple strategies
  ADAPTIVE = "adaptive"        // Dynamically selected strategy
}

/**
 * Options for configuring mouse movements
 */
export interface MovementOptions {
  /** Strategy to use for movement generation */
  strategy: MovementStrategy;
  
  /** Movement duration in milliseconds */
  duration: number;
  
  /** Factor controlling overshoot [0-1] */
  overshootFactor: number;
  
  /** Amount of jitter to apply [0-5] */
  jitterAmount: number;
  
  /** Movement complexity factor [0-1] */
  complexity: number;
  
  /** Number of points to generate along the path */
  pathPoints: number;
  
  /** Velocity profile to use ("uniform", "minimum_jerk", "asymmetric") */
  velocityProfile: string;
  
  /** Random seed for reproducible movements (optional) */
  randomSeed?: number;
}

/**
 * Default movement options
 */
export const DEFAULT_MOVEMENT_OPTIONS: MovementOptions = {
  strategy: MovementStrategy.ADAPTIVE,
  duration: 500,
  overshootFactor: 0.2,
  jitterAmount: 1.0,
  complexity: 0.5,
  pathPoints: 100,
  velocityProfile: "minimum_jerk"
};

/**
 * Playwright mouse button definitions
 */
export type MouseButton = "left" | "right" | "middle";

/**
 * Options for mouse click operations
 */
export interface ClickOptions {
  /** Mouse button to use */
  button: MouseButton;
  
  /** Number of clicks */
  clickCount: number;
  
  /** Delay between mousedown and mouseup in milliseconds */
  delay?: number;
}

/**
 * Default click options
 */
export const DEFAULT_CLICK_OPTIONS: ClickOptions = {
  button: "left",
  clickCount: 1,
  delay: 20
};

/**
 * Options for generating mouse jitter
 */
export interface JitterOptions {
  /** Jitter amount/intensity [0-5] */
  amount: number;
  
  /** Mean reversion rate for OU process */
  theta: number;
  
  /** Volatility parameter for OU process */
  sigma: number;
}

/**
 * Movement metrics for performance analysis
 */
export interface MovementMetrics {
  /** Total path length in pixels */
  pathLength: number;
  
  /** Maximum velocity attained (pixels/ms) */
  maxVelocity: number;
  
  /** Average velocity (pixels/ms) */
  avgVelocity: number;
  
  /** Maximum acceleration (pixels/ms²) */
  maxAcceleration: number;
  
  /** Maximum jerk (pixels/ms³) */
  maxJerk: number;
  
  /** Overshoot distance in pixels (if any) */
  overshootDistance: number;
  
  /** Computation time in milliseconds */
  computationTime: number;
}

/**
 * System status information
 */
export interface SystemStatus {
  /** Current version */
  version: string;
  
  /** Current state */
  state: "idle" | "moving" | "clicking" | "error";
  
  /** Last error message (if any) */
  lastError?: string;
  
  /** Playwright connection status */
  playwrightConnected: boolean;
  
  /** Current mouse position */
  currentPosition?: Point;
}