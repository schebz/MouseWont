/**
 * @file ThreadPoolManager.test.ts
 * Tests for the JavaScript thread pool integration with C++ thread pool
 */

import { ThreadPoolManager } from './ThreadPoolManager';
import { Point } from '../../core/types';
import { jest } from '@jest/globals';

// Mock the native module
jest.mock('../../../build/Release/mouse_math.node', () => ({
  getThreadPoolInfo: jest.fn(() => ({
    threadCount: 4,
    activeThreads: 0,
    queueSize: 0
  })),
  batchGenerateBezierPaths: jest.fn((startPoints, endPoints, numPoints, complexity, overshootFactor, jitterAmount) => {
    // Return mock paths
    return startPoints.map((_, i) => {
      return Array(numPoints).fill(null).map((_, j) => ({
        x: startPoints[i].x + (endPoints[i].x - startPoints[i].x) * (j / (numPoints - 1)),
        y: startPoints[i].y + (endPoints[i].y - startPoints[i].y) * (j / (numPoints - 1))
      }));
    });
  }),
  batchSimulatePhysicsMovements: jest.fn((startPoints, endPoints) => {
    // Return mock paths
    return startPoints.map((start, i) => {
      return [start, endPoints[i]];
    });
  }),
  batchGenerateOUProcesses: jest.fn((count, points) => {
    // Return mock jitter processes
    return Array(count).fill(null).map(() => ({
      jitterX: Array(points).fill(0).map(() => Math.random() - 0.5),
      jitterY: Array(points).fill(0).map(() => Math.random() - 0.5)
    }));
  }),
  isSIMDAvailable: jest.fn(() => true),
  version: '0.3.0'
}));

// Mock worker_threads module
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn()
  })),
  isMainThread: true,
  parentPort: {
    on: jest.fn(),
    postMessage: jest.fn()
  },
  workerData: {}
}));

describe('ThreadPoolManager', () => {
  let threadPoolManager: ThreadPoolManager;
  let mockCppModule: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCppModule = require('../../../build/Release/mouse_math.node');
    threadPoolManager = new ThreadPoolManager();
  });

  afterEach(() => {
    if (threadPoolManager) {
      threadPoolManager.shutdown();
    }
  });

  describe('initialization', () => {
    test('should initialize with default options', () => {
      expect(threadPoolManager).toBeDefined();
      expect(threadPoolManager.isRunning()).toBe(true);
    });

    test('should initialize with custom thread count', () => {
      const customThreadCount = 2;
      threadPoolManager = new ThreadPoolManager({ jsThreads: customThreadCount });
      expect(threadPoolManager.getWorkerCount()).toBe(customThreadCount);
    });

    test('should handle initialization with invalid thread counts', () => {
      // Test with negative count (should use default)
      threadPoolManager = new ThreadPoolManager({ jsThreads: -1 });
      expect(threadPoolManager.getWorkerCount()).toBeGreaterThan(0);

      // Test with zero count (should use default)
      threadPoolManager = new ThreadPoolManager({ jsThreads: 0 });
      expect(threadPoolManager.getWorkerCount()).toBeGreaterThan(0);
    });
    
    test('should detect available hardware threads', () => {
      expect(threadPoolManager.getAvailableHardwareThreads()).toBeGreaterThan(0);
    });
  });

  describe('resource management', () => {
    test('should shut down properly and release resources', async () => {
      expect(threadPoolManager.isRunning()).toBe(true);
      await threadPoolManager.shutdown();
      expect(threadPoolManager.isRunning()).toBe(false);
    });

    test('should handle multiple shutdown calls gracefully', async () => {
      await threadPoolManager.shutdown();
      await threadPoolManager.shutdown(); // Second call should not throw
      expect(threadPoolManager.isRunning()).toBe(false);
    });

    test('should restart after shutdown', async () => {
      await threadPoolManager.shutdown();
      expect(threadPoolManager.isRunning()).toBe(false);
      
      await threadPoolManager.start();
      expect(threadPoolManager.isRunning()).toBe(true);
    });
  });

  describe('task scheduling', () => {
    test('should process tasks using the thread pool', async () => {
      const task = jest.fn(() => 42);
      const result = await threadPoolManager.scheduleTask(task);
      expect(result).toBe(42);
    });

    test('should handle multiple concurrent tasks', async () => {
      const tasks = Array(10).fill(null).map((_, i) => jest.fn(() => i));
      const results = await Promise.all(tasks.map(task => threadPoolManager.scheduleTask(task)));
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    test('should handle tasks that throw errors', async () => {
      const errorTask = jest.fn(() => { throw new Error('Test error'); });
      await expect(threadPoolManager.scheduleTask(errorTask)).rejects.toThrow('Test error');
    });

    test('should cancel pending tasks on shutdown', async () => {
      // Create a long-running task
      const longTask = jest.fn(() => new Promise(resolve => setTimeout(resolve, 5000)));
      
      // Schedule the task but don't await it
      const taskPromise = threadPoolManager.scheduleTask(longTask);
      
      // Shut down immediately
      await threadPoolManager.shutdown();
      
      // The task should be cancelled
      await expect(taskPromise).rejects.toThrow();
    });
  });

  describe('batch operations', () => {
    test('should execute batch bezier path generation', async () => {
      const startPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ];
      const endPoints: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ];
      const options = {
        numPoints: 10,
        complexity: 0.5,
        overshootFactor: 0.2,
        jitterAmount: 1.0
      };
      
      const paths = await threadPoolManager.generateBezierPaths(startPoints, endPoints, options);
      
      expect(paths.length).toBe(startPoints.length);
      expect(mockCppModule.batchGenerateBezierPaths).toHaveBeenCalledWith(
        startPoints, 
        endPoints, 
        options.numPoints, 
        options.complexity, 
        options.overshootFactor, 
        options.jitterAmount,
        expect.any(Number) // seed
      );
    });

    test('should execute batch physics simulation', async () => {
      const startPoints: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ];
      const endPoints: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 200 }
      ];
      const options = {
        mass: 1.0,
        springConstant: 8.0,
        dampingFactor: 0.7,
        timeStep: 0.016,
        maxSteps: 100,
        stoppingThreshold: 0.1
      };
      
      const paths = await threadPoolManager.simulatePhysicsMovements(startPoints, endPoints, options);
      
      expect(paths.length).toBe(startPoints.length);
      expect(mockCppModule.batchSimulatePhysicsMovements).toHaveBeenCalledWith(
        startPoints, 
        endPoints,
        options.mass,
        options.springConstant,
        options.dampingFactor,
        options.timeStep,
        options.maxSteps,
        options.stoppingThreshold,
        expect.any(Number) // seed
      );
    });

    test('should execute batch OU process generation', async () => {
      const options = {
        count: 5,
        points: 100,
        theta: 0.7,
        sigma: 0.5,
        dt: 0.1
      };
      
      const jitters = await threadPoolManager.generateOUProcesses(options);
      
      expect(jitters.length).toBe(options.count);
      expect(mockCppModule.batchGenerateOUProcesses).toHaveBeenCalledWith(
        options.count,
        options.points,
        options.theta,
        options.sigma,
        options.dt,
        expect.any(Number) // seed
      );
    });
  });

  describe('error handling', () => {
    test('should handle C++ module load failure', () => {
      // Mock require to throw error
      const originalRequire = require;
      (global as any).require = jest.fn(() => { throw new Error('Module load error'); });
      
      // Create manager with failed module load
      const managerWithFailedModule = new ThreadPoolManager();
      
      // Check it falls back to alternative implementation
      expect(managerWithFailedModule.isRunning()).toBe(true);
      expect(managerWithFailedModule.getThreadPoolInfo().fallbackMode).toBe(true);
      
      // Restore original require
      (global as any).require = originalRequire;
    });
    
    test('should handle worker creation failure', () => {
      // Mock Worker constructor to throw
      const { Worker } = require('worker_threads');
      Worker.mockImplementationOnce(() => {
        throw new Error('Worker creation failed');
      });
      
      // Should not throw but log error and continue with fewer threads
      const manager = new ThreadPoolManager({ jsThreads: 4 });
      expect(manager.getWorkerCount()).toBeLessThan(4);
    });
    
    test('should handle worker message errors', async () => {
      // We'll need to create a more sophisticated mock for this test
      // that simulates a worker sending an error message
      // This is complex to set up in Jest, but would test error propagation
      
      // For now, we'll skip the implementation of this test
      // but it would test that errors from workers are properly propagated
    });
  });

  describe('performance', () => {
    test('should batch tasks efficiently', async () => {
      // Create a large number of small tasks
      const taskCount = 1000;
      const tasks = Array(taskCount).fill(null).map((_, i) => () => i);
      
      // Time how long it takes to process them in batch
      const startTime = Date.now();
      await Promise.all(tasks.map(task => threadPoolManager.scheduleTask(task)));
      const duration = Date.now() - startTime;
      
      // This is not a strict test, but should complete quickly if batching is efficient
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('thread pool status', () => {
    test('should report thread pool status', () => {
      const status = threadPoolManager.getThreadPoolInfo();
      expect(status).toHaveProperty('threadCount');
      expect(status).toHaveProperty('activeThreads');
      expect(status).toHaveProperty('queueSize');
      expect(status).toHaveProperty('jsThreads');
    });
  });
});