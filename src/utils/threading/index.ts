/**
 * @file Threading utilities index
 * Exports thread pool and parallel processing utilities
 */

export { ThreadPoolManager } from './ThreadPoolManager';

// Export a singleton instance for easy use
import { ThreadPoolManager } from './ThreadPoolManager';

/**
 * Global thread pool instance for shared use across the application
 * This avoids creating multiple thread pools when not needed.
 */
export const globalThreadPool = new ThreadPoolManager();

/**
 * Clean up global thread pool on process exit
 */
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    globalThreadPool.shutdown().catch(console.error);
  });
  
  // Handle SIGINT, SIGTERM
  process.on('SIGINT', () => {
    console.log('Shutting down thread pool...');
    globalThreadPool.shutdown().catch(console.error)
      .finally(() => process.exit(0));
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down thread pool...');
    globalThreadPool.shutdown().catch(console.error)
      .finally(() => process.exit(0));
  });
}

/**
 * Utility function to run a function in parallel on an array of inputs
 * @param fn Function to execute on each item
 * @param items Array of items to process
 * @returns Array of results
 */
export async function parallelMap<T, R>(fn: (item: T) => Promise<R> | R, items: T[]): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }
  
  // Create tasks for each item
  const tasks = items.map(item => () => fn(item));
  
  // Execute tasks in parallel
  return Promise.all(tasks.map(task => globalThreadPool.scheduleTask(task)));
}

/**
 * Process chunks of data in parallel
 * @param items Array of items to process
 * @param fn Function to execute on each chunk
 * @param chunkSize Size of each chunk
 * @returns Combined results
 */
export async function parallelChunk<T, R>(
  items: T[],
  fn: (chunk: T[]) => Promise<R[]>,
  chunkSize = 100
): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }
  
  // Create chunks
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  
  // Process chunks in parallel
  const results = await parallelMap(fn, chunks);
  
  // Flatten results
  return results.flat();
}