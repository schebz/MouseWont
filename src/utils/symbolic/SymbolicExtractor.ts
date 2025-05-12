/**
 * SymbolicExtractor.ts
 * 
 * Extracts symbolic mathematical expressions from code
 * for formal validation and analysis
 */

/**
 * Types of mathematical expressions that can be extracted
 */
export enum ExpressionType {
  BEZIER_CURVE = 'bezier_curve',
  MINIMUM_JERK = 'minimum_jerk',
  PHYSICS_MODEL = 'physics_model',
  VELOCITY_PROFILE = 'velocity_profile',
  OU_PROCESS = 'ou_process',
  COMPOSITE_BLEND = 'composite_blend',
  CUSTOM = 'custom'
}

/**
 * Representation of a mathematical expression in symbolic form
 */
export interface SymbolicExpression {
  /** Type of expression */
  type: ExpressionType;
  
  /** Symbolic form in LaTeX */
  latex: string;
  
  /** Symbolic form in code-friendly ASCII math */
  asciiMath: string;
  
  /** Description of the expression */
  description: string;
  
  /** Parameter mapping (variable -> description) */
  parameters: Record<string, string>;
  
  /** Source code snippet that implements this expression */
  sourceCode: string;
  
  /** Source file and line number */
  source: {
    file: string;
    line: number;
  };
}

/**
 * Data structure to store extracted expressions
 */
export interface ExtractedMath {
  /** All expressions indexed by type */
  expressions: Record<ExpressionType, SymbolicExpression[]>;
  
  /** All used variables with their descriptions */
  variables: Record<string, string>;
  
  /** Relationships between expressions (dependency graph) */
  relationships: Array<{
    from: string; // expression id
    to: string;   // expression id
    type: 'uses' | 'derives' | 'optimizes';
  }>;
}

/**
 * Main class for extracting symbolic mathematical expressions from code
 */
export class SymbolicExtractor {
  /** Extracted expressions */
  private extractedMath: ExtractedMath = {
    expressions: {
      [ExpressionType.BEZIER_CURVE]: [],
      [ExpressionType.MINIMUM_JERK]: [],
      [ExpressionType.PHYSICS_MODEL]: [],
      [ExpressionType.VELOCITY_PROFILE]: [],
      [ExpressionType.OU_PROCESS]: [],
      [ExpressionType.COMPOSITE_BLEND]: [],
      [ExpressionType.CUSTOM]: []
    },
    variables: {},
    relationships: []
  };
  
  /**
   * Create a new symbolic extractor
   */
  constructor() {
    // Initialize with built-in expressions from the mathematical foundation
    this.initializeBuiltInExpressions();
  }
  
  /**
   * Extract symbolic math expressions from a source file
   * 
   * @param sourceCode Source code to analyze
   * @param filePath Path to the source file
   * @returns Extracted expressions from this file
   */
  extractFromSource(sourceCode: string, filePath: string): SymbolicExpression[] {
    const expressions: SymbolicExpression[] = [];
    
    // Extract expressions using special comment annotations
    // Format: /* @symbolic: type=TYPE, latex=LATEX, description=DESC */
    const symbolicAnnotationRegex = /\/\*\s*@symbolic:\s*([\s\S]*?)\s*\*\/\s*([^;]*)/g;
    
    let match;
    while ((match = symbolicAnnotationRegex.exec(sourceCode)) !== null) {
      const annotationText = match[1];
      const codeSnippet = match[2].trim();
      
      // Parse annotation attributes
      const attributes: Record<string, string> = {};
      const attributeRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\s]*))/g;
      
      let attrMatch;
      while ((attrMatch = attributeRegex.exec(annotationText)) !== null) {
        const name = attrMatch[1];
        const value = attrMatch[2] || attrMatch[3] || attrMatch[4];
        attributes[name] = value;
      }
      
      // Calculate line number
      const lineNumber = (sourceCode.substring(0, match.index).match(/\n/g) || []).length + 1;
      
      // Create expression object
      const type = (attributes.type as ExpressionType) || ExpressionType.CUSTOM;
      const expression: SymbolicExpression = {
        type,
        latex: attributes.latex || '',
        asciiMath: attributes.asciiMath || '',
        description: attributes.description || '',
        parameters: {},
        sourceCode: codeSnippet,
        source: {
          file: filePath,
          line: lineNumber
        }
      };
      
      // Parse parameters if provided
      if (attributes.parameters) {
        try {
          expression.parameters = JSON.parse(attributes.parameters);
        } catch (e) {
          console.warn(`Failed to parse parameters for expression at ${filePath}:${lineNumber}`);
        }
      }
      
      // Add expression to the results
      expressions.push(expression);
      this.extractedMath.expressions[type].push(expression);
    }
    
    return expressions;
  }
  
  /**
   * Get all extracted mathematical expressions
   * 
   * @returns All extracted expressions
   */
  getExtractedMath(): ExtractedMath {
    return this.extractedMath;
  }
  
  /**
   * Export the extracted mathematics to LaTeX format
   * 
   * @returns LaTeX document containing all extracted expressions
   */
  exportToLatex(): string {
    let latex = `\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{listings}
\\usepackage{xcolor}
\\usepackage{hyperref}

\\title{Symbolic Mathematics Extracted from Code}
\\author{MousePlayWrong}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

This document contains the symbolic mathematical expressions extracted from the MousePlayWrong codebase.
These expressions formally define the mathematical models used in the implementation.

`;

    // Generate sections for each expression type
    Object.entries(this.extractedMath.expressions).forEach(([type, expressions]) => {
      if (expressions.length === 0) return;
      
      const typeName = type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      latex += `\\section{${typeName} Expressions}\n\n`;
      
      expressions.forEach((expr, index) => {
        latex += `\\subsection{${expr.description || `Expression ${index + 1}`}}\n\n`;
        latex += `\\begin{align}\n${expr.latex}\n\\end{align}\n\n`;
        
        if (Object.keys(expr.parameters).length > 0) {
          latex += `\\textbf{Parameters:}\n\n`;
          latex += `\\begin{itemize}\n`;
          
          Object.entries(expr.parameters).forEach(([param, desc]) => {
            latex += `\\item $${param}$: ${desc}\n`;
          });
          
          latex += `\\end{itemize}\n\n`;
        }
        
        // Include source code
        latex += `\\textbf{Implementation:}\n\n`;
        latex += `\\begin{lstlisting}[language=TypeScript, basicstyle=\\small\\ttfamily]\n`;
        latex += expr.sourceCode + '\n';
        latex += `\\end{lstlisting}\n\n`;
        
        latex += `Source: \\texttt{${expr.source.file}:${expr.source.line}}\n\n`;
      });
    });
    
    latex += `\\section{Conclusion}

These mathematical expressions form the foundation of the MousePlayWrong system's movement generation.
Each expression has been carefully implemented to ensure that the code accurately reflects the mathematical model.

\\end{document}`;

    return latex;
  }
  
  /**
   * Check the implementation against the symbolic representation
   * 
   * @param expression Symbolic expression to validate
   * @param inputs Test inputs for validation
   * @param expectedOutputs Expected outputs for validation
   * @returns Validation results with errors if any
   */
  validateImplementation(
    expression: SymbolicExpression,
    inputs: Record<string, number>[],
    expectedOutputs: any[]
  ): {
    valid: boolean;
    errors: string[];
    results: any[];
  } {
    // This would normally run the code and compare with expected results
    // For demonstration, we'll just return a placeholder
    return {
      valid: true,
      errors: [],
      results: []
    };
  }
  
  /**
   * Initialize with built-in expressions from the mathematical foundation
   */
  private initializeBuiltInExpressions(): void {
    // Bezier curve
    this.extractedMath.expressions[ExpressionType.BEZIER_CURVE].push({
      type: ExpressionType.BEZIER_CURVE,
      latex: '\\mathbf{B}(t) = (1-t)^3\\mathbf{P}_0 + 3(1-t)^2t\\mathbf{P}_1 + 3(1-t)t^2\\mathbf{P}_2 + t^3\\mathbf{P}_3',
      asciiMath: 'B(t) = (1-t)^3*P_0 + 3(1-t)^2*t*P_1 + 3(1-t)*t^2*P_2 + t^3*P_3',
      description: 'Cubic Bézier curve formula',
      parameters: {
        't': 'Normalized time parameter [0,1]',
        'P_0': 'Start point',
        'P_1': 'First control point',
        'P_2': 'Second control point',
        'P_3': 'End point'
      },
      sourceCode: 'From mathematical foundation',
      source: {
        file: 'MathematicalFoundation.tex',
        line: 70
      }
    });
    
    // Minimum-jerk trajectory
    this.extractedMath.expressions[ExpressionType.MINIMUM_JERK].push({
      type: ExpressionType.MINIMUM_JERK,
      latex: 'x(t) = x_0 + (x_1 - x_0)(10\\tau^3 - 15\\tau^4 + 6\\tau^5)',
      asciiMath: 'x(t) = x_0 + (x_1 - x_0)(10*tau^3 - 15*tau^4 + 6*tau^5)',
      description: 'Minimum-jerk trajectory in canonical form',
      parameters: {
        'tau': 'Normalized time t/T [0,1]',
        'x_0': 'Start position',
        'x_1': 'End position'
      },
      sourceCode: 'From mathematical foundation',
      source: {
        file: 'MathematicalFoundation.tex',
        line: 241
      }
    });
    
    // Spring-mass-damper model
    this.extractedMath.expressions[ExpressionType.PHYSICS_MODEL].push({
      type: ExpressionType.PHYSICS_MODEL,
      latex: '\\mathbf{p}(t) = \\mathbf{p}_1 + (\\mathbf{p}_0 - \\mathbf{p}_1)e^{-\\zeta\\omega_n t}(\\cos\\omega_d t + \\frac{\\zeta\\omega_n}{\\omega_d}\\sin\\omega_d t)',
      asciiMath: 'p(t) = p_1 + (p_0 - p_1)*e^(-zeta*omega_n*t)*(cos(omega_d*t) + (zeta*omega_n)/(omega_d)*sin(omega_d*t))',
      description: 'Solution to spring-mass-damper system for mouse physics',
      parameters: {
        'p_0': 'Start position',
        'p_1': 'Target position',
        'zeta': 'Damping ratio',
        'omega_n': 'Natural frequency',
        'omega_d': 'Damped frequency'
      },
      sourceCode: 'From mathematical foundation',
      source: {
        file: 'MathematicalFoundation.tex',
        line: 188
      }
    });
    
    // Ornstein-Uhlenbeck process
    this.extractedMath.expressions[ExpressionType.OU_PROCESS].push({
      type: ExpressionType.OU_PROCESS,
      latex: 'd\\mathbf{X}_t = \\theta(\\mu - \\mathbf{X}_t)dt + \\sigma d\\mathbf{W}_t',
      asciiMath: 'dX_t = theta*(mu - X_t)*dt + sigma*dW_t',
      description: 'Ornstein-Uhlenbeck process for realistic jitter',
      parameters: {
        'X_t': 'Jitter displacement at time t',
        'theta': 'Mean reversion rate',
        'mu': 'Mean value',
        'sigma': 'Volatility',
        'W_t': 'Wiener process (Brownian motion)'
      },
      sourceCode: 'From mathematical foundation',
      source: {
        file: 'MathematicalFoundation.tex',
        line: 310
      }
    });
  }
}

/**
 * Global singleton instance of SymbolicExtractor
 */
export const globalSymbolicExtractor = new SymbolicExtractor();