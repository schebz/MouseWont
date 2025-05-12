/**
 * @file ThreadPoolManager.integration.test.ts
 * Integration tests for the ThreadPoolManager with real-world scenarios
 * 
 * These tests use the actual native module and worker threads to verify
 * real-world behavior of the thread pool.
 */

import { ThreadPoolManager } from './ThreadPoolManager';
import { Point } from '../../core/types';

// Set to true to run integration tests (may take longer)
const RUN_INTEGRATION_TESTS = true;

// Skip tests if not running integration tests
const conditionalTest = RUN_INTEGRATION_TESTS ? test : test.skip;

describe('ThreadPoolManager Integration Tests', () => {
  let threadPoolManager: ThreadPoolManager;

  beforeEach(() => {
    // Create a small pool for testing
    threadPoolManager = new ThreadPoolManager({ jsThreads: 2 });
  });

  afterEach(async () => {
    // Clean up
    await threadPoolManager.shutdown();
  });

  conditionalTest('should execute CPU-intensive tasks in parallel', async () => {
    // Create a CPU-intensive task
    const computeFactorial = (n: number): number => {
      if (n <= 1) return 1;
      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }
      return result;
    };

    const numbers = [20, 21, 22, 23, 24, 25];
    
    // Execute tasks in parallel
    const startTime = Date.now();
    const results = await Promise.all(
      numbers.map(n => threadPoolManager.scheduleTask(computeFactorial, n))
    );
    const duration = Date.now() - startTime;
    
    // Verify results
    expect(results).toHaveLength(numbers.length);
    expect(results[0]).toBe(computeFactorial(20));
    
    // Log performance info
    console.log(`Parallel execution of ${numbers.length} factorials took ${duration}ms`);
    
    // Now run the same tasks sequentially for comparison
    const seqStartTime = Date.now();
    const seqResults = [];
    for (const n of numbers) {
      seqResults.push(computeFactorial(n));
    }
    const seqDuration = Date.now() - seqStartTime;
    
    console.log(`Sequential execution of ${numbers.length} factorials took ${seqDuration}ms`);
    
    // We expect parallel to be faster, but not necessary for the test to pass
    // since hardware and test environment may vary
    console.log(`Speedup: ${seqDuration / duration}x`);
  }, 30000);

  conditionalTest('should generate Bezier paths in parallel', async () => {
    // Generate test points
    const pointCount = 100;
    const startPoints: Point[] = [];
    const endPoints: Point[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      startPoints.push({ 
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      });
      endPoints.push({ 
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      });
    }
    
    // Generate paths using thread pool
    const startTime = Date.now();
    const paths = await threadPoolManager.generateBezierPaths(
      startPoints,
      endPoints,
      {
        numPoints: 100,
        complexity: 0.5,
        overshootFactor: 0.2,
        jitterAmount: 1.0,
        seed: 12345
      }
    );
    const duration = Date.now() - startTime;
    
    // Verify results
    expect(paths).toHaveLength(pointCount);
    expect(paths[0]).toHaveLength(100); // numPoints
    
    // Log performance
    console.log(`Generated ${pointCount} Bezier paths in ${duration}ms`);
  }, 30000);

  conditionalTest('should simulate physics movements in parallel', async () => {
    // Generate test points
    const pointCount = 100;
    const startPoints: Point[] = [];
    const endPoints: Point[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      startPoints.push({ 
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      });
      endPoints.push({ 
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      });
    }
    
    // Simulate movements using thread pool
    const startTime = Date.now();
    const paths = await threadPoolManager.simulatePhysicsMovements(
      startPoints,
      endPoints,
      {
        mass: 1.0,
        springConstant: 8.0,
        dampingFactor: 0.7,
        timeStep: 0.016,
        maxSteps: 100,
        stoppingThreshold: 0.1,
        seed: 12345
      }
    );
    const duration = Date.now() - startTime;
    
    // Verify results
    expect(paths).toHaveLength(pointCount);
    expect(paths[0].length).toBeGreaterThan(0);
    
    // Log performance
    console.log(`Simulated ${pointCount} physics movements in ${duration}ms`);
  }, 30000);

  conditionalTest('should generate OU processes in parallel', async () => {
    const processCount = 100;
    const pointCount = 1000;
    
    // Generate processes using thread pool
    const startTime = Date.now();
    const processes = await threadPoolManager.generateOUProcesses({
      count: processCount,
      points: pointCount,
      theta: 0.7,
      sigma: 0.5,
      dt: 0.1,
      seed: 12345
    });
    const duration = Date.now() - startTime;
    
    // Verify results
    expect(processes).toHaveLength(processCount);
    expect(processes[0].jitterX).toHaveLength(pointCount);
    expect(processes[0].jitterY).toHaveLength(pointCount);
    
    // Log performance
    console.log(`Generated ${processCount} OU processes with ${pointCount} points each in ${duration}ms`);
  }, 30000);

  conditionalTest('should handle concurrent batch operations', async () => {
    // Setup test data
    const pointCount = 50;
    const startPoints: Point[] = [];
    const endPoints: Point[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      startPoints.push({ 
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      });
      endPoints.push({ 
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      });
    }
    
    // Run multiple batch operations concurrently
    const startTime = Date.now();
    const [bezierPaths, physicsPaths, ouProcesses] = await Promise.all([
      threadPoolManager.generateBezierPaths(
        startPoints,
        endPoints,
        {
          numPoints: 100,
          complexity: 0.5,
          overshootFactor: 0.2,
          jitterAmount: 1.0,
          seed: 12345
        }
      ),
      threadPoolManager.simulatePhysicsMovements(
        startPoints,
        endPoints,
        {
          mass: 1.0,
          springConstant: 8.0,
          dampingFactor: 0.7,
          timeStep: 0.016,
          maxSteps: 100,
          stoppingThreshold: 0.1,
          seed: 12345
        }
      ),
      threadPoolManager.generateOUProcesses({
        count: pointCount,
        points: 100,
        theta: 0.7,
        sigma: 0.5,
        dt: 0.1,
        seed: 12345
      })
    ]);
    const duration = Date.now() - startTime;
    
    // Verify results
    expect(bezierPaths).toHaveLength(pointCount);
    expect(physicsPaths).toHaveLength(pointCount);
    expect(ouProcesses).toHaveLength(pointCount);
    
    // Log performance
    console.log(`Executed 3 concurrent batch operations in ${duration}ms`);
  }, 60000);

  conditionalTest('should recover from worker errors', async () => {
    // Create a task that will crash the worker
    const crashingTask = () => {
      // Access undefined variable to cause error
      // @ts-ignore 
      return nonExistentVariable.someProperty;
    };
    
    // Create a normal task
    const normalTask = () => 42;
    
    // Execute tasks
    // First, try the crashing task
    await expect(threadPoolManager.scheduleTask(crashingTask)).rejects.toThrow();
    
    // Wait a moment for worker recovery
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Then try a normal task - should still work after recovery
    const result = await threadPoolManager.scheduleTask(normalTask);
    expect(result).toBe(42);
  }, 30000);

  conditionalTest('should handle task timeouts', async () => {
    // Create a thread pool with short timeout
    const shortTimeoutPool = new ThreadPoolManager({ 
      jsThreads: 2,
      taskTimeout: 1000 // 1 second timeout
    });
    
    try {
      // Create a task that takes longer than the timeout
      const longTask = () => new Promise(resolve => setTimeout(resolve, 3000));
      
      // Execute task - should time out
      await expect(shortTimeoutPool.scheduleTask(longTask)).rejects.toThrow(/timeout/);
    } finally {
      // Clean up
      await shortTimeoutPool.shutdown();
    }
  }, 30000);

  conditionalTest('should handle large workloads', async () => {
    // Generate a large number of small tasks
    const taskCount = 1000;
    const tasks = Array(taskCount).fill(null).map((_, i) => () => i * i);
    
    // Execute tasks in batches to avoid overwhelming the queue
    const batchSize = 100;
    const results = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < taskCount; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(task => threadPoolManager.scheduleTask(task))
      );
      results.push(...batchResults);
      
      // Log progress
      console.log(`Processed ${Math.min(i + batchSize, taskCount)}/${taskCount} tasks...`);
    }
    
    const duration = Date.now() - startTime;
    
    // Verify results
    expect(results).toHaveLength(taskCount);
    expect(results[10]).toBe(10 * 10);
    
    // Log performance
    console.log(`Processed ${taskCount} tasks in ${duration}ms (${duration / taskCount}ms per task)`);
  }, 60000);
});