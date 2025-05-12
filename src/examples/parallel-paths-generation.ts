/**
 * Example demonstrating parallel path generation using the thread pool
 * 
 * This script demonstrates how to generate multiple mouse movement paths
 * in parallel using both C++ batched operations and JavaScript thread pool.
 */

import { BezierPathGenerator } from '../strategies/bezier/BezierPathGenerator';
import { CppMathModule } from '../core/math/CppMathModule';
import { Point, MovementOptions, MovementStrategy } from '../core/types';
import { globalThreadPool } from '../utils/threading';
import { performance } from 'perf_hooks';

// Create a math module - will try to load C++ native module if available
const mathModule = new CppMathModule();

// Function to generate random points
function generateRandomPoints(count: number, screenWidth = 1920, screenHeight = 1080): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push({
      x: Math.floor(Math.random() * screenWidth),
      y: Math.floor(Math.random() * screenHeight)
    });
  }
  return points;
}

// Function to measure performance
async function measurePerformance(fn: () => Promise<any>, name: string): Promise<void> {
  console.log(`Running ${name}...`);
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    console.log(`${name} completed in ${duration.toFixed(2)}ms`);
  } catch (error) {
    console.error(`${name} failed:`, error);
  }
}

// Main function to run the demo
async function runDemo() {
  // Wait for math module to initialize
  await mathModule.isAvailable();
  
  // Print thread pool info
  const poolInfo = globalThreadPool.getThreadPoolInfo();
  console.log('Thread pool info:', poolInfo);
  
  // Parameters for the benchmark
  const numPaths = 1000;
  const options: MovementOptions = {
    strategy: MovementStrategy.BEZIER,
    duration: 1.0,
    overshootFactor: 0.2,
    jitterAmount: 1.0,
    complexity: 0.5,
    pathPoints: 100,
    velocityProfile: 'minimum_jerk'
  };
  
  // Generate random start and end points
  console.log(`Generating ${numPaths} random point pairs...`);
  const startPoints = generateRandomPoints(numPaths);
  const endPoints = generateRandomPoints(numPaths);
  
  // Bezier generator with math module for C++ operations
  const bezierWithCpp = new BezierPathGenerator(12345, mathModule);
  
  // Bezier generator without math module for pure JS implementation
  const bezierWithoutCpp = new BezierPathGenerator(12345);
  
  // Sequential bezier path generation
  await measurePerformance(async () => {
    const paths = [];
    for (let i = 0; i < numPaths; i++) {
      const path = await bezierWithoutCpp.generatePath(
        startPoints[i],
        endPoints[i],
        options
      );
      paths.push(path);
    }
    console.log(`Generated ${paths.length} paths sequentially with ${paths[0].length} points each`);
  }, 'Sequential path generation (JavaScript)');
  
  // Parallel bezier path generation with JavaScript thread pool
  await measurePerformance(async () => {
    const paths = await bezierWithoutCpp.generatePaths(
      startPoints,
      endPoints,
      options
    );
    console.log(`Generated ${paths.length} paths in parallel with JS thread pool, ${paths[0].length} points each`);
  }, 'Parallel path generation (JavaScript thread pool)');
  
  // Batch bezier path generation with C++ if available
  if (await mathModule.isAvailable()) {
    await measurePerformance(async () => {
      const paths = await bezierWithCpp.generatePaths(
        startPoints,
        endPoints,
        options
      );
      console.log(`Generated ${paths.length} paths in parallel with C++ batch operations, ${paths[0].length} points each`);
    }, 'Batch path generation (C++ with SIMD)');
  } else {
    console.log('C++ math module not available, skipping C++ batch test');
  }
  
  // Shutdown the thread pool
  await globalThreadPool.shutdown();
}

// Run the demo
runDemo().catch(console.error);