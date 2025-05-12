// Declaration file for external modules that don't have types

// WASM module declaration for the C++ math implementation
declare module '../../../build/mouse_math_wasm.js' {
  interface CppMathWasmModule {
    init(): Promise<void>;
    
    // Core mathematical operations
    generateBezierCurve(p0x: number, p0y: number, p1x: number, p1y: number, 
                        p2x: number, p2y: number, p3x: number, p3y: number, 
                        numPoints: number): Float64Array;
    generateBezierPath(startX: number, startY: number, endX: number, endY: number,
                      complexity: number, overshootFactor: number, jitterAmount: number, 
                      numPoints: number, seed?: number): Float64Array;
    generateMinimumJerkTrajectory(startX: number, startY: number, endX: number, endY: number, 
                                 numPoints: number): Float64Array;
    generateOrnsteinUhlenbeckProcess(points: number, theta: number, sigma: number, dt: number, seed?: number): {
      jitterX: Float64Array;
      jitterY: Float64Array;
    };
    simulatePhysicsMovement(startX: number, startY: number, endX: number, endY: number, 
                           mass: number, springConstant: number, dampingFactor: number,
                           timeStep: number, maxSteps: number, stoppingThreshold: number, seed?: number): Float64Array;
    applyVelocityProfile(pathBuffer: Float64Array, velocityProfile: string, numPoints: number): Float64Array;
    
    // Module information and status
    isAvailable(): boolean;
    isSIMDAvailable(): boolean;
    version: string;
  }

  const module: CppMathWasmModule;
  export default module;
}

// Declare missing properties on Window for tests
interface Window {
  eventStats?: {
    count?: number;
    naturalEvents?: number;
    syntheticEvents?: number;
    trustedEvents?: number;
    untrustedEvents?: number;
    total?: number;
    trusted?: number;
    untrusted?: number;
  };
}