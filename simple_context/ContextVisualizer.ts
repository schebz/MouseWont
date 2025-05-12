/**
 * ContextVisualizer.ts
 * 
 * Visualization component for the ContextTracker
 */

import { ContextTracker, ContextEvent, ContextEventType, Context } from './ContextTracker';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Options for context visualization
 */
export interface VisualizationOptions {
  /** Width of the visualization in pixels */
  width: number;
  
  /** Height of the visualization in pixels */
  height: number;
  
  /** Background color */
  backgroundColor: string;
  
  /** Path color */
  pathColor: string;
  
  /** Start point color */
  startColor: string;
  
  /** End point color */
  endColor: string;
  
  /** Show grid */
  showGrid: boolean;
  
  /** Show metrics */
  showMetrics: boolean;
  
  /** Show points */
  showPoints: boolean;
  
  /** Title */
  title?: string;
}

/**
 * Default visualization options
 */
const DEFAULT_VISUALIZATION_OPTIONS: VisualizationOptions = {
  width: 800,
  height: 600,
  backgroundColor: '#F8F9FA',
  pathColor: '#4285F4',
  startColor: '#34A853',
  endColor: '#EA4335',
  showGrid: true,
  showMetrics: true,
  showPoints: true
};

/**
 * Visualizes context data from movement tracking
 */
export class ContextVisualizer {
  /** Context tracker instance */
  private tracker: ContextTracker;
  
  /** Visualization options */
  private options: VisualizationOptions;
  
  /**
   * Create a new context visualizer
   * 
   * @param tracker Context tracker to visualize
   * @param options Visualization options
   */
  constructor(tracker: ContextTracker, options: Partial<VisualizationOptions> = {}) {
    this.tracker = tracker;
    this.options = { ...DEFAULT_VISUALIZATION_OPTIONS, ...options };
  }
  
  /**
   * Generate SVG visualization of the movement history
   * 
   * @returns SVG content as string
   */
  generateSVG(): string {
    const { width, height, backgroundColor, showGrid, showMetrics, title } = this.options;
    
    // Start SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // Background
    svg += `  <rect width="${width}" height="${height}" fill="${backgroundColor}" />\n`;
    
    // Grid (if enabled)
    if (showGrid) {
      svg += this.generateGrid();
    }
    
    // Title (if provided)
    if (title) {
      svg += `  <text x="${width / 2}" y="30" text-anchor="middle" font-family="Arial" font-size="20" fill="black">${title}</text>\n`;
    }
    
    // Get movement events
    const movementEvents = this.tracker.getHistory(undefined, ContextEventType.MOVEMENT_UPDATE);
    const startEvents = this.tracker.getHistory(undefined, ContextEventType.MOVEMENT_START);
    const completeEvents = this.tracker.getHistory(undefined, ContextEventType.MOVEMENT_COMPLETE);
    
    // Group by movement ID
    const movementsByID = new Map<string, ContextEvent[]>();
    
    movementEvents.forEach(event => {
      const id = event.newContext.movementId;
      if (!movementsByID.has(id)) {
        movementsByID.set(id, []);
      }
      movementsByID.get(id)!.push(event);
    });
    
    // Add start events
    startEvents.forEach(event => {
      const id = event.newContext.movementId;
      if (!movementsByID.has(id)) {
        movementsByID.set(id, []);
      }
      // Ensure start event is first
      movementsByID.get(id)!.unshift(event);
    });
    
    // Add complete events
    completeEvents.forEach(event => {
      const id = event.newContext.movementId;
      if (!movementsByID.has(id)) {
        movementsByID.set(id, []);
      }
      // Ensure complete event is last
      movementsByID.get(id)!.push(event);
    });
    
    // Sort each movement's events by timestamp
    movementsByID.forEach((events, id) => {
      movementsByID.set(
        id,
        events.sort((a, b) => a.timestamp - b.timestamp)
      );
    });
    
    // Draw each movement
    let movementIndex = 0;
    movementsByID.forEach((events, id) => {
      if (events.length > 0) {
        svg += this.generateMovementPath(events, movementIndex);
        movementIndex++;
      }
    });
    
    // Metrics (if enabled)
    if (showMetrics) {
      svg += this.generateMetrics();
    }
    
    // End SVG
    svg += '</svg>';
    
    return svg;
  }
  
  /**
   * Save the visualization to an SVG file
   * 
   * @param filePath Path to save the SVG file
   */
  saveSVG(filePath: string): void {
    const svg = this.generateSVG();
    
    // Create directory if it doesn't exist
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    fs.writeFileSync(filePath, svg);
    console.log(`SVG saved to ${filePath}`);
  }
  
  /**
   * Generate SVG for a grid
   * 
   * @returns SVG string for the grid
   */
  private generateGrid(): string {
    const { width, height } = this.options;
    let grid = '  <!-- Grid -->\n';
    const gridSize = 50;
    
    // Grid group with style
    grid += '  <g stroke="#E0E0E0" stroke-width="1" opacity="0.5">\n';
    
    // Vertical lines
    for (let x = gridSize; x < width; x += gridSize) {
      grid += `    <line x1="${x}" y1="0" x2="${x}" y2="${height}" />\n`;
    }
    
    // Horizontal lines
    for (let y = gridSize; y < height; y += gridSize) {
      grid += `    <line x1="0" y1="${y}" x2="${width}" y2="${y}" />\n`;
    }
    
    // End grid group
    grid += '  </g>\n';
    
    return grid;
  }
  
  /**
   * Generate SVG for a movement path
   * 
   * @param events Movement events
   * @param index Movement index (for color variation)
   * @returns SVG string for the movement path
   */
  private generateMovementPath(events: ContextEvent[], index: number): string {
    const { pathColor, startColor, endColor, showPoints } = this.options;
    
    // Skip if not enough events
    if (events.length < 2) {
      return '';
    }
    
    // Get positions from events
    const positions = events.map(event => event.newContext.position);
    
    // Adjust color based on index for visual distinction
    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8334E3', '#FF6D01'];
    const color = colors[index % colors.length] || pathColor;
    
    // Path element
    let pathSvg = '  <!-- Movement Path -->\n';
    pathSvg += `  <path d="M${positions[0].x},${positions[0].y}`;
    
    for (let i = 1; i < positions.length; i++) {
      pathSvg += ` L${positions[i].x},${positions[i].y}`;
    }
    
    pathSvg += `" fill="none" stroke="${color}" stroke-width="2" opacity="0.8" />\n`;
    
    // Start and end points
    pathSvg += '  <!-- Start and End Points -->\n';
    pathSvg += `  <circle cx="${positions[0].x}" cy="${positions[0].y}" r="5" fill="${startColor}" stroke="white" stroke-width="1" />\n`;
    pathSvg += `  <circle cx="${positions[positions.length - 1].x}" cy="${positions[positions.length - 1].y}" r="5" fill="${endColor}" stroke="white" stroke-width="1" />\n`;
    
    // Intermediate points (if enabled)
    if (showPoints) {
      pathSvg += '  <!-- Intermediate Points -->\n';
      pathSvg += `  <g fill="${color}" opacity="0.5">\n`;
      
      for (let i = 1; i < positions.length - 1; i++) {
        pathSvg += `    <circle cx="${positions[i].x}" cy="${positions[i].y}" r="2" />\n`;
      }
      
      pathSvg += '  </g>\n';
    }
    
    // Movement info
    const startContext = events[0].newContext;
    const endContext = events[events.length - 1].newContext;
    const duration = endContext.metrics.lastMovementDuration || 
                    (endContext.timestamp - startContext.timestamp);
    
    pathSvg += '  <!-- Movement Info -->\n';
    pathSvg += `  <text x="${positions[0].x + 10}" y="${positions[0].y - 10}" font-family="Arial" font-size="12" fill="${color}">${startContext.strategy}, ${duration}ms</text>\n`;
    
    return pathSvg;
  }
  
  /**
   * Generate SVG for metrics display
   * 
   * @returns SVG string for metrics
   */
  private generateMetrics(): string {
    const { width, height } = this.options;
    const context = this.tracker.getContext();
    const history = this.tracker.getHistory();
    
    // Group all metrics
    let metrics = '  <!-- Metrics -->\n';
    metrics += '  <g font-family="Arial" font-size="12" fill="black">\n';
    
    // Background
    metrics += `    <rect x="${width - 250}" y="50" width="230" height="160" fill="white" opacity="0.8" rx="5" />\n`;
    
    // Title
    metrics += `    <text x="${width - 240}" y="70" font-weight="bold">Movement Metrics</text>\n`;
    
    // Movement count
    const movementCount = new Set(
      history
        .filter(e => e.type === ContextEventType.MOVEMENT_COMPLETE)
        .map(e => e.newContext.movementId)
    ).size;
    
    metrics += `    <text x="${width - 240}" y="90">Movements: ${movementCount}</text>\n`;
    
    // Last position
    metrics += `    <text x="${width - 240}" y="110">Current Position: (${Math.round(context.position.x)}, ${Math.round(context.position.y)})</text>\n`;
    
    // Last duration
    metrics += `    <text x="${width - 240}" y="130">Last Duration: ${context.metrics.lastMovementDuration}ms</text>\n`;
    
    // Last strategy
    metrics += `    <text x="${width - 240}" y="150">Last Strategy: ${context.strategy}</text>\n`;
    
    // Points generated
    metrics += `    <text x="${width - 240}" y="170">Points Generated: ${context.metrics.pathPointsGenerated}</text>\n`;
    
    // Memory usage
    metrics += `    <text x="${width - 240}" y="190">Memory Usage: ${Math.round(context.metrics.memoryUsage / 1024)} KB</text>\n`;
    
    // End metrics group
    metrics += '  </g>\n';
    
    return metrics;
  }
}

// Example usage if run directly
if (require.main === module) {
  const { ContextTracker } = require('./ContextTracker');
  
  // Create a tracker with sample data
  const tracker = new ContextTracker();
  
  // Add some sample movements
  const movements = [
    { start: { x: 100, y: 100 }, end: { x: 500, y: 300 }, strategy: 'bezier', duration: 800 },
    { start: { x: 500, y: 300 }, end: { x: 200, y: 400 }, strategy: 'physics', duration: 1200 },
    { start: { x: 200, y: 400 }, end: { x: 350, y: 150 }, strategy: 'minimum_jerk', duration: 700 }
  ];
  
  movements.forEach(({ start, end, strategy, duration }) => {
    // Start point
    tracker.updateContext({ position: start });
    
    // Start movement
    tracker.startMovement(end, strategy);
    
    // Add some points along the way (simple linear interpolation)
    const steps = 10;
    for (let i = 1; i < steps; i++) {
      const progress = i / steps;
      const x = start.x + (end.x - start.x) * progress;
      const y = start.y + (end.y - start.y) * progress;
      tracker.updateMovement({ x, y }, progress * duration);
    }
    
    // Complete movement
    tracker.completeMovement(end, duration);
  });
  
  // Create visualizer
  const visualizer = new ContextVisualizer(tracker, {
    title: 'Sample Movement Visualization'
  });
  
  // Save SVG
  const outputDir = path.join(__dirname, '../../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  visualizer.saveSVG(path.join(outputDir, 'context_visualization.svg'));
}