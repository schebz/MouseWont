/**
 * @file math-performance.ts
 * @version 0.1.0
 * @lastModified 2025-11-06
 * @changelog Performance benchmark for mathematical operations
 */

import { performance } from 'perf_hooks';
import { MathModuleFactory, MathModuleType } from '../core/MathModuleBridge';
import { Point } from '../core/types';

interface BenchmarkResult {
  operation: string;
  implementation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  samples: number;
}

/**
 * Run a benchmark for the specified math module implementation
 * @param moduleType Implementation type to benchmark
 * @param iterations Number of iterations for each test
 */
async function benchmarkMathModule(
  moduleType: MathModuleType,
  iterations: number = 1000,
): Promise<BenchmarkResult[]> {
  console.log(`Benchmarking ${moduleType} implementation with ${iterations} iterations...`);
  const mathModule = await MathModuleFactory.getModule(moduleType);
  
  const testCases = [
    {
      name: 'Bézier Curve (small)',
      fn: async () => {
        await mathModule.generateBezierCurve(
          { x: 0, y: 0 },
          { x: 33, y: 50 },
          { x: 66, y: 50 },
          { x: 100, y: 100 },
          50
        );
      }
    },
    {
      name: 'Bézier Curve (large)',
      fn: async () => {
        await mathModule.generateBezierCurve(
          { x: 0, y: 0 },
          { x: 33, y: 50 },
          { x: 66, y: 50 },
          { x: 100, y: 100 },
          500
        );
      }
    },
    {
      name: 'Minimum Jerk Trajectory',
      fn: async () => {
        await mathModule.generateMinimumJerkTrajectory(
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          100
        );
      }
    },
    {
      name: 'Ornstein-Uhlenbeck Process',
      fn: async () => {
        await mathModule.generateOrnsteinUhlenbeckProcess(100, 0.7, 0.5, 0.1);
      }
    },
    {
      name: 'Physics Simulation',
      fn: async () => {
        await mathModule.simulatePhysicsMovement(
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          {
            mass: 1.0,
            springConstant: 8.0,
            dampingFactor: 0.7,
            timeStep: 0.016,
            maxSteps: 200,
            stoppingThreshold: 0.1
          }
        );
      }
    },
    {
      name: 'Velocity Profile',
      fn: async () => {
        // Create a simple path
        const path: Point[] = [];
        for (let i = 0; i < 100; i++) {
          path.push({ x: i, y: i });
        }
        
        await mathModule.applyVelocityProfile(path, 'minimum_jerk', 100);
      }
    }
  ];
  
  const results: BenchmarkResult[] = [];
  
  for (const testCase of testCases) {
    console.log(`Running ${testCase.name}...`);
    
    // Warmup
    for (let i = 0; i < 10; i++) {
      await testCase.fn();
    }
    
    // Actual benchmark
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await testCase.fn();
      const end = performance.now();
      times.push(end - start);
    }
    
    // Calculate statistics
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    results.push({
      operation: testCase.name,
      implementation: moduleType,
      averageTime,
      minTime,
      maxTime,
      samples: times.length
    });
  }
  
  return results;
}

/**
 * Compare the performance of different math module implementations
 */
async function compareMathModules() {
  console.log('Starting math module performance comparison');
  
  // Check which implementations are available
  const typescriptAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.TYPESCRIPT);
  const cppAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.CPP);
  const pythonAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.PYTHON);
  const fortranAvailable = await MathModuleFactory.isModuleAvailable(MathModuleType.FORTRAN);
  
  console.log('Available implementations:');
  console.log(`- TypeScript: ${typescriptAvailable ? 'Yes' : 'No'}`);
  console.log(`- C++: ${cppAvailable ? 'Yes' : 'No'}`);
  console.log(`- Python: ${pythonAvailable ? 'Yes' : 'No'}`);
  console.log(`- Fortran: ${fortranAvailable ? 'Yes' : 'No'}`);
  
  // Run benchmarks for available implementations
  const iterations = 50; // Use a smaller number for quicker benchmarks
  const results: BenchmarkResult[] = [];
  
  if (typescriptAvailable) {
    results.push(...await benchmarkMathModule(MathModuleType.TYPESCRIPT, iterations));
  }
  
  if (cppAvailable) {
    results.push(...await benchmarkMathModule(MathModuleType.CPP, iterations));
  }
  
  if (pythonAvailable) {
    results.push(...await benchmarkMathModule(MathModuleType.PYTHON, iterations));
  }
  
  if (fortranAvailable) {
    results.push(...await benchmarkMathModule(MathModuleType.FORTRAN, iterations));
  }
  
  // Output results as a table
  console.log('\nPerformance Comparison:');
  console.log('==============================================');
  console.log('Operation | Implementation | Avg. Time (ms) | Min Time (ms) | Max Time (ms)');
  console.log('----------------------------------------------');
  
  for (const result of results) {
    console.log(
      `${result.operation.padEnd(20)} | ${result.implementation.padEnd(14)} | ` +
      `${result.averageTime.toFixed(3).padStart(13)} | ${result.minTime.toFixed(3).padStart(12)} | ` +
      `${result.maxTime.toFixed(3).padStart(12)}`
    );
  }
  
  console.log('==============================================');
  
  // Calculate speedup factors
  if (typescriptAvailable && cppAvailable) {
    console.log('\nSpeedup Factors (C++ vs TypeScript):');
    console.log('==============================================');
    console.log('Operation | Speedup Factor');
    console.log('----------------------------------------------');
    
    const operations = [...new Set(results.map(r => r.operation))];
    
    for (const operation of operations) {
      const tsResult = results.find(r => r.operation === operation && r.implementation === MathModuleType.TYPESCRIPT);
      const cppResult = results.find(r => r.operation === operation && r.implementation === MathModuleType.CPP);
      
      if (tsResult && cppResult) {
        const speedupFactor = tsResult.averageTime / cppResult.averageTime;
        console.log(`${operation.padEnd(20)} | ${speedupFactor.toFixed(2)}x`);
      }
    }
    
    console.log('==============================================');
  }
}

// Run the benchmark if this file is executed directly
if (require.main === module) {
  compareMathModules().catch(console.error);
}

export { benchmarkMathModule, compareMathModules };