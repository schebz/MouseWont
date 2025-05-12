/**
 * Visualization tool for MousePlayWrong
 */

import { PathVisualizer } from './PathVisualizer';
import { MovementStrategy } from '../core/types';
import path from 'path';

/**
 * Run the visualizer
 */
function run() {
  const visualizer = new PathVisualizer();
  
  // Compare all strategies
  visualizer.compareStrategies(
    { x: 100, y: 100 },
    { x: 700, y: 400 },
    [
      MovementStrategy.BEZIER,
      MovementStrategy.PHYSICS,
      MovementStrategy.MINIMUM_JERK,
      MovementStrategy.COMPOSITE,
      MovementStrategy.ADAPTIVE
    ],
    {
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100
    },
    path.join(__dirname, '../../output/strategy-comparison.svg')
  );
  
  // Compare different overshoot factors using Bezier
  visualizer.compareStrategies(
    { x: 100, y: 100 },
    { x: 700, y: 400 },
    [MovementStrategy.BEZIER],
    {
      overshootFactor: 0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100
    },
    path.join(__dirname, '../../output/no-overshoot.svg')
  );
  
  visualizer.compareStrategies(
    { x: 100, y: 100 },
    { x: 700, y: 400 },
    [MovementStrategy.BEZIER],
    {
      overshootFactor: 0.5,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100
    },
    path.join(__dirname, '../../output/medium-overshoot.svg')
  );
  
  visualizer.compareStrategies(
    { x: 100, y: 100 },
    { x: 700, y: 400 },
    [MovementStrategy.BEZIER],
    {
      overshootFactor: 1.0,
      jitterAmount: 0,
      complexity: 0.5,
      pathPoints: 100
    },
    path.join(__dirname, '../../output/high-overshoot.svg')
  );
  
  // Compare different complexity factors using Bezier
  visualizer.compareStrategies(
    { x: 100, y: 100 },
    { x: 700, y: 400 },
    [MovementStrategy.BEZIER],
    {
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.1,
      pathPoints: 100
    },
    path.join(__dirname, '../../output/low-complexity.svg')
  );
  
  visualizer.compareStrategies(
    { x: 100, y: 100 },
    { x: 700, y: 400 },
    [MovementStrategy.BEZIER],
    {
      overshootFactor: 0.2,
      jitterAmount: 0,
      complexity: 0.9,
      pathPoints: 100
    },
    path.join(__dirname, '../../output/high-complexity.svg')
  );
  
  console.log('Visualization complete. SVGs saved to output directory.');
}

// Run if executed directly
if (require.main === module) {
  run();
}

export { run, PathVisualizer };