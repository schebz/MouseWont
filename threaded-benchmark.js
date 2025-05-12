/**
 * Threaded batch operations benchmark
 * 
 * This script tests the performance improvements from batching operations and using
 * multi-threading in the C++ implementation.
 */

// Load the native module directly 
let nativeModule;
try {
  nativeModule = require('./build/Release/mouse_math.node');
  console.log(`C++ module available, SIMD: ${nativeModule.isSIMDAvailable()}, Version: ${nativeModule.version}`);
  console.log(`Thread pool: ${JSON.stringify(nativeModule.getThreadPoolInfo())}`);
} catch (err) {
  console.error('Failed to load native module:', err);
  process.exit(1);
}

// Define benchmarking function
function benchmark(name, fn, iterations = 1000) {
  // Warmup
  for (let i = 0; i < 5; i++) {
    fn();
  }
  
  console.log(`Running ${name} benchmark (${iterations} iterations)...`);
  
  // Run benchmark
  const times = [];
  const start = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const iterStart = process.hrtime.bigint();
    fn();
    const iterEnd = process.hrtime.bigint();
    times.push(Number(iterEnd - iterStart) / 1000000); // Convert to ms
  }
  
  const totalTime = Date.now() - start;
  
  // Calculate statistics
  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.min(...times);
  
  console.log(`${name}:`);
  console.log(`  Average time: ${avgTime.toFixed(3)} ms`);
  console.log(`  Min time: ${minTime.toFixed(3)} ms`);
  console.log(`  Max time: ${maxTime.toFixed(3)} ms`);
  console.log(`  Total time: ${totalTime} ms`);

  return { name, avgTime, minTime, maxTime, totalTime, iterations };
}

// Generate test data for single vs batch operations
function generateTestPoints(count) {
  const startPoints = [];
  const endPoints = [];
  
  for (let i = 0; i < count; i++) {
    startPoints.push({ x: Math.random() * 100, y: Math.random() * 100 });
    endPoints.push({ x: Math.random() * 1000, y: Math.random() * 1000 });
  }
  
  return { startPoints, endPoints };
}

// Test individual vs batch operation
console.log('======= INDIVIDUAL VS BATCH OPERATIONS =======');

// Parameters
const batchSize = 1000; // Large batch size for better parallelism
const numPoints = 100;
const iterations = 10; // Increased iterations for better measurements

// Generate test data
const { startPoints, endPoints } = generateTestPoints(batchSize);

// Test individual Bezier path generation (sequential)
const sequentialBezierResult = benchmark('Individual Bezier Paths (Sequential)', () => {
  const results = [];
  for (let i = 0; i < batchSize; i++) {
    const result = nativeModule.generateBezierPath(
      startPoints[i], 
      endPoints[i], 
      0.5, // complexity
      0.2, // overshootFactor
      1.0, // jitterAmount
      numPoints
    );
    results.push(result);
  }
  return results;
}, iterations);

// Test batch Bezier path generation (parallel)
const batchBezierResult = benchmark('Batch Bezier Paths (Parallel)', () => {
  return nativeModule.batchGenerateBezierPaths(
    startPoints,
    endPoints,
    numPoints,
    0.5, // complexity
    0.2, // overshootFactor
    1.0  // jitterAmount
  );
}, iterations);

// Test individual physics simulations (sequential)
const sequentialPhysicsResult = benchmark('Individual Physics Sims (Sequential)', () => {
  const results = [];
  for (let i = 0; i < batchSize; i++) {
    const result = nativeModule.simulatePhysicsMovement(
      startPoints[i],
      endPoints[i],
      {
        mass: 1.0,
        springConstant: 8.0,
        dampingFactor: 0.7,
        timeStep: 0.016,
        maxSteps: 100,
        stoppingThreshold: 0.1
      }
    );
    results.push(result);
  }
  return results;
}, iterations);

// Test batch physics simulations (parallel)
const batchPhysicsResult = benchmark('Batch Physics Sims (Parallel)', () => {
  return nativeModule.batchSimulatePhysicsMovements(
    startPoints,
    endPoints,
    1.0, // mass
    8.0, // springConstant
    0.7, // dampingFactor
    0.016, // timeStep
    100, // maxSteps
    0.1 // stoppingThreshold
  );
}, iterations);

// Test individual OU process generation (sequential)
const sequentialOUResult = benchmark('Individual OU Processes (Sequential)', () => {
  const results = [];
  for (let i = 0; i < batchSize; i++) {
    const result = nativeModule.generateOrnsteinUhlenbeckProcess(100, 0.7, 0.5, 0.1);
    results.push(result);
  }
  return results;
}, iterations);

// Test batch OU process generation (parallel)
const batchOUResult = benchmark('Batch OU Processes (Parallel)', () => {
  return nativeModule.batchGenerateOUProcesses(batchSize, 100, 0.7, 0.5, 0.1);
}, iterations);

// Calculate speedups
console.log('\n======= PERFORMANCE COMPARISON =======');

const bezierSpeedup = sequentialBezierResult.avgTime / batchBezierResult.avgTime;
const physicsSpeedup = sequentialPhysicsResult.avgTime / batchPhysicsResult.avgTime;
const ouSpeedup = sequentialOUResult.avgTime / batchOUResult.avgTime;

console.log(`Bezier Paths Speedup: ${bezierSpeedup.toFixed(2)}x (${sequentialBezierResult.avgTime.toFixed(2)} ms vs ${batchBezierResult.avgTime.toFixed(2)} ms)`);
console.log(`Physics Sim Speedup: ${physicsSpeedup.toFixed(2)}x (${sequentialPhysicsResult.avgTime.toFixed(2)} ms vs ${batchPhysicsResult.avgTime.toFixed(2)} ms)`);
console.log(`OU Process Speedup: ${ouSpeedup.toFixed(2)}x (${sequentialOUResult.avgTime.toFixed(2)} ms vs ${batchOUResult.avgTime.toFixed(2)} ms)`);

// Display hardware info
const threadPoolInfo = nativeModule.getThreadPoolInfo();
console.log(`\nHardware info: ${threadPoolInfo.threadCount} threads available`);

// Create summary file with performance results
const fs = require('fs');
fs.writeFileSync('thread_performance_results.json', JSON.stringify({
  hardware: {
    threadCount: threadPoolInfo.threadCount,
    date: new Date().toISOString(),
  },
  testParameters: {
    batchSize,
    numPoints,
    iterations
  },
  results: {
    bezier: {
      sequential: sequentialBezierResult,
      batch: batchBezierResult,
      speedup: bezierSpeedup
    },
    physics: {
      sequential: sequentialPhysicsResult,
      batch: batchPhysicsResult,
      speedup: physicsSpeedup
    },
    ou: {
      sequential: sequentialOUResult,
      batch: batchOUResult,
      speedup: ouSpeedup
    }
  }
}, null, 2));