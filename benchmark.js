/**
 * Direct benchmark of C++ vs JavaScript performance
 */

// Load the native module directly 
let nativeModule;
try {
  nativeModule = require('./build/Release/mouse_math.node');
  console.log(`C++ module available, SIMD: ${nativeModule.isSIMDAvailable()}, Version: ${nativeModule.version}`);
} catch (err) {
  console.error('Failed to load native module:', err);
  process.exit(1);
}

// Define benchmarking function
function benchmark(name, fn, iterations = 1000) {
  // Warmup
  for (let i = 0; i < 10; i++) {
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
  const maxTime = Math.max(...times);
  
  console.log(`${name}:`);
  console.log(`  Average time: ${avgTime.toFixed(3)} ms`);
  console.log(`  Min time: ${minTime.toFixed(3)} ms`);
  console.log(`  Max time: ${maxTime.toFixed(3)} ms`);
  console.log(`  Total time: ${totalTime} ms`);
  
  return { name, avgTime, minTime, maxTime, totalTime };
}

// Test data
const p0 = { x: 0, y: 0 };
const p1 = { x: 33, y: 50 };
const p2 = { x: 66, y: 50 };
const p3 = { x: 100, y: 100 };

// JavaScript implementation for comparison
function generateBezierCurveJS(p0, p1, p2, p3, numPoints) {
  const path = [];
  
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
    
    path.push({ x, y });
  }
  
  return path;
}

function generateOrnsteinUhlenbeckProcessJS(points, theta, sigma, dt) {
  const jitterX = Array(points).fill(0);
  const jitterY = Array(points).fill(0);
  
  // Start with zero jitter
  jitterX[0] = 0;
  jitterY[0] = 0;
  
  // Generate the process
  for (let i = 1; i < points; i++) {
    // Update jitter using Ornstein-Uhlenbeck process
    const sqrtDt = Math.sqrt(dt);
    
    // Generate Gaussian random numbers using Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    
    // Update jitter values with mean reversion to zero
    jitterX[i] = jitterX[i-1] * (1 - theta * dt) + sigma * sqrtDt * z1;
    jitterY[i] = jitterY[i-1] * (1 - theta * dt) + sigma * sqrtDt * z2;
  }
  
  return { jitterX, jitterY };
}

// Run benchmarks
const iterations = 10000; // More iterations for more accurate results

console.log('======= BEZIER CURVE BENCHMARKS =======');
const smallBezierCppResult = benchmark('C++ Bezier (small)', () => {
  nativeModule.generateBezierCurve(p0, p1, p2, p3, 50);
}, iterations);

const smallBezierJsResult = benchmark('JS Bezier (small)', () => {
  generateBezierCurveJS(p0, p1, p2, p3, 50);
}, iterations);

const largeBezierCppResult = benchmark('C++ Bezier (large)', () => {
  nativeModule.generateBezierCurve(p0, p1, p2, p3, 500);
}, 1000);

const largeBezierJsResult = benchmark('JS Bezier (large)', () => {
  generateBezierCurveJS(p0, p1, p2, p3, 500);
}, 1000);

console.log('\n======= ORNSTEIN-UHLENBECK BENCHMARKS =======');
const ouCppResult = benchmark('C++ OU Process', () => {
  nativeModule.generateOrnsteinUhlenbeckProcess(100, 0.7, 0.5, 0.1);
}, iterations);

const ouJsResult = benchmark('JS OU Process', () => {
  generateOrnsteinUhlenbeckProcessJS(100, 0.7, 0.5, 0.1);
}, iterations);

// Calculate speedups
console.log('\n======= PERFORMANCE COMPARISON =======');
console.log(`Small Bezier Speedup: ${(smallBezierJsResult.avgTime / smallBezierCppResult.avgTime).toFixed(2)}x`);
console.log(`Large Bezier Speedup: ${(largeBezierJsResult.avgTime / largeBezierCppResult.avgTime).toFixed(2)}x`);
console.log(`OU Process Speedup: ${(ouJsResult.avgTime / ouCppResult.avgTime).toFixed(2)}x`);