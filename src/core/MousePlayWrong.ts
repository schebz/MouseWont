/**
 * @file MousePlayWrong.ts
 * @version 0.1.0
 * @lastModified 2025-11-05
 * @author Mika Tokamak
 *
 * Main class for integrating the enhanced mouse movement system with Playwright
 */

import { Page, Mouse, Frame, ElementHandle } from 'playwright';
import { 
  Point, 
  MovementOptions,
  ClickOptions,
  DEFAULT_MOVEMENT_OPTIONS,
  DEFAULT_CLICK_OPTIONS,
  MovementStrategy,
  SystemStatus
} from './types';
import { PathGenerator } from './PathGenerator';
import { StrategyFactory } from '../strategies/StrategyFactory';

/**
 * Main class for the MousePlayWrong system
 * 
 * Provides enhanced mouse movement simulation integrated with Playwright
 */
export class MousePlayWrong {
  /** Playwright page instance */
  private page: Page;
  
  /** Default movement options */
  private defaultOptions: MovementOptions;
  
  /** Path generator factory */
  private strategyFactory: StrategyFactory;
  
  /** Current system state */
  private state: 'idle' | 'moving' | 'clicking' | 'error' = 'idle';
  
  /** Last error message */
  private lastError?: string;
  
  /** Version number */
  private readonly version = '0.1.0';
  
  /**
   * Create a new MousePlayWrong instance
   * 
   * @param page Playwright Page object
   * @param defaultOptions Default movement options
   */
  constructor(page: Page, defaultOptions: Partial<MovementOptions> = {}) {
    this.page = page;
    this.defaultOptions = { ...DEFAULT_MOVEMENT_OPTIONS, ...defaultOptions };
    this.strategyFactory = new StrategyFactory();
  }
  
  /**
   * Move the mouse to a specific point with human-like movement
   * 
   * @param point Target point coordinates
   * @param options Movement options (optional)
   * @returns Promise resolving when movement is complete
   */
  async moveTo(point: Point, options?: Partial<MovementOptions>): Promise<boolean> {
    try {
      this.state = 'moving';
      
      // Get current position
      const currentPos = await this.getCurrentPosition();
      
      // If already at target position, no movement needed
      if (this.isCloseEnough(currentPos, point)) {
        this.state = 'idle';
        return true;
      }
      
      // Merge default options with provided options
      const mergedOptions: MovementOptions = {
        ...this.defaultOptions,
        ...options
      };
      
      // Generate the path
      const path = await this.generatePath(currentPos, point, mergedOptions);
      
      // Execute the movement
      await this.executeMovement(path, mergedOptions.duration);
      
      this.state = 'idle';
      return true;
    } catch (error) {
      this.state = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Error during mouse movement:', error);
      return false;
    }
  }
  
  /**
   * Move to a specific element with human-like movement
   * 
   * @param selector Element selector
   * @param options Movement options (optional)
   * @returns Promise resolving when movement is complete
   */
  async moveToElement(
    selector: string | ElementHandle,
    options?: Partial<MovementOptions>
  ): Promise<boolean> {
    try {
      // Get the element
      const element = typeof selector === 'string' 
        ? await this.page.$(selector) 
        : selector;
      
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      
      // Get element position - aim for center
      const boundingBox = await element.boundingBox();
      
      if (!boundingBox) {
        throw new Error('Element is not visible or has no bounding box');
      }
      
      // Target the center of the element
      const targetPoint: Point = {
        x: boundingBox.x + boundingBox.width / 2,
        y: boundingBox.y + boundingBox.height / 2
      };
      
      // Add a slight randomization to the target point to appear more human-like
      // (humans rarely click exactly in the center)
      const randomOffset = options?.complexity ?? this.defaultOptions.complexity;
      
      targetPoint.x += boundingBox.width * 0.3 * (Math.random() - 0.5) * randomOffset;
      targetPoint.y += boundingBox.height * 0.3 * (Math.random() - 0.5) * randomOffset;
      
      // Move to the element
      return await this.moveTo(targetPoint, options);
    } catch (error) {
      this.state = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Error moving to element:', error);
      return false;
    }
  }
  
  /**
   * Perform a mouse click with optional parameters
   * 
   * @param options Click options (optional)
   * @returns Promise resolving when click is complete
   */
  async click(options?: Partial<ClickOptions>): Promise<boolean> {
    try {
      this.state = 'clicking';
      
      // Merge with default options
      const mergedOptions: ClickOptions = {
        ...DEFAULT_CLICK_OPTIONS,
        ...options
      };
      
      // Get playwright mouse
      const mouse = this.page.mouse;
      
      // Perform the click
      await mouse.down({
        button: mergedOptions.button as 'left' | 'right' | 'middle'
      });
      
      // Add delay between down and up (humans aren't instant)
      if (mergedOptions.delay && mergedOptions.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, mergedOptions.delay));
      }
      
      await mouse.up({
        button: mergedOptions.button as 'left' | 'right' | 'middle'
      });
      
      // For multiple clicks, add delay and repeat
      for (let i = 1; i < mergedOptions.clickCount; i++) {
        // Inter-click delay (slightly randomized)
        await new Promise(resolve => 
          setTimeout(resolve, 50 + Math.random() * 50)
        );
        
        await mouse.down({
          button: mergedOptions.button as 'left' | 'right' | 'middle'
        });
        
        if (mergedOptions.delay && mergedOptions.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, mergedOptions.delay));
        }
        
        await mouse.up({
          button: mergedOptions.button as 'left' | 'right' | 'middle'
        });
      }
      
      this.state = 'idle';
      return true;
    } catch (error) {
      this.state = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Error during mouse click:', error);
      return false;
    }
  }
  
  /**
   * Move to an element and click it with human-like movement
   * 
   * @param selector Element selector
   * @param moveOptions Movement options (optional)
   * @param clickOptions Click options (optional)
   * @returns Promise resolving when operation is complete
   */
  async moveAndClick(
    selector: string | ElementHandle,
    moveOptions?: Partial<MovementOptions>,
    clickOptions?: Partial<ClickOptions>
  ): Promise<boolean> {
    const moveSuccess = await this.moveToElement(selector, moveOptions);
    
    if (!moveSuccess) {
      return false;
    }
    
    return await this.click(clickOptions);
  }
  
  /**
   * Perform a drag operation from one point to another
   * 
   * @param start Starting point or element
   * @param end Ending point or element
   * @param options Movement options (optional)
   * @returns Promise resolving when drag is complete
   */
  async drag(
    start: Point | string | ElementHandle,
    end: Point | string | ElementHandle,
    options?: Partial<MovementOptions>
  ): Promise<boolean> {
    try {
      // Convert elements to points if needed
      const startPoint = await this.resolveToPoint(start);
      const endPoint = await this.resolveToPoint(end);
      
      // Move to start position
      const moveToStartSuccess = await this.moveTo(startPoint, options);
      
      if (!moveToStartSuccess) {
        return false;
      }
      
      // Mouse down
      await this.page.mouse.down();
      
      // Move to end position while holding mouse button
      const moveToEndSuccess = await this.moveTo(endPoint, options);
      
      // Always release mouse button, even if movement fails
      await this.page.mouse.up();
      
      return moveToEndSuccess;
    } catch (error) {
      // Make sure mouse button is released on error
      try {
        await this.page.mouse.up();
      } catch {
        // Ignore release error
      }
      
      this.state = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error('Error during drag operation:', error);
      return false;
    }
  }
  
  /**
   * Get the current system status
   * 
   * @returns System status object
   */
  getStatus(): SystemStatus {
    return {
      version: this.version,
      state: this.state,
      lastError: this.lastError,
      playwrightConnected: !!this.page
    };
  }
  
  /**
   * Get current mouse position
   * 
   * @returns Current position as Point
   */
  private async getCurrentPosition(): Promise<Point> {
    // Unfortunately, Playwright doesn't provide a direct way to get current mouse position
    // We'll use a JavaScript evaluation workaround
    
    const pos = await this.page.evaluate(() => {
      return {
        x: 0, // Can't reliably get actual mouse position
        y: 0
      };
    });
    
    // Use position from Playwright's internal state (hacky but works)
    const mouse = this.page.mouse as any;
    if (mouse._x !== undefined && mouse._y !== undefined) {
      pos.x = mouse._x;
      pos.y = mouse._y;
    }
    
    return pos;
  }
  
  /**
   * Generate a path between two points using the selected strategy
   *
   * @param start Starting point
   * @param end Ending point
   * @param options Movement options
   * @returns Array of points representing the path
   */
  private async generatePath(
    start: Point,
    end: Point,
    options: MovementOptions
  ): Promise<Point[]> {
    // Get the path generator based on strategy
    const generator = await this.strategyFactory.createStrategy(options.strategy);

    // Generate the path
    return await generator.generatePath(start, end, options);
  }
  
  /**
   * Execute a mouse movement along the given path
   * 
   * @param path Array of points to move through
   * @param duration Duration of the movement in milliseconds
   * @returns Promise resolving when movement is complete
   */
  private async executeMovement(path: Point[], duration: number): Promise<void> {
    if (path.length < 2) {
      return;
    }
    
    const mouse = this.page.mouse;
    
    // Calculate time interval between points
    const interval = duration / (path.length - 1);
    
    // Move to the first point instantly (this is already where the mouse should be)
    await mouse.move(path[0].x, path[0].y);
    
    // Track last time to adjust for execution time
    let lastTime = Date.now();
    
    // Move through each subsequent point with timing
    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      
      // Calculate how long we should wait
      const targetTime = lastTime + interval;
      const now = Date.now();
      const waitTime = Math.max(1, targetTime - now);
      
      // Wait the appropriate amount of time
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Move to the next point
      await mouse.move(point.x, point.y);
      
      // Update last time
      lastTime = Date.now();
    }
  }
  
  /**
   * Resolve a point, string selector, or ElementHandle to a Point
   * 
   * @param target Point, selector, or ElementHandle
   * @returns Resolved Point coordinates
   */
  private async resolveToPoint(
    target: Point | string | ElementHandle
  ): Promise<Point> {
    // If it's already a point, return it
    if (typeof target === 'object' && 'x' in target && 'y' in target) {
      return target as Point;
    }
    
    // If it's a string selector, find the element
    if (typeof target === 'string') {
      const element = await this.page.$(target);
      
      if (!element) {
        throw new Error(`Element not found: ${target}`);
      }
      
      target = element;
    }
    
    // Now we have an ElementHandle, get its center point
    const boundingBox = await target.boundingBox();
    
    if (!boundingBox) {
      throw new Error('Element is not visible or has no bounding box');
    }
    
    return {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height / 2
    };
  }
  
  /**
   * Check if two points are close enough to be considered the same
   * 
   * @param p1 First point
   * @param p2 Second point
   * @param threshold Distance threshold (defaults to 1px)
   * @returns True if points are within threshold distance
   */
  private isCloseEnough(p1: Point, p2: Point, threshold: number = 1): boolean {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }
}