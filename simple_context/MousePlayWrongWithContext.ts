/**
 * MousePlayWrongWithContext.ts
 * 
 * Integration of MousePlayWrong with the ContextTracker
 */

import { MousePlayWrong } from '../src/core/MousePlayWrong';
import { MovementOptions, Point, ClickOptions } from '../src/core/types';
import { Page } from 'playwright';
import { ContextTracker, ContextEventType, globalContextTracker } from './ContextTracker';
import { ContextVisualizer } from './ContextVisualizer';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Enhanced version of MousePlayWrong with context tracking
 */
export class MousePlayWrongWithContext extends MousePlayWrong {
  /** Context tracker instance */
  private contextTracker: ContextTracker;
  
  /** Whether to automatically save visualizations */
  private autoVisualize: boolean;
  
  /** Directory for saving visualizations */
  private visualizationDir: string;
  
  /** Number of movements visualized */
  private visualizationCount: number = 0;
  
  /**
   * Create a new enhanced MousePlayWrong instance
   * 
   * @param page Playwright page
   * @param contextTracker Context tracker instance (optional, uses global by default)
   * @param options Configuration options
   */
  constructor(
    page: Page,
    contextTracker?: ContextTracker,
    options: {
      autoVisualize?: boolean;
      visualizationDir?: string;
    } = {}
  ) {
    super(page);
    
    // Set up context tracker
    this.contextTracker = contextTracker || globalContextTracker;
    
    // Set up visualization options
    this.autoVisualize = options.autoVisualize !== undefined ? options.autoVisualize : false;
    this.visualizationDir = options.visualizationDir || path.join(process.cwd(), 'output');
    
    // Create visualization directory if needed
    if (this.autoVisualize && !fs.existsSync(this.visualizationDir)) {
      fs.mkdirSync(this.visualizationDir, { recursive: true });
    }
    
    // Set initial context
    this.updateContextWithMemoryInfo();
  }
  
  /**
   * Move the mouse to a specific point with human-like movement
   * 
   * @param point Target point
   * @param options Movement options
   * @returns Promise resolving when movement is complete
   */
  async moveTo(point: Point, options?: Partial<MovementOptions>): Promise<boolean> {
    try {
      // Update context with current mouse position
      const currentPos = await this.getCurrentPosition();
      this.contextTracker.updateContext({ position: currentPos });
      
      // Start movement in context
      this.contextTracker.startMovement(
        point,
        options?.strategy || this.defaultOptions.strategy
      );
      
      // Log memory usage at start
      this.updateContextWithMemoryInfo();
      
      // Start time
      const startTime = Date.now();
      
      // Perform the movement
      const result = await super.moveTo(point, options);
      
      // End time
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Complete movement in context
      this.contextTracker.completeMovement(point, duration);
      
      // Update memory info
      this.updateContextWithMemoryInfo();
      
      // Generate visualization if enabled
      if (this.autoVisualize) {
        this.saveVisualization();
      }
      
      return result;
    } catch (error) {
      // Log error in context
      this.contextTracker.updateContext(
        { 
          isMoving: false,
          error: error instanceof Error ? error.message : String(error)
        },
        ContextEventType.ERROR
      );
      
      throw error;
    }
  }
  
  /**
   * Perform a mouse click with context tracking
   * 
   * @param options Click options
   * @returns Promise resolving when click is complete
   */
  async click(options?: Partial<ClickOptions>): Promise<boolean> {
    try {
      // Start click in context
      this.contextTracker.updateContext(
        { 
          clickOptions: options 
        },
        ContextEventType.CLICK_START
      );
      
      // Start time
      const startTime = Date.now();
      
      // Perform the click
      const result = await super.click(options);
      
      // End time
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Complete click in context
      this.contextTracker.updateContext(
        { 
          clickDuration: duration 
        },
        ContextEventType.CLICK_COMPLETE
      );
      
      return result;
    } catch (error) {
      // Log error in context
      this.contextTracker.updateContext(
        { 
          error: error instanceof Error ? error.message : String(error)
        },
        ContextEventType.ERROR
      );
      
      throw error;
    }
  }
  
  /**
   * Get the context tracker instance
   * 
   * @returns Context tracker
   */
  getContextTracker(): ContextTracker {
    return this.contextTracker;
  }
  
  /**
   * Generate a visualization of the movement history
   * 
   * @param options Visualization options
   * @returns SVG content as string
   */
  visualizeMovements(options: any = {}): string {
    const visualizer = new ContextVisualizer(this.contextTracker, options);
    return visualizer.generateSVG();
  }
  
  /**
   * Save movement visualization to a file
   * 
   * @param filePath Optional file path (generated if not provided)
   * @param options Visualization options
   */
  saveVisualization(filePath?: string, options: any = {}): void {
    // Generate file path if not provided
    if (!filePath) {
      this.visualizationCount++;
      filePath = path.join(
        this.visualizationDir,
        `movement_${this.visualizationCount}_${Date.now()}.svg`
      );
    }
    
    // Create visualizer and save
    const visualizer = new ContextVisualizer(this.contextTracker, options);
    visualizer.saveSVG(filePath);
  }
  
  /**
   * Update context with memory usage information
   */
  private updateContextWithMemoryInfo(): void {
    const memoryUsage = process.memoryUsage();
    
    this.contextTracker.updateContext({
      metrics: {
        ...this.contextTracker.getContext().metrics,
        memoryUsage: memoryUsage.heapUsed,
        "heapTotal": memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      }
    });
  }
}

/**
 * Example usage of MousePlayWrongWithContext
 */
export async function demonstrateContextIntegration(): Promise<void> {
  // This would be replaced with actual Playwright browser instantiation
  const mockPage = {
    mouse: {
      move: async (x: number, y: number) => Promise.resolve(),
      down: async () => Promise.resolve(),
      up: async () => Promise.resolve()
    }
  } as unknown as Page;
  
  console.log('MousePlayWrong with Context Integration Demo');
  console.log('------------------------------------------');
  
  // Create enhanced instance
  const mouse = new MousePlayWrongWithContext(mockPage, undefined, {
    autoVisualize: true
  });
  
  // Perform some movements
  await mouse.moveTo({ x: 100, y: 100 });
  console.log('Moved to (100, 100)');
  
  await mouse.moveTo({ x: 500, y: 300 });
  console.log('Moved to (500, 300)');
  
  await mouse.click();
  console.log('Clicked');
  
  await mouse.moveTo({ x: 250, y: 400 });
  console.log('Moved to (250, 400)');
  
  // Get and log tracker data
  const context = mouse.getContextTracker().getContext();
  console.log('\nFinal Context:');
  console.log(`- Position: (${context.position.x}, ${context.position.y})`);
  console.log(`- Movements: ${
    mouse.getContextTracker().getHistory(undefined, ContextEventType.MOVEMENT_COMPLETE).length
  }`);
  console.log(`- Memory Usage: ${Math.round(context.metrics.memoryUsage / 1024 / 1024)} MB`);
  
  console.log('\nVisualization saved to output directory');
}

// Run demo if executed directly
if (require.main === module) {
  demonstrateContextIntegration().catch(console.error);
}