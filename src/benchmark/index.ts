/**
 * Benchmark utility for MousePlayWrong
 * 
 * Measures performance of different movement strategies
 */

import { MovementStrategy, MovementOptions } from '../core/types';
import { StrategyFactory } from '../strategies/StrategyFactory';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Benchmark result for a single strategy
 */
interface BenchmarkResult {
  strategy: MovementStrategy;
  distance: number;
  pathPoints: number;
  execTime: number;
  pathGenTime: number;
  memoryUsage: number;
}

/**
 * Run benchmarks for all strategies
 *
 * @param iterations Number of iterations for each test
 * @param outputPath Path to save benchmark results
 * @returns Promise<BenchmarkResult[]> Results of the benchmark
 */
async function runBenchmarks(iterations: number = 100, outputPath?: string): Promise<BenchmarkResult[]> {
  const factory = new StrategyFactory();
  const strategies = Object.values(MovementStrategy);

  console.log(`Running benchmarks (${iterations} iterations per strategy)...`);

  // Test with different distances
  const distances = [100, 500, 1000];
  // Test with different path point counts
  const pathPoints = [50, 100, 200];

  // Store results
  const results: BenchmarkResult[] = [];

  // Run benchmarks for each configuration
  for (const strategy of strategies) {
    for (const distance of distances) {
      for (const points of pathPoints) {
        const result = await benchmarkStrategy(
          strategy,
          distance,
          points,
          iterations
        );

        results.push(result);

        console.log(
          `${strategy.padEnd(15)} | ` +
          `Distance: ${distance.toString().padEnd(5)} | ` +
          `Points: ${points.toString().padEnd(5)} | ` +
          `Time: ${result.execTime.toFixed(2).padEnd(8)} ms | ` +
          `PathGen: ${result.pathGenTime.toFixed(2).padEnd(8)} ms | ` +
          `Memory: ${(result.memoryUsage / 1024).toFixed(2)} KB`
        );
      }
    }
  }

  // Save results if output path is provided
  if (outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      outputPath,
      JSON.stringify(results, null, 2)
    );

    console.log(`Benchmark results saved to ${outputPath}`);
  }

  return results;
}

/**
 * Benchmark a specific strategy
 *
 * @param strategy Strategy to benchmark
 * @param distance Distance between points
 * @param pathPoints Number of points to generate
 * @param iterations Number of iterations
 * @returns Promise<BenchmarkResult> Benchmark result
 */
async function benchmarkStrategy(
  strategy: MovementStrategy,
  distance: number,
  pathPoints: number,
  iterations: number
): Promise<BenchmarkResult> {
  const factory = new StrategyFactory();
  const generator = await factory.createStrategy(strategy);

  const options: MovementOptions = {
    strategy,
    duration: 500,
    overshootFactor: 0.2,
    jitterAmount: 1.0,
    complexity: 0.5,
    pathPoints,
    velocityProfile: 'minimum_jerk'
  };

  // Start point
  const start = { x: 0, y: 0 };
  // End point at the specified distance
  const end = { x: distance, y: 0 };

  // Measure initialization memory
  const initialMemory = process.memoryUsage().heapUsed;

  // Warm-up run
  await generator.generatePath(start, end, options);

  // Time measurement
  const startTime = performance.now();

  let pathGenTime = 0;

  // Run the benchmark
  for (let i = 0; i < iterations; i++) {
    const pathGenStart = performance.now();
    await generator.generatePath(start, end, options);
    pathGenTime += performance.now() - pathGenStart;
  }

  const endTime = performance.now();

  // Measure final memory
  const finalMemory = process.memoryUsage().heapUsed;

  // Calculate metrics
  const execTime = (endTime - startTime) / iterations;
  const memoryUsage = (finalMemory - initialMemory) / iterations;

  return {
    strategy,
    distance,
    pathPoints,
    execTime,
    pathGenTime: pathGenTime / iterations,
    memoryUsage
  };
}

// Run benchmarks if executed directly
if (require.main === module) {
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '../../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  (async () => {
    try {
      await runBenchmarks(
        100,
        path.join(outputDir, 'benchmark-results.json')
      );
    } catch (error) {
      console.error('Error running benchmarks:', error);
      process.exit(1);
    }
  })();
}

export { runBenchmarks, benchmarkStrategy };