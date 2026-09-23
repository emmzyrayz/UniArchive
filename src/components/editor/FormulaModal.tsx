// components/editor/FormulaModal.tsx
// LaTeX formula picker with a live KaTeX preview, symbol palettes and common
// templates. "Display" mode is stored as a \displaystyle prefix on the formula.
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import "katex/dist/katex.min.css";
import { Button } from "@/components/UI/Buttons";
import { renderLatex } from "@/lib/sanitize";
import { useIsClient } from "@/hooks/useIsClient";

type FormulaModalProps = {
  onClose: () => void;
  onInsert: (formula: string, description?: string) => void;
  initialFormula?: string;
  initialDescription?: string;
};

interface SymbolItem {
  symbol: string;
  description: string;
}

const DISPLAY_PREFIX = "\\displaystyle ";

const SYMBOLS: Record<string, SymbolItem[]> = {
  basic: [
    { symbol: "+", description: "Addition" },
    { symbol: "-", description: "Subtraction" },
    { symbol: "\\times", description: "Multiplication" },
    { symbol: "\\div", description: "Division" },
    { symbol: "=", description: "Equals" },
    { symbol: "\\neq", description: "Not Equal" },
    { symbol: "<", description: "Less Than" },
    { symbol: ">", description: "Greater Than" },
    { symbol: "\\leq", description: "Less Than or Equal" },
    { symbol: "\\geq", description: "Greater Than or Equal" },
  ],
  fractions: [
    { symbol: "\\frac{a}{b}", description: "Fraction" },
    { symbol: "\\dfrac{a}{b}", description: "Display Fraction" },
    { symbol: "\\tfrac{a}{b}", description: "Text Fraction" },
    { symbol: "{a \\over b}", description: "Alternative Fraction" },
  ],
  exponents: [
    { symbol: "x^2", description: "Square" },
    { symbol: "x^n", description: "Power" },
    { symbol: "x_n", description: "Subscript" },
    { symbol: "x^a_b", description: "Super and Sub" },
    { symbol: "\\sqrt{x}", description: "Square Root" },
    { symbol: "\\sqrt[n]{x}", description: "Nth Root" },
  ],
  calculus: [
    { symbol: "\\frac{d}{dx}", description: "Derivative" },
    { symbol: "\\frac{\\partial}{\\partial x}", description: "Partial Derivative" },
    { symbol: "\\int", description: "Integral" },
    { symbol: "\\int_a^b", description: "Definite Integral" },
    { symbol: "\\sum", description: "Sum" },
    { symbol: "\\sum_{i=0}^n", description: "Sum with Limits" },
    { symbol: "\\prod", description: "Product" },
    { symbol: "\\lim_{x \\to 0}", description: "Limit" },
  ],
  matrices: [
    { symbol: "\\begin{matrix} a & b \\\\ c & d \\end{matrix}", description: "Matrix" },
    { symbol: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", description: "Parentheses Matrix" },
    { symbol: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", description: "Bracket Matrix" },
    { symbol: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", description: "Determinant" },
  ],
  greek: [
    { symbol: "\\alpha", description: "Alpha" },
    { symbol: "\\beta", description: "Beta" },
    { symbol: "\\gamma", description: "Gamma" },
    { symbol: "\\delta", description: "Delta" },
    { symbol: "\\epsilon", description: "Epsilon" },
    { symbol: "\\zeta", description: "Zeta" },
    { symbol: "\\eta", description: "Eta" },
    { symbol: "\\theta", description: "Theta" },
    { symbol: "\\lambda", description: "Lambda" },
    { symbol: "\\mu", description: "Mu" },
    { symbol: "\\pi", description: "Pi" },
    { symbol: "\\sigma", description: "Sigma" },
    { symbol: "\\phi", description: "Phi" },
    { symbol: "\\omega", description: "Omega" },
  ],
};

const TEMPLATES = [
  { label: "Quadratic Formula", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { label: "Pythagorean Theorem", latex: "a^2 + b^2 = c^2" },
  { label: "Area of Circle", latex: "A = \\pi r^2" },
  { label: "Binomial Theorem", latex: "(x + y)^n = \\sum_{k=0}^n {n \\choose k} x^{n-k} y^k" },
  { label: "Taylor Series", latex: "f(x) = \\sum_{n=0}^\\infty \\frac{f^{(n)}(a)}{n!} (x-a)^n" },
  { label: "Maxwell Equations", latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}" },
  { label: "Einstein Field Equations", latex: "G_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}" },
];

function Latex({ latex, display = false }: { latex: string; display?: boolean }) {
  const isClient = useIsClient();
  const html = useMemo(
    () => (isClient ? renderLatex(latex, display) : ""),
    [isClient, latex, display],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function FormulaModal({
  onClose,
  onInsert,
  initialFormula = "",
  initialDescription = "",
}: FormulaModalProps) {
  const startsDisplay = initialFormula.startsWith(DISPLAY_PREFIX);
  const [formula, setFormula] = useState(
    startsDisplay ? initialFormula.slice(DISPLAY_PREFIX.length) : initialFormula,
  );
  const [displayMode, setDisplayMode] = useState(startsDisplay);
  const [name, setName] = useState(initialDescription);
  const [activeCategory, setActiveCategory] = useState("basic");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const updateFormula = (value: string) => {
    setFormula(value);
    if (selectedTemplate && value !== selectedTemplate) setSelectedTemplate(null);
  };

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    setFormula(template.latex);
    setName(template.label);
    setSelectedTemplate(template.latex);
  };

  const handleInsert = () => {
    const trimmed = formula.trim();
    if (!trimmed) return;
    onInsert(
      displayMode ? DISPLAY_PREFIX + trimmed : trimmed,
      name.trim() || trimmed,
    );
    onClose();
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-border rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="formula-modal-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface-raised shadow-xl"
      >
        <div className="p-5 sm:p-6 space-y-5">
          <h2 id="formula-modal-title" className="text-xl font-bold text-text-primary">
            Insert formula
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="formula-name" className="block text-sm font-medium text-text-secondary">
              Name / description <span className="text-text-muted">(optional)</span>
            </label>
            <input
              id="formula-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quadratic Formula"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="formula-latex" className="block text-sm font-medium text-text-secondary">
              LaTeX
            </label>
            <input
              id="formula-latex"
              type="text"
              autoFocus
              value={formula}
              onChange={(e) => updateFormula(e.target.value)}
              placeholder="e.g. E = mc^2"
              className={`${inputClass} font-mono text-sm`}
            />
          </div>

          <div className="flex items-center gap-2" role="radiogroup" aria-label="Formula layout">
            {[
              { value: false, label: "Inline", hint: "Flows with the text" },
              { value: true, label: "Display", hint: "Centred on its own line" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={displayMode === opt.value}
                title={opt.hint}
                onClick={() => setDisplayMode(opt.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  displayMode === opt.value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-surface text-text-secondary border-border hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-text-secondary">Preview</span>
            <div
              className={`min-h-16 rounded-md border border-border bg-background p-4 overflow-x-auto text-text-primary ${
                displayMode ? "flex justify-center" : ""
              }`}
            >
              {formula.trim() ? (
                <Latex latex={formula} display={displayMode} />
              ) : (
                <span className="text-sm text-text-muted">Your formula will appear here</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex gap-1 border-b border-border overflow-x-auto" role="tablist">
              {Object.keys(SYMBOLS).map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    activeCategory === category
                      ? "border-accent text-text-primary"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {SYMBOLS[activeCategory].map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => updateFormula(formula + item.symbol)}
                  className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface p-2 text-text-primary hover:border-border-strong transition-colors"
                >
                  <Latex latex={item.symbol} />
                  <span className="text-xs text-text-muted">{item.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Common formulas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2 text-text-primary overflow-x-auto transition-colors ${
                    selectedTemplate === template.latex
                      ? "border-accent bg-surface"
                      : "border-border bg-surface hover:border-border-strong"
                  }`}
                >
                  <Latex latex={template.latex} />
                  <span className="text-xs text-text-muted">{template.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleInsert}>Insert</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
