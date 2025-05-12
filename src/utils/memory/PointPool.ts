/**
 * PointPool.ts
 * 
 * Memory pool for Point objects to reduce garbage collection pressure
 */

import { Point } from '../../core/types';

/**
 * Object pool for Point objects
 * 
 * This class pre-allocates a pool of Point objects and reuses them
 * to reduce garbage collection pressure during intensive movement
 * operations.
 */
export class PointPool {
  /** Pre-allocated pool of Point objects */
  private pool: Point[] = [];
  
  /** Current index in the pool */
  private currentIndex: number = 0;
  
  /** Maximum size of the pool */
  private maxSize: number;
  
  /** Whether to automatically expand the pool if needed */
  private autoExpand: boolean;
  
  /** Number of Point objects allocated */
  private allocations: number = 0;
  
  /** Number of Point objects released */
  private releases: number = 0;
  
  /**
   * Create a new point pool
   * 
   * @param initialSize Initial size of the pool
   * @param maxSize Maximum size of the pool (defaults to initialSize * 2)
   * @param autoExpand Whether to automatically expand the pool if needed
   */
  constructor(initialSize: number = 100, maxSize?: number, autoExpand: boolean = true) {
    // Initialize the pool with Point objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push({ x: 0, y: 0 });
    }
    
    this.maxSize = maxSize || initialSize * 2;
    this.autoExpand = autoExpand;
  }
  
  /**
   * Get a Point object from the pool
   * 
   * @param x Optional x-coordinate
   * @param y Optional y-coordinate
   * @returns A Point object from the pool
   */
  allocate(x: number = 0, y: number = 0): Point {
    this.allocations++;
    
    if (this.currentIndex >= this.pool.length) {
      // Pool is exhausted, expand if allowed
      if (this.autoExpand && this.pool.length < this.maxSize) {
        // Add new objects to the pool
        const newSize = Math.min(this.pool.length * 2, this.maxSize);
        const numToAdd = newSize - this.pool.length;
        
        console.warn(`PointPool expanding from ${this.pool.length} to ${newSize}`);
        
        for (let i = 0; i < numToAdd; i++) {
          this.pool.push({ x: 0, y: 0 });
        }
      } else {
        // Pool exhausted and can't expand, return a new object (not pooled)
        console.warn(`PointPool exhausted (used ${this.currentIndex} of ${this.pool.length})`);
        return { x, y };
      }
    }
    
    // Get a Point from the pool and update its coordinates
    const point = this.pool[this.currentIndex++];
    point.x = x;
    point.y = y;
    
    return point;
  }
  
  /**
   * Release a Point back to the pool
   * 
   * @param point The Point to release (ignored, just for API convenience)
   */
  release(point?: Point): void {
    this.releases++;
    
    // Only decrement if we have allocated points
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }
  
  /**
   * Reset the pool, allowing all Points to be reused
   */
  reset(): void {
    this.currentIndex = 0;
  }
  
  /**
   * Get the current utilization percentage of the pool
   * 
   * @returns Percentage of the pool currently in use (0-100)
   */
  getUtilization(): number {
    return (this.currentIndex / this.pool.length) * 100;
  }
  
  /**
   * Get stats about the pool usage
   * 
   * @returns Object with pool statistics
   */
  getStats(): {
    poolSize: number;
    maxSize: number;
    currentIndex: number;
    utilization: number;
    allocations: number;
    releases: number;
  } {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      currentIndex: this.currentIndex,
      utilization: this.getUtilization(),
      allocations: this.allocations,
      releases: this.releases
    };
  }
  
  /**
   * Allocate multiple points at once
   * 
   * @param count Number of points to allocate
   * @returns Array of Point objects
   */
  allocateMany(count: number): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i < count; i++) {
      points.push(this.allocate());
    }
    
    return points;
  }
  
  /**
   * Release multiple points at once
   * 
   * @param points Array of points to release
   */
  releaseMany(points: Point[]): void {
    for (let i = 0; i < points.length; i++) {
      this.release(points[i]);
    }
  }
}

/**
 * Global singleton instance of PointPool
 */
export const globalPointPool = new PointPool(1000, 5000, true);