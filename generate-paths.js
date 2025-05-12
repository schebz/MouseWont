/**
 * Path generation script
 * 
 * Generates multiple mouse movement paths using different strategies
 * and saves them to a JSON file for visualization
 */

// Load the native module
let nativeModule;
try {
  nativeModule = require('./build/Release/mouse_math.node');
  console.log(`C++ module available, SIMD: ${nativeModule.isSIMDAvailable()}, Version: ${nativeModule.version}`);
} catch (err) {
  console.error('Failed to load native module:', err);
  process.exit(1);
}

const fs = require('fs');

// Generate random points within screen bounds
function generateRandomPoints(count, screenWidth = 1920, screenHeight = 1080) {
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: Math.floor(Math.random() * screenWidth),
      y: Math.floor(Math.random() * screenHeight)
    });
  }
  return points;
}

// Generate pairs of start/end points
function generatePointPairs(count, minDistance = 200, maxDistance = 800, screenWidth = 1920, screenHeight = 1080) {
  const pairs = [];
  
  for (let i = 0; i < count; i++) {
    let start, end, dx, dy, distance;
    
    // Generate pairs with a minimum distance between them
    do {
      start = {
        x: Math.floor(Math.random() * screenWidth),
        y: Math.floor(Math.random() * screenHeight)
      };
      
      // Generate end point with a random angle and distance
      const angle = Math.random() * 2 * Math.PI;
      distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      end = {
        x: Math.floor(start.x + Math.cos(angle) * distance),
        y: Math.floor(start.y + Math.sin(angle) * distance)
      };
      
      // Clamp to screen bounds
      end.x = Math.max(0, Math.min(screenWidth, end.x));
      end.y = Math.max(0, Math.min(screenHeight, end.y));
      
      // Calculate actual distance
      dx = end.x - start.x;
      dy = end.y - start.y;
      distance = Math.sqrt(dx * dx + dy * dy);
      
    } while (distance < minDistance || distance > maxDistance);
    
    pairs.push({ start, end, distance });
  }
  
  return pairs;
}

// Main function
function generatePaths() {
  // Generate 5 random point pairs
  const pointPairs = generatePointPairs(5);
  
  // Movement models to test
  const models = [
    { name: 'Bezier', options: { 
      complexity: 0.5,
      overshootFactor: 0.2,
      jitterAmount: 1.0,
      numPoints: 100,
      seed: 12345
    }},
    { name: 'BezierHigh', options: { 
      complexity: 0.8,
      overshootFactor: 0.3,
      jitterAmount: 2.0,
      numPoints: 100,
      seed: 12345
    }},
    { name: 'Physics', options: {
      mass: 1.0,
      springConstant: 8.0,
      dampingFactor: 0.7,
      timeStep: 0.016,
      maxSteps: 500,
      stoppingThreshold: 0.1,
      seed: 12345
    }},
    { name: 'PhysicsLowDamping', options: {
      mass: 1.0,
      springConstant: 8.0,
      dampingFactor: 0.3, // Lower damping for more oscillation
      timeStep: 0.016,
      maxSteps: 500,
      stoppingThreshold: 0.1,
      seed: 12345
    }},
    { name: 'MinimumJerk', numPoints: 100 }
  ];
  
  // Generate paths for each model and point pair
  const results = [];
  
  pointPairs.forEach((pair, pairIndex) => {
    models.forEach(model => {
      let path;
      
      // Generate path based on model type
      if (model.name.startsWith('Bezier')) {
        path = nativeModule.generateBezierPath(
          pair.start,
          pair.end,
          model.options.complexity,
          model.options.overshootFactor,
          model.options.jitterAmount,
          model.options.numPoints,
          model.options.seed
        );
      } else if (model.name.startsWith('Physics')) {
        path = nativeModule.simulatePhysicsMovement(
          pair.start,
          pair.end,
          model.options
        );
      } else if (model.name === 'MinimumJerk') {
        path = nativeModule.generateMinimumJerkTrajectory(
          pair.start,
          pair.end,
          model.numPoints
        );
      }
      
      // Add jitter for visualization (extra demonstration)
      if (model.name === 'BezierHigh') {
        // Get OU process jitter
        const jitter = nativeModule.generateOrnsteinUhlenbeckProcess(
          path.length, // Number of points
          0.7,         // Mean reversion rate
          0.5,         // Volatility
          0.1,         // Time step
          12345        // Seed
        );
        
        // Apply jitter to path
        const jitteredPath = path.map((point, i) => ({
          x: point.x + jitter.jitterX[i] * 5, // Scale jitter
          y: point.y + jitter.jitterY[i] * 5
        }));
        
        // Add both paths for comparison
        results.push({
          pairIndex,
          model: model.name,
          variant: 'original',
          start: pair.start,
          end: pair.end,
          distance: pair.distance,
          path: path
        });
        
        results.push({
          pairIndex,
          model: model.name,
          variant: 'jittered',
          start: pair.start,
          end: pair.end,
          distance: pair.distance,
          path: jitteredPath
        });
      } else {
        // Add the path to results
        results.push({
          pairIndex,
          model: model.name,
          variant: 'original',
          start: pair.start,
          end: pair.end,
          distance: pair.distance,
          path: path
        });
      }
    });
  });
  
  // Save results to a file
  fs.writeFileSync(
    'path-samples.json', 
    JSON.stringify(results, null, 2)
  );
  
  console.log(`Generated ${results.length} paths for ${pointPairs.length} point pairs`);
  console.log('Results saved to path-samples.json');
}

// Run the script
generatePaths();