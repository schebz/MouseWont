/**
 * Simple Thread Pool Demo
 * 
 * This file demonstrates the core thread pool functionality with a simple JavaScript file
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const path = require('path');

// Main thread code
if (isMainThread) {
  // Create a simple thread pool
  class SimpleThreadPool {
    constructor(numThreads = os.cpus().length) {
      this.numThreads = numThreads;
      this.workers = [];
      this.nextTaskId = 0;
      this.taskQueue = new Map();
      
      // Create worker threads
      for (let i = 0; i < numThreads; i++) {
        this.createWorker(i);
      }
      
      console.log(`Created thread pool with ${numThreads} workers`);
    }
    
    createWorker(id) {
      // Run this same file as a worker
      const worker = new Worker(__filename, { workerData: { id } });
      
      worker.on('message', message => {
        const { id, result, error } = message;
        
        const task = this.taskQueue.get(id);
        if (task) {
          this.taskQueue.delete(id);
          if (error) {
            task.reject(error);
          } else {
            task.resolve(result);
          }
        }
      });
      
      worker.on('error', error => {
        console.error(`Worker ${id} error:`, error);
        
        // Try to recreate the worker
        setTimeout(() => {
          this.createWorker(id);
        }, 1000);
      });
      
      this.workers.push(worker);
    }
    
    scheduleTask(fn, ...args) {
      return new Promise((resolve, reject) => {
        const taskId = this.nextTaskId++;
        this.taskQueue.set(taskId, { resolve, reject });
        
        // Simple round-robin worker selection
        const workerId = taskId % this.workers.length;
        const worker = this.workers[workerId];
        
        // Send the task to the worker
        worker.postMessage({
          id: taskId,
          fn: fn.toString(),
          args
        });
      });
    }
    
    async shutdown() {
      // Terminate all workers
      for (const worker of this.workers) {
        await worker.terminate();
      }
      this.workers = [];
      console.log('Thread pool shut down');
    }
  }
  
  // Create a thread pool
  const threadPool = new SimpleThreadPool(4);
  
  // Simple Fibonacci calculation (intentionally inefficient for demo)
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  
  // Run sequential and parallel tests
  async function runTests() {
    console.log('Running tests...');
    
    // Sequential calculation
    console.time('Sequential');
    const seqResults = [];
    for (let i = 30; i <= 35; i++) {
      seqResults.push(fibonacci(i));
    }
    console.timeEnd('Sequential');
    console.log('Sequential results:', seqResults);
    
    // Parallel calculation
    console.time('Parallel');
    const tasks = [];
    for (let i = 30; i <= 35; i++) {
      // Use Function constructor to create a function from string at runtime
      const fibFn = new Function('n', `
        function fib(n) {
          if (n <= 1) return n;
          return fib(n - 1) + fib(n - 2);
        }
        return fib(n);
      `);
      
      tasks.push(threadPool.scheduleTask(fibFn, i));
    }
    
    try {
      const parallelResults = await Promise.all(tasks);
      console.timeEnd('Parallel');
      console.log('Parallel results:', parallelResults);
    } catch (error) {
      console.error('Parallel calculation failed:', error);
    }
    
    // Shutdown the thread pool
    await threadPool.shutdown();
  }
  
  // Run the tests
  runTests().catch(console.error);
}
// Worker thread code
else {
  const workerId = workerData.id;
  console.log(`Worker ${workerId} started`);
  
  // Handle messages from the main thread
  parentPort.on('message', message => {
    const { id, fn, args } = message;
    
    try {
      // Create a function from the string representation
      const func = new Function('return ' + fn)();
      
      // Execute the function with the provided arguments
      const result = func(...args);
      
      // Send the result back to the main thread
      parentPort.postMessage({ id, result });
    } catch (error) {
      // Send the error back to the main thread
      parentPort.postMessage({ 
        id, 
        error: { 
          message: error.message,
          stack: error.stack,
          name: error.name
        } 
      });
    }
  });
}