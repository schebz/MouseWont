/**
 * PathVisualizer.ts
 * 
 * Utility for visualizing mouse movement paths
 */

import { Point, MovementOptions, MovementStrategy } from '../core/types';
import { StrategyFactory } from '../strategies/StrategyFactory';
import fs from 'fs';
import path from 'path';

/**
 * Configuration for path visualization
 */
export interface VisualizationConfig {
  /** Width of the visualization in pixels */
  width: number;
  
  /** Height of the visualization in pixels */
  height: number;
  
  /** Background color */
  backgroundColor: string;
  
  /** Paths to render */
  paths: PathConfig[];
  
  /** Title of the visualization */
  title?: string;
  
  /** Whether to show velocity indicators */
  showVelocity?: boolean;
  
  /** Whether to show grid lines */
  showGrid?: boolean;
  
  /** Whether to show points along the path */
  showPoints?: boolean;
  
  /** Whether to show the start and end points */
  showEndpoints?: boolean;
}

/**
 * Configuration for a single path
 */
export interface PathConfig {
  /** Path points */
  points: Point[];
  
  /** Path color */
  color: string;
  
  /** Path label */
  label: string;
  
  /** Line width */
  lineWidth?: number;
  
  /** Opacity */
  opacity?: number;
}

/**
 * Utility class for visualizing mouse movement paths
 */
export class PathVisualizer {
  /**
   * Render a set of paths to an SVG string
   * 
   * @param config Visualization configuration
   * @returns SVG content as string
   */
  generateSVG(config: VisualizationConfig): string {
    const {
      width,
      height,
      backgroundColor,
      paths,
      title,
      showVelocity = false,
      showGrid = true,
      showPoints = false,
      showEndpoints = true
    } = config;
    
    // Start SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // Background
    svg += `  <rect width="${width}" height="${height}" fill="${backgroundColor}" />\n`;
    
    // Grid (if enabled)
    if (showGrid) {
      svg += this.generateGrid(width, height);
    }
    
    // Title (if provided)
    if (title) {
      svg += `  <text x="${width / 2}" y="30" text-anchor="middle" font-family="Arial" font-size="20" fill="black">${title}</text>\n`;
    }
    
    // Draw each path
    for (const pathConfig of paths) {
      svg += this.generatePath(
        pathConfig,
        showVelocity,
        showPoints,
        showEndpoints
      );
    }
    
    // Legend
    svg += this.generateLegend(paths, width);
    
    // End SVG
    svg += '</svg>';
    
    return svg;
  }
  
  /**
   * Save the visualization to an SVG file
   * 
   * @param config Visualization configuration
   * @param filePath Path to save the SVG file
   */
  saveSVG(config: VisualizationConfig, filePath: string): void {
    const svg = this.generateSVG(config);
    fs.writeFileSync(filePath, svg);
    console.log(`SVG saved to ${filePath}`);
  }
  
  /**
   * Compare multiple movement strategies by generating and visualizing paths
   *
   * @param start Starting point
   * @param end Ending point
   * @param strategies Array of strategies to compare
   * @param baseOptions Base movement options
   * @param outputPath Path to save the SVG file
   * @returns Promise<void> that resolves when the visualization is saved
   */
  async compareStrategies(
    start: Point,
    end: Point,
    strategies: MovementStrategy[],
    baseOptions: Partial<MovementOptions> = {},
    outputPath: string
  ): Promise<void> {
    const factory = new StrategyFactory();
    const pathConfigs: PathConfig[] = [];

    // Color palette for strategies
    const colors = [
      '#FF5252', // Red
      '#448AFF', // Blue
      '#66BB6A', // Green
      '#FFC107', // Amber
      '#9C27B0', // Purple
      '#FF9800', // Orange
      '#607D8B'  // Blue Gray
    ];

    // Generate a path for each strategy
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const generator = await factory.createStrategy(strategy);

      const options: MovementOptions = {
        strategy,
        duration: 500,
        overshootFactor: 0.2,
        jitterAmount: 1.0,
        complexity: 0.5,
        pathPoints: 100,
        velocityProfile: 'minimum_jerk',
        ...baseOptions
      };

      const points = await generator.generatePath(start, end, options);

      pathConfigs.push({
        points,
        color: colors[i % colors.length],
        label: strategy,
        lineWidth: 2,
        opacity: 0.8
      });
    }
    
    // Create the visualization config
    const config: VisualizationConfig = {
      width: 800,
      height: 600,
      backgroundColor: '#F8F9FA',
      paths: pathConfigs,
      title: 'Movement Strategy Comparison',
      showVelocity: true,
      showGrid: true,
      showPoints: false,
      showEndpoints: true
    };

    // Save the visualization
    this.saveSVG(config, outputPath);
  }
  
  /**
   * Generate SVG for a grid
   * 
   * @param width SVG width
   * @param height SVG height
   * @returns SVG string for the grid
   */
  private generateGrid(width: number, height: number): string {
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
   * Generate SVG for a path
   * 
   * @param pathConfig Path configuration
   * @param showVelocity Whether to show velocity indicators
   * @param showPoints Whether to show points along the path
   * @param showEndpoints Whether to show the start and end points
   * @returns SVG string for the path
   */
  private generatePath(
    pathConfig: PathConfig,
    showVelocity: boolean,
    showPoints: boolean,
    showEndpoints: boolean
  ): string {
    const { points, color, lineWidth = 2, opacity = 1 } = pathConfig;
    
    if (points.length < 2) {
      return '';
    }
    
    let pathSvg = '';
    
    // Main path
    pathSvg += '  <!-- Path -->\n';
    pathSvg += `  <path d="M${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      pathSvg += ` L${points[i].x},${points[i].y}`;
    }
    
    pathSvg += `" fill="none" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}" />\n`;
    
    // Velocity indicators (if enabled)
    if (showVelocity) {
      pathSvg += '  <!-- Velocity indicators -->\n';
      pathSvg += `  <g stroke="${color}" opacity="${opacity * 0.7}">\n`;
      
      // Sample velocity at regular intervals
      const velocitySampleRate = Math.ceil(points.length / 20);
      
      for (let i = velocitySampleRate; i < points.length; i += velocitySampleRate) {
        const prev = points[i - velocitySampleRate];
        const curr = points[i];
        
        // Calculate velocity (distance between points)
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Draw velocity indicator (arrowhead)
        if (distance > 0) {
          const arrowLength = Math.min(distance * 0.5, 10);
          const angle = Math.atan2(dy, dx);
          
          // Arrow endpoint
          const arrowX = curr.x;
          const arrowY = curr.y;
          
          // Arrow start point
          const startX = arrowX - arrowLength * Math.cos(angle);
          const startY = arrowY - arrowLength * Math.sin(angle);
          
          // Arrow head
          const headSize = Math.min(3 + distance * 0.05, 8);
          const headAngle1 = angle - Math.PI * 0.8;
          const headAngle2 = angle + Math.PI * 0.8;
          
          const head1X = arrowX - headSize * Math.cos(headAngle1);
          const head1Y = arrowY - headSize * Math.sin(headAngle1);
          const head2X = arrowX - headSize * Math.cos(headAngle2);
          const head2Y = arrowY - headSize * Math.sin(headAngle2);
          
          // Draw arrow
          pathSvg += `    <line x1="${startX}" y1="${startY}" x2="${arrowX}" y2="${arrowY}" stroke-width="${Math.min(distance * 0.05 + 1, 3)}" />\n`;
          pathSvg += `    <line x1="${arrowX}" y1="${arrowY}" x2="${head1X}" y2="${head1Y}" stroke-width="${Math.min(distance * 0.05 + 1, 3)}" />\n`;
          pathSvg += `    <line x1="${arrowX}" y1="${arrowY}" x2="${head2X}" y2="${head2Y}" stroke-width="${Math.min(distance * 0.05 + 1, 3)}" />\n`;
        }
      }
      
      pathSvg += '  </g>\n';
    }
    
    // Points along path (if enabled)
    if (showPoints) {
      pathSvg += '  <!-- Points -->\n';
      pathSvg += `  <g fill="${color}" opacity="${opacity * 0.7}">\n`;
      
      for (let i = 0; i < points.length; i++) {
        pathSvg += `    <circle cx="${points[i].x}" cy="${points[i].y}" r="2" />\n`;
      }
      
      pathSvg += '  </g>\n';
    }
    
    // Start and end points (if enabled)
    if (showEndpoints) {
      pathSvg += '  <!-- Endpoints -->\n';
      
      // Start point (green)
      pathSvg += `    <circle cx="${points[0].x}" cy="${points[0].y}" r="5" fill="#4CAF50" stroke="white" stroke-width="1" />\n`;
      
      // End point (red)
      pathSvg += `    <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="5" fill="#F44336" stroke="white" stroke-width="1" />\n`;
    }
    
    return pathSvg;
  }
  
  /**
   * Generate SVG for the legend
   * 
   * @param paths Path configurations
   * @param width SVG width
   * @returns SVG string for the legend
   */
  private generateLegend(paths: PathConfig[], width: number): string {
    let legend = '  <!-- Legend -->\n';
    legend += '  <g font-family="Arial" font-size="12">\n';
    
    const lineHeight = 20;
    const startY = 40;
    const legendX = width - 200;
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const y = startY + i * lineHeight;
      
      // Line sample
      legend += `    <line x1="${legendX}" y1="${y}" x2="${legendX + 30}" y2="${y}" stroke="${path.color}" stroke-width="${path.lineWidth || 2}" opacity="${path.opacity || 1}" />\n`;
      
      // Label
      legend += `    <text x="${legendX + 40}" y="${y + 4}" fill="black">${path.label}</text>\n`;
    }
    
    legend += '  </g>\n';
    
    return legend;
  }
}