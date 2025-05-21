import React, {useEffect, useState} from "react";
import katex from "katex";

type FormulaModalProps = {
  onClose: () => void;
  onInsert: (formula: string) => void;
  initialFormula?: string; // Add this to receive an initial formula when editing
};


interface SymbolItem {
  symbol: string;
  description: string;
}

interface SymbolCategoryMap {
  [category: string]: SymbolItem[];
}

export const FormulaModal: React.FC<FormulaModalProps> = ({
  onClose,
  onInsert,
  initialFormula = "",
}) => {
  const [formula, setFormula] = useState("");
  const [preview, setPreview] = useState("");
  const [activeCategory, setActiveCategory] = useState("basic");
  // const [showHumanReadable, setShowHumanReadable] = useState(false); 
  // Toggle for human readable display

  // Common symbols by category
  const symbols: SymbolCategoryMap = {
    basic: [
      {symbol: "+", description: "Addition"},
      {symbol: "-", description: "Subtraction"},
      {symbol: "\\times", description: "Multiplication"},
      {symbol: "\\div", description: "Division"},
      {symbol: "=", description: "Equals"},
      {symbol: "\\neq", description: "Not Equal"},
      {symbol: "<", description: "Less Than"},
      {symbol: ">", description: "Greater Than"},
      {symbol: "\\leq", description: "Less Than or Equal"},
      {symbol: "\\geq", description: "Greater Than or Equal"},
    ],
    fractions: [
      {symbol: "\\frac{a}{b}", description: "Fraction"},
      {symbol: "\\dfrac{a}{b}", description: "Display Fraction"},
      {symbol: "\\tfrac{a}{b}", description: "Text Fraction"},
      {symbol: "{a \\over b}", description: "Alternative Fraction"},
    ],
    exponents: [
      {symbol: "x^2", description: "Square"},
      {symbol: "x^n", description: "Power"},
      {symbol: "x_n", description: "Subscript"},
      {symbol: "x^a_b", description: "Super and Sub"},
      {symbol: "\\sqrt{x}", description: "Square Root"},
      {symbol: "\\sqrt[n]{x}", description: "Nth Root"},
    ],
    calculus: [
      {symbol: "\\frac{d}{dx}", description: "Derivative"},
      {
        symbol: "\\frac{\\partial}{\\partial x}",
        description: "Partial Derivative",
      },
      {symbol: "\\int", description: "Integral"},
      {symbol: "\\int_a^b", description: "Definite Integral"},
      {symbol: "\\sum", description: "Sum"},
      {symbol: "\\sum_{i=0}^n", description: "Sum with Limits"},
      {symbol: "\\prod", description: "Product"},
      {symbol: "\\lim_{x \\to 0}", description: "Limit"},
    ],
    matrices: [
      {
        symbol: "\\begin{matrix} a & b \\\\ c & d \\end{matrix}",
        description: "Matrix",
      },
      {
        symbol: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
        description: "Parentheses Matrix",
      },
      {
        symbol: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}",
        description: "Bracket Matrix",
      },
      {
        symbol: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}",
        description: "Determinant",
      },
    ],
    greek: [
      {symbol: "\\alpha", description: "Alpha"},
      {symbol: "\\beta", description: "Beta"},
      {symbol: "\\gamma", description: "Gamma"},
      {symbol: "\\delta", description: "Delta"},
      {symbol: "\\epsilon", description: "Epsilon"},
      {symbol: "\\zeta", description: "Zeta"},
      {symbol: "\\eta", description: "Eta"},
      {symbol: "\\theta", description: "Theta"},
      {symbol: "\\lambda", description: "Lambda"},
      {symbol: "\\mu", description: "Mu"},
      {symbol: "\\pi", description: "Pi"},
      {symbol: "\\sigma", description: "Sigma"},
      {symbol: "\\phi", description: "Phi"},
      {symbol: "\\omega", description: "Omega"},
    ],
  };

  // Template formulas
  const templates = [
    {
      label: "Quadratic Formula",
      latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    },
    {label: "Pythagorean Theorem", latex: "a^2 + b^2 = c^2"},
    {label: "Area of Circle", latex: "A = \\pi r^2"},
    {
      label: "Binomial Theorem",
      latex: "(x + y)^n = \\sum_{k=0}^n {n \\choose k} x^{n-k} y^k",
    },
    {
      label: "Taylor Series",
      latex: "f(x) = \\sum_{n=0}^\\infty \\frac{f^{(n)}(a)}{n!} (x-a)^n",
    },
    {
      label: "Maxwell Equations",
      latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}",
    },
    {
      label: "Einstein Field Equations",
      latex: "G_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}",
    },
  ];

  // Convert LaTeX to a human-readable description
  const getFormulaDescription = (latex: string): string => {
    // This is a safer version of the parser
    const descriptions: {[key: string]: string} = {
      "\\times": "times",
      "\\div": "divided by",
      "\\neq": "not equal to",
      "\\leq": "less than or equal to",
      "\\geq": "greater than or equal to",
      "\\frac": "fraction",
      "\\sqrt": "square root of",
      "\\pi": "pi",
      "\\alpha": "alpha",
      "\\beta": "beta",
      "\\gamma": "gamma",
      "\\delta": "delta",
      "\\sum": "sum",
      "\\int": "integral",
      "\\prod": "product",
      "\\lim": "limit",
    };

    // Simple special characters that need escaping in RegExp
    const simpleSymbols: {[key: string]: string} = {
      "+": "plus",
      "-": "minus",
      "=": "equals",
      "<": "less than",
      ">": "greater than",
      "^2": "squared",
      "^3": "cubed",
      "^": "to the power of",
      _: "subscript",
    };

    // Very basic conversion - this would need to be expanded for a real implementation
    let humanReadable = latex;

    // First replace complex expressions (with backslashes)
    Object.entries(descriptions).forEach(([symbol, description]) => {
      // Escape the backslash for regex
      const escapedSymbol = symbol.replace(/\\/g, "\\\\");
      try {
        // Create a global regex to match the symbol
        const regex = new RegExp(escapedSymbol, "g");
        humanReadable = humanReadable.replace(regex, ` ${description} `);
      } catch (error) {
        console.error(`Error creating regex for ${symbol}:`, error);
      }
    });

    // Then replace simple symbols
    Object.entries(simpleSymbols).forEach(([symbol, description]) => {
      try {
        // For simple symbols, escape any special regex characters
        const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedSymbol, "g");
        humanReadable = humanReadable.replace(regex, ` ${description} `);
      } catch (error) {
        console.error(`Error creating regex for ${symbol}:`, error);
      }
    });

    // Clean up multiple spaces
    humanReadable = humanReadable.replace(/\s+/g, " ").trim();

    return humanReadable;
  };

  // Update the formula input and preview
 // Update the formula input and preview
  const updateFormula = (newFormula: string) => {
    setFormula(newFormula);
    renderPreview(newFormula);
  };

  // Separate function to render the preview
  const renderPreview = (formulaText: string) => {
    if (!formulaText) {
      setPreview("");
      return;
    }
    
    try {
      const rendered = katex.renderToString(formulaText, {
        throwOnError: false,
        displayMode: true, // Renders the formula in display mode (centered, bigger)
      });
      setPreview(rendered);
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      setPreview(`<span class="text-red-500">Error rendering formula</span>`);
    }
  };


  // Initialize the preview when component mounts or initialFormula changes
  useEffect(() => {
    if (initialFormula) {
      updateFormula(initialFormula);
    }
  }, [initialFormula, updateFormula]);

  // Add a symbol to the formula
  const insertSymbol = (symbol: string) => {
    updateFormula(formula + symbol);
  };

  // Use a template formula
  const applyTemplate = (latex: string) => {
    updateFormula(latex);
  };

  // Generate SVG from KaTeX output
  // const generateSvgFromKatex = (katexHtml: string): string => {
  //   // This is a placeholder for the actual SVG conversion
  //   // In a real implementation, you would parse the KaTeX HTML and convert it to SVG
  //   // This is a simplified version that wraps the KaTeX HTML in an SVG container
  //   return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  //     <foreignObject width="100%" height="100%">
  //       <div xmlns="http://www.w3.org/1999/xhtml">${katexHtml}</div>
  //     </foreignObject>
  //   </svg>`;
  // };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="fixed inset-0 bg-black bg-opacity-25"
        onClick={onClose}
      ></div>
      <div className="bg-white rounded shadow-lg z-10 w-4/5 max-w-4xl max-h-4/5 overflow-auto">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">
            Insert Mathematical Formula
          </h2>

          {/* Formula Input */}
          <div className="mb-4">
            <label className="block mb-2 font-medium">LaTeX Formula:</label>
            <input
              type="text"
              value={formula}
              onChange={(e) => updateFormula(e.target.value)}
              placeholder="Enter LaTeX formula (e.g. E = mc^2)"
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {/* Human Readable Description */}
          <div className="mb-4">
            <label className="block mb-2 font-medium">Human Readable:</label>
            <div className="p-2 border border-gray-300 rounded bg-gray-50 min-h-10">
              {formula
                ? getFormulaDescription(formula)
                : "Your formula in plain language will appear here"}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-4">
            <label className="block mb-2 font-medium">Preview:</label>
            <div
              className="p-4 border border-gray-300 rounded min-h-16 flex items-center justify-center"
              dangerouslySetInnerHTML={{__html: preview}}
            ></div>
          </div>

          {/* Symbol Categories */}
          <div className="mb-2">
            <div className="flex border-b border-gray-200">
              {Object.keys(symbols).map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 ${
                    activeCategory === category
                      ? "bg-blue-100 border-b-2 border-blue-500"
                      : ""
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol Grid */}
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {symbols[activeCategory].map((item, index) => (
              <button
                key={index}
                className="p-2 border border-gray-300 rounded text-center hover:bg-gray-100 flex flex-col items-center"
                onClick={() => insertSymbol(item.symbol)}
              >
                <span
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(item.symbol, {
                      throwOnError: false,
                    }),
                  }}
                ></span>
                <span className="text-xs mt-1">{item.description}</span>
              </button>
            ))}
          </div>

          {/* Common Templates */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Common Formulas:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-100 flex flex-col items-center"
                  onClick={() => applyTemplate(template.latex)}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(template.latex, {
                        throwOnError: false,
                      }),
                    }}
                  ></span>
                  <span className="text-xs mt-1">{template.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => {
                onInsert(formula);
                onClose();
              }}
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
