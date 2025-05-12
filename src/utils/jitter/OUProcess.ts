/**
 * OUProcess.ts
 * 
 * Implements the Ornstein-Uhlenbeck process for generating
 * realistic human-like jitter and tremor patterns
 */

/**
 * Ornstein-Uhlenbeck process simulation parameters
 */
export interface OUParameters {
  /** Mean reversion rate - how quickly the process returns to the mean */
  theta: number;
  
  /** Mean reversion level - the value the process tends toward */
  mu: number;
  
  /** Volatility - the intensity of random fluctuations */
  sigma: number;
  
  /** Time step size for discrete simulation */
  dt: number;
}

/**
 * Default parameters that closely mimic natural human hand tremor
 */
export const DEFAULT_TREMOR_PARAMETERS: OUParameters = {
  theta: 0.7,  // Medium-fast reversion
  mu: 0.0,     // No bias
  sigma: 0.3,  // Moderate volatility
  dt: 0.1      // Small time steps for smoothness
};

/**
 * Implements an Ornstein-Uhlenbeck process for generating realistic jitter
 * 
 * The Ornstein-Uhlenbeck process is a stochastic process that models the velocity
 * of a massive Brownian particle under the influence of friction. It's particularly
 * well-suited for simulating human hand tremor and mouse movement jitter.
 */
export class OUProcess {
  /** Current state value */
  private currentValue: number;
  
  /** Process parameters */
  private params: OUParameters;
  
  /** Random number generator function */
  private random: () => number;
  
  /**
   * Create a new Ornstein-Uhlenbeck process simulator
   * 
   * @param params Process parameters
   * @param initialValue Initial state value (defaults to mu)
   * @param randomFn Custom random number generator (defaults to Math.random)
   */
  constructor(
    params: Partial<OUParameters> = {},
    initialValue?: number,
    randomFn?: () => number
  ) {
    // Merge with default parameters
    this.params = { ...DEFAULT_TREMOR_PARAMETERS, ...params };
    
    // Set initial value to mean if not specified
    this.currentValue = initialValue !== undefined ? initialValue : this.params.mu;
    
    // Use provided random function or Math.random
    this.random = randomFn || Math.random;
  }
  
  /**
   * Generate the next value in the process
   * 
   * @returns Next value in the sequence
   */
  next(): number {
    // Implementation of the Ornstein-Uhlenbeck process:
    // dX = θ(μ - X)dt + σdW
    // Where dW is a Wiener process increment (Gaussian white noise)
    
    // Mean reversion component
    const drift = this.params.theta * (this.params.mu - this.currentValue) * this.params.dt;
    
    // Random shock component (using Box-Muller transform for Gaussian noise)
    const diffusion = this.params.sigma * this.normalRandom() * Math.sqrt(this.params.dt);
    
    // Update current value
    this.currentValue += drift + diffusion;
    
    return this.currentValue;
  }
  
  /**
   * Generate multiple steps at once
   * 
   * @param steps Number of steps to generate
   * @returns Array of consecutive values
   */
  nextN(steps: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < steps; i++) {
      result.push(this.next());
    }
    
    return result;
  }
  
  /**
   * Reset the process to a specific value
   * 
   * @param value Value to reset to (defaults to mu)
   */
  reset(value?: number): void {
    this.currentValue = value !== undefined ? value : this.params.mu;
  }
  
  /**
   * Get the current value
   * 
   * @returns Current process value
   */
  getValue(): number {
    return this.currentValue;
  }
  
  /**
   * Update process parameters
   * 
   * @param params New parameters (partial)
   */
  updateParameters(params: Partial<OUParameters>): void {
    this.params = { ...this.params, ...params };
  }
  
  /**
   * Get a normally distributed random number
   * using the Box-Muller transform
   * 
   * @returns Random number from standard normal distribution
   */
  private normalRandom(): number {
    // Box-Muller transform
    const u1 = 1.0 - this.random(); // Avoid log(0)
    const u2 = this.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    return z;
  }
}