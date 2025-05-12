/**
 * Example demonstrating the symbolic math extraction system
 * 
 * This file shows how to use the SymbolicExtractor to extract
 * mathematical expressions from code and validate them.
 */

import { globalSymbolicExtractor, ExpressionType } from '../utils/symbolic/SymbolicExtractor';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Function with a symbolic math annotation for the Bézier curve formula
 * 
 * @param t Normalized time parameter [0,1]
 * @param p0 Start point
 * @param p1 First control point
 * @param p2 Second control point
 * @param p3 End point
 * @returns Point on the Bézier curve
 */
function evaluateBezier(
  t: number, 
  p0: {x: number, y: number}, 
  p1: {x: number, y: number}, 
  p2: {x: number, y: number}, 
  p3: {x: number, y: number}
): {x: number, y: number} {
  /* @symbolic: 
    type="bezier_curve", 
    latex="\\mathbf{B}(t) = (1-t)^3\\mathbf{P}_0 + 3(1-t)^2t\\mathbf{P}_1 + 3(1-t)t^2\\mathbf{P}_2 + t^3\\mathbf{P}_3",
    description="Cubic Bézier curve evaluation",
    parameters={"t": "Normalized time parameter [0,1]", "P_0": "Start point", "P_1": "First control point", "P_2": "Second control point", "P_3": "End point"}
  */
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

/**
 * Function with a symbolic math annotation for minimum-jerk trajectory
 * 
 * @param tau Normalized time parameter [0,1]
 * @param x0 Start position
 * @param x1 End position
 * @returns Position at normalized time tau
 */
function minimumJerkPosition(tau: number, x0: number, x1: number): number {
  /* @symbolic: 
    type="minimum_jerk", 
    latex="x(\\tau) = x_0 + (x_1 - x_0)(10\\tau^3 - 15\\tau^4 + 6\\tau^5)",
    description="Minimum-jerk trajectory in one dimension",
    parameters={"tau": "Normalized time parameter [0,1]", "x_0": "Start position", "x_1": "End position"}
  */
  return x0 + (x1 - x0) * (10 * Math.pow(tau, 3) - 15 * Math.pow(tau, 4) + 6 * Math.pow(tau, 5));
}

/**
 * Function with a symbolic math annotation for Ornstein-Uhlenbeck process
 * 
 * @param prevValue Previous state value
 * @param theta Mean reversion rate
 * @param mu Mean reversion level
 * @param sigma Volatility
 * @param dt Time step
 * @param random Random number generator function
 * @returns Next state value
 */
function ornsteinUhlenbeckStep(
  prevValue: number,
  theta: number,
  mu: number,
  sigma: number,
  dt: number,
  random: () => number
): number {
  /* @symbolic: 
    type="ou_process", 
    latex="X_{t+\\Delta t} = X_t + \\theta(\\mu - X_t)\\Delta t + \\sigma\\sqrt{\\Delta t}Z",
    description="Discrete approximation of Ornstein-Uhlenbeck process",
    parameters={"X_t": "Current state", "theta": "Mean reversion rate", "mu": "Mean reversion level", "sigma": "Volatility", "Delta t": "Time step", "Z": "Standard normal random variable"}
  */
  const drift = theta * (mu - prevValue) * dt;
  const randomNormal = Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
  const diffusion = sigma * Math.sqrt(dt) * randomNormal;
  
  return prevValue + drift + diffusion;
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('Symbolic Math Extraction Example');
  console.log('--------------------------------');
  
  // Extract symbols from this file
  const sourceCode = fs.readFileSync(__filename, 'utf-8');
  const expressions = globalSymbolicExtractor.extractFromSource(sourceCode, __filename);
  
  console.log(`Extracted ${expressions.length} mathematical expressions from code:`);
  expressions.forEach((expr, i) => {
    console.log(`\n${i+1}. ${expr.description}`);
    console.log(`Type: ${expr.type}`);
    console.log(`LaTeX: ${expr.latex}`);
    console.log(`Source: ${expr.source.file}:${expr.source.line}`);
  });
  
  // Export to LaTeX
  const latex = globalSymbolicExtractor.exportToLatex();
  const outputDir = path.join(__dirname, '../../output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save LaTeX document
  const latexPath = path.join(outputDir, 'symbolic_mathematics.tex');
  fs.writeFileSync(latexPath, latex);
  console.log(`\nExported LaTeX document to ${latexPath}`);
  
  // Demonstrate validation
  const bezierExpr = expressions.find(e => e.type === ExpressionType.BEZIER_CURVE);
  if (bezierExpr) {
    console.log('\nValidating Bézier curve implementation:');
    
    // Define test cases
    const testInputs = [
      { t: 0, p0: {x: 0, y: 0}, p1: {x: 33, y: 33}, p2: {x: 66, y: 66}, p3: {x: 100, y: 100} },
      { t: 0.5, p0: {x: 0, y: 0}, p1: {x: 33, y: 33}, p2: {x: 66, y: 66}, p3: {x: 100, y: 100} },
      { t: 1, p0: {x: 0, y: 0}, p1: {x: 33, y: 33}, p2: {x: 66, y: 66}, p3: {x: 100, y: 100} }
    ];
    
    // Calculate expected results
    const expectedResults = [
      { x: 0, y: 0 },         // t = 0 should yield p0
      { x: 50, y: 50 },       // t = 0.5 should yield midpoint for this symmetrical case
      { x: 100, y: 100 }      // t = 1 should yield p3
    ];
    
    // Manual validation for demonstration
    testInputs.forEach((input, i) => {
      const result = evaluateBezier(input.t, input.p0, input.p1, input.p2, input.p3);
      const expected = expectedResults[i];
      
      const isValid = Math.abs(result.x - expected.x) < 0.001 && 
                      Math.abs(result.y - expected.y) < 0.001;
      
      console.log(`Test #${i+1} (t=${input.t}): ${isValid ? 'PASS' : 'FAIL'}`);
      console.log(`  Expected: (${expected.x}, ${expected.y})`);
      console.log(`  Actual:   (${result.x}, ${result.y})`);
    });
  }
}

// Run the demonstration if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };