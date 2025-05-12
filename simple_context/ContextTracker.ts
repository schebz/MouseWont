/**
 * ContextTracker.ts
 * 
 * Utility for tracking context and changes during mouse movements
 */

import { Point } from '../src/core/types';

/**
 * Context data structure to track movement parameters
 */
export interface Context {
  /** Current mouse position */
  position: Point;
  
  /** Timestamp of last update */
  timestamp: number;
  
  /** Movement ID for tracking separate movements */
  movementId: string;
  
  /** Target position for current movement */
  targetPosition?: Point;
  
  /** Elapsed time in current movement */
  elapsedTime: number;
  
  /** Strategy being used */
  strategy: string;
  
  /** Whether a movement is in progress */
  isMoving: boolean;
  
  /** Performance metrics */
  metrics: {
    /** Frames per second */
    fps: number;
    /** Memory usage in bytes */
    memoryUsage: number;
    /** Path points generated */
    pathPointsGenerated: number;
    /** Duration of last movement */
    lastMovementDuration: number;
  };
  
  /** Element information if targeting an element */
  element?: {
    /** Element tag name */
    tagName: string;
    /** Element ID */
    id: string;
    /** Element class names */
    className: string;
    /** Element bounding box */
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  
  /** Custom properties for extensions */
  [key: string]: any;
}

/**
 * Event types for context change notifications
 */
export enum ContextEventType {
  /** Movement started */
  MOVEMENT_START = 'movement_start',
  /** Movement updated */
  MOVEMENT_UPDATE = 'movement_update',
  /** Movement completed */
  MOVEMENT_COMPLETE = 'movement_complete',
  /** Click started */
  CLICK_START = 'click_start',
  /** Click completed */
  CLICK_COMPLETE = 'click_complete',
  /** Error occurred */
  ERROR = 'error',
  /** Context property changed */
  PROPERTY_CHANGE = 'property_change',
  /** Custom event */
  CUSTOM = 'custom'
}

/**
 * Context change event
 */
export interface ContextEvent {
  /** Event type */
  type: ContextEventType;
  /** Previous context state */
  prevContext: Context;
  /** New context state */
  newContext: Context;
  /** Changed properties */
  changedProps: string[];
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Event metadata */
  metadata?: Record<string, any>;
}

/**
 * Context change listener
 */
export type ContextChangeListener = (event: ContextEvent) => void;

/**
 * Tracks context changes during mouse movements
 */
export class ContextTracker {
  /** Current context */
  private context: Context;
  
  /** Change listeners */
  private listeners: Map<ContextEventType, ContextChangeListener[]> = new Map();
  
  /** History of events */
  private history: ContextEvent[] = [];
  
  /** Maximum history size */
  private maxHistorySize: number;
  
  /** Whether to store history */
  private storeHistory: boolean;
  
  /**
   * Create a new context tracker
   * 
   * @param initialContext Initial context state
   * @param options Configuration options
   */
  constructor(
    initialContext?: Partial<Context>,
    options: {
      maxHistorySize?: number;
      storeHistory?: boolean;
    } = {}
  ) {
    // Default context
    this.context = {
      position: { x: 0, y: 0 },
      timestamp: Date.now(),
      movementId: this.generateMovementId(),
      elapsedTime: 0,
      strategy: 'unknown',
      isMoving: false,
      metrics: {
        fps: 0,
        memoryUsage: 0,
        pathPointsGenerated: 0,
        lastMovementDuration: 0
      },
      ...initialContext
    };
    
    // Configuration
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.storeHistory = options.storeHistory !== undefined ? options.storeHistory : true;
  }
  
  /**
   * Get current context
   * 
   * @returns Current context
   */
  getContext(): Context {
    return { ...this.context };
  }
  
  /**
   * Update context with new values
   * 
   * @param updates Context updates
   * @param eventType Event type to trigger
   * @param metadata Additional event metadata
   */
  updateContext(
    updates: Partial<Context>,
    eventType: ContextEventType = ContextEventType.PROPERTY_CHANGE,
    metadata?: Record<string, any>
  ): void {
    const prevContext = { ...this.context };
    const changedProps: string[] = [];
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (JSON.stringify(this.context[key]) !== JSON.stringify(value)) {
        changedProps.push(key);
        this.context[key] = value;
      }
    });
    
    // Update timestamp
    this.context.timestamp = Date.now();
    
    // If there are changes, trigger event
    if (changedProps.length > 0) {
      const event: ContextEvent = {
        type: eventType,
        prevContext,
        newContext: { ...this.context },
        changedProps,
        timestamp: this.context.timestamp,
        metadata
      };
      
      // Add to history
      if (this.storeHistory) {
        this.history.push(event);
        
        // Trim history if needed
        if (this.history.length > this.maxHistorySize) {
          this.history = this.history.slice(-this.maxHistorySize);
        }
      }
      
      // Notify listeners
      this.notifyListeners(event);
    }
  }
  
  /**
   * Start tracking a new movement
   * 
   * @param target Target position
   * @param strategy Strategy being used
   */
  startMovement(target: Point, strategy: string): void {
    this.updateContext(
      {
        targetPosition: target,
        strategy,
        isMoving: true,
        elapsedTime: 0,
        movementId: this.generateMovementId(),
        metrics: {
          ...this.context.metrics,
          pathPointsGenerated: 0
        }
      },
      ContextEventType.MOVEMENT_START,
      { target, strategy }
    );
  }
  
  /**
   * Update movement progress
   * 
   * @param position Current position
   * @param elapsedTime Elapsed time in milliseconds
   */
  updateMovement(position: Point, elapsedTime: number): void {
    this.updateContext(
      {
        position,
        elapsedTime
      },
      ContextEventType.MOVEMENT_UPDATE
    );
  }
  
  /**
   * Complete the current movement
   * 
   * @param position Final position
   * @param duration Total duration in milliseconds
   */
  completeMovement(position: Point, duration: number): void {
    this.updateContext(
      {
        position,
        isMoving: false,
        metrics: {
          ...this.context.metrics,
          lastMovementDuration: duration
        }
      },
      ContextEventType.MOVEMENT_COMPLETE,
      { duration }
    );
  }
  
  /**
   * Register a listener for context changes
   * 
   * @param eventType Event type to listen for, or undefined for all events
   * @param listener Listener function
   */
  addListener(eventType: ContextEventType | undefined, listener: ContextChangeListener): void {
    if (eventType === undefined) {
      // Add listener for all event types
      Object.values(ContextEventType).forEach(type => {
        if (!this.listeners.has(type)) {
          this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(listener);
      });
    } else {
      // Add listener for specific event type
      if (!this.listeners.has(eventType)) {
        this.listeners.set(eventType, []);
      }
      this.listeners.get(eventType)!.push(listener);
    }
  }
  
  /**
   * Remove a listener
   * 
   * @param eventType Event type the listener was registered for, or undefined for all
   * @param listener Listener function to remove
   */
  removeListener(eventType: ContextEventType | undefined, listener: ContextChangeListener): void {
    if (eventType === undefined) {
      // Remove from all event types
      this.listeners.forEach((listeners, type) => {
        this.listeners.set(type, listeners.filter(l => l !== listener));
      });
    } else if (this.listeners.has(eventType)) {
      // Remove from specific event type
      this.listeners.set(
        eventType,
        this.listeners.get(eventType)!.filter(l => l !== listener)
      );
    }
  }
  
  /**
   * Get movement history
   * 
   * @param limit Maximum number of events to return
   * @param eventType Filter by event type
   * @returns Array of context events
   */
  getHistory(limit?: number, eventType?: ContextEventType): ContextEvent[] {
    let history = this.history;
    
    // Filter by event type if specified
    if (eventType !== undefined) {
      history = history.filter(event => event.type === eventType);
    }
    
    // Apply limit if specified
    if (limit !== undefined && limit > 0) {
      history = history.slice(-limit);
    }
    
    return history;
  }
  
  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * Notify all listeners of an event
   * 
   * @param event Context change event
   */
  private notifyListeners(event: ContextEvent): void {
    // Notify listeners for this event type
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type)!.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in context listener:', error);
        }
      });
    }
  }
  
  /**
   * Generate a unique movement ID
   * 
   * @returns Unique movement ID
   */
  private generateMovementId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Global context tracker instance
 */
export const globalContextTracker = new ContextTracker();