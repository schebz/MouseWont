/**
 * Thread Pool Demo
 * 
 * Simple demonstration of the ThreadPoolManager for parallel processing
 */

import { globalThreadPool } from '../utils/threading';
import { performance } from 'perf_hooks';

/**
 * Function to measure performance
 */
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

/**
 * CPU-intensive function for testing
 */
function fibonacciRecursive(n: number): number {
  if (n <= 1) return n;
  return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

/**
 * Main function
 */
async function runDemo() {
  // Print thread pool info
  const poolInfo = globalThreadPool.getThreadPoolInfo();
  console.log('Thread pool info:', poolInfo);
  
  // Define parameters
  const numbers = [40, 41, 42, 43, 44, 45];
  
  // Sequential execution
  await measurePerformance(async () => {
    const results = [];
    for (const n of numbers) {
      results.push(fibonacciRecursive(n));
    }
    console.log(`Sequential results: ${results.length} calculations completed`);
  }, 'Sequential Fibonacci calculation');
  
  // Parallel execution with thread pool
  await measurePerformance(async () => {
    // Include the function definition in the task to make it self-contained
    const tasks = numbers.map(n => () => {
      // Define the function inside the task so it's included in serialization
      function fib(n: number): number {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
      }
      return fib(n);
    });

    const results = await Promise.all(tasks.map(task => globalThreadPool.scheduleTask(task)));
    console.log(`Parallel results: ${results.length} calculations completed`);
  }, 'Parallel Fibonacci calculation with thread pool');
  
  // Calculate π using a Monte Carlo method
  const calculatePiMonteCarlo = (iterations: number) => {
    let inside = 0;
    
    for (let i = 0; i < iterations; i++) {
      // Generate random point in unit square
      const x = Math.random();
      const y = Math.random();
      
      // Check if point is inside unit circle
      if (x * x + y * y <= 1) {
        inside++;
      }
    }
    
    // π = 4 * (points inside circle / total points)
    return 4 * inside / iterations;
  };
  
  // Sequential Monte Carlo
  await measurePerformance(async () => {
    const totalIterations = 50000000;
    const pi = calculatePiMonteCarlo(totalIterations);
    console.log(`Sequential Monte Carlo π estimate: ${pi} (${totalIterations} iterations)`);
  }, 'Sequential Monte Carlo π calculation');
  
  // Parallel Monte Carlo
  await measurePerformance(async () => {
    const numTasks = poolInfo.totalThreads || 4;
    const iterationsPerTask = 50000000 / numTasks;

    // Include the calculation function within each task for proper serialization
    const tasks = Array(numTasks).fill(null).map(() =>
      () => {
        // Self-contained Monte Carlo function
        const iterations = iterationsPerTask;
        let inside = 0;

        for (let i = 0; i < iterations; i++) {
          // Generate random point in unit square
          const x = Math.random();
          const y = Math.random();

          // Check if point is inside unit circle
          if (x * x + y * y <= 1) {
            inside++;
          }
        }

        // π = 4 * (points inside circle / total points)
        return 4 * inside / iterations;
      }
    );

    const results = await Promise.all(tasks.map(task => globalThreadPool.scheduleTask(task)));

    // Average the results
    const pi = results.reduce((sum, val) => sum + val, 0) / results.length;
    console.log(`Parallel Monte Carlo π estimate: ${pi} (${iterationsPerTask * numTasks} iterations)`);
  }, 'Parallel Monte Carlo π calculation with thread pool');
  
  // Shutdown the thread pool
  await globalThreadPool.shutdown();
}

// Run the demo
runDemo().catch(console.error);