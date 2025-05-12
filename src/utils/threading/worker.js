/**
 * Worker thread implementation for ThreadPoolManager
 * 
 * This file runs in a worker thread and executes tasks sent from the main thread.
 * It handles task execution, error handling, and result reporting.
 */

const { parentPort, workerData } = require('worker_threads');

// Initialize worker
const workerId = workerData?.id ?? 0;
console.log(`Worker ${workerId} started`);

// Track active tasks for potential cleanup
const activeTasks = new Map();

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  try {
    if (message.type !== 'task' || typeof message.id !== 'number') {
      console.warn(`Worker ${workerId} received invalid message:`, message);
      return;
    }
    
    const { id, functionData, args } = message;
    
    // Track this task
    activeTasks.set(id, { startTime: Date.now() });
    
    try {
      // Recover function from string representation
      const taskFunction = evaluateFunction(functionData);
      
      // Execute the function
      const result = await taskFunction(...args);
      
      // Send result back to main thread
      parentPort.postMessage({
        id,
        type: 'result',
        result
      });
    } catch (error) {
      // Send error back to main thread
      parentPort.postMessage({
        id,
        type: 'result',
        error: serializeError(error)
      });
    } finally {
      // Remove from active tasks
      activeTasks.delete(id);
    }
  } catch (error) {
    console.error(`Worker ${workerId} error processing message:`, error);
    
    try {
      // If we can identify the task ID, send error back
      if (message && typeof message.id === 'number') {
        parentPort.postMessage({
          id: message.id,
          type: 'result',
          error: serializeError(error)
        });
        
        // Clean up task tracking
        activeTasks.delete(message.id);
      }
    } catch (reportError) {
      console.error(`Worker ${workerId} failed to report error:`, reportError);
    }
  }
});

/**
 * Safely convert a function string back to a function
 * Uses Function constructor with safety checks
 */
function evaluateFunction(functionString) {
  if (!functionString || typeof functionString !== 'string') {
    throw new Error('Invalid function data');
  }
  
  try {
    // Check if it's an arrow function or regular function
    if (functionString.includes('=>')) {
      // Handle arrow function
      const arrowMatch = functionString.match(/^\s*(?:\(([^)]*)\)|([^=]*?))\s*=>\s*(.*)$/s);
      if (!arrowMatch) {
        throw new Error('Invalid arrow function format');
      }
      
      const params = arrowMatch[1] || arrowMatch[2] || '';
      let body = arrowMatch[3] || '';
      
      // If body doesn't have curly braces, add return statement
      if (!body.trim().startsWith('{')) {
        body = `return ${body}`;
      } else {
        // Body already has curly braces
        body = body.trim().substring(1, body.trim().length - 1);
      }
      
      return new Function(...params.split(',').map(p => p.trim()), body);
    } else {
      // Handle regular function
      const funcMatch = functionString.match(/function\s*(?:\w*)\s*\(([^)]*)\)\s*\{([\s\S]*)\}/);
      if (!funcMatch) {
        // Try async function
        const asyncFuncMatch = functionString.match(/async\s+function\s*(?:\w*)\s*\(([^)]*)\)\s*\{([\s\S]*)\}/);
        if (!asyncFuncMatch) {
          throw new Error('Invalid function format');
        }
        
        const params = asyncFuncMatch[1] || '';
        const body = asyncFuncMatch[2] || '';
        
        // Create an async function
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        return new AsyncFunction(...params.split(',').map(p => p.trim()), body);
      }
      
      const params = funcMatch[1] || '';
      const body = funcMatch[2] || '';
      
      return new Function(...params.split(',').map(p => p.trim()), body);
    }
  } catch (error) {
    throw new Error(`Failed to evaluate function: ${error.message}`);
  }
}

/**
 * Serialize an error for sending across threads
 */
function serializeError(error) {
  if (!error) {
    return 'Unknown error';
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // For Error objects, extract useful properties
  return {
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    stack: error.stack,
    code: error.code
  };
}

// Report worker status to the main thread
parentPort.postMessage({
  type: 'status',
  id: -1,
  status: 'ready',
  workerId
});

// Handle cleanup on exit
process.on('exit', () => {
  console.log(`Worker ${workerId} exiting`);
  
  // Clean up any resources if needed
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`Worker ${workerId} uncaught exception:`, error);
  
  // Report error to main thread
  parentPort.postMessage({
    type: 'error',
    id: -1,
    error: serializeError(error)
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error(`Worker ${workerId} unhandled rejection:`, reason);
  
  // Report error to main thread
  parentPort.postMessage({
    type: 'error',
    id: -1,
    error: serializeError(reason)
  });
});