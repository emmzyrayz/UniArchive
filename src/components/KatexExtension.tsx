import {Extension, Node} from "@tiptap/core";
import {Plugin, PluginKey} from "prosemirror-state";
import {Decoration, DecorationSet} from "prosemirror-view";
import {Node as ProseMirrorNode} from "prosemirror-model";
import katex from "katex";

// Define custom commands
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    katex: {
      insertFormula: (formula: string) => ReturnType;
      updateFormula: (position: number, formula: string) => ReturnType;
    };
  }
}

// Helper function to convert LaTeX to human-readable text
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

  // Start with a copy of the LaTeX
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

// Create a custom formula node to store the LaTeX formula
export const FormulaNode = Node.create({
  name: "formula",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      formula: {
        default: "",
      },
      description: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-formula]",
        getAttrs: (element) => {
          if (typeof element === "string") return {};

          const htmlElement = element as HTMLElement;
          return {
            formula: htmlElement.getAttribute("data-formula") || "",
            description: htmlElement.getAttribute("data-description") || "",
          };
        },
      },
    ];
  },

  renderHTML({HTMLAttributes}) {
    return [
      "span",
      {
        class: "formula-node",
        "data-formula": HTMLAttributes.formula,
        "data-description": HTMLAttributes.description,
      },
      HTMLAttributes.description || `[Formula]`,
    ];
  },
});

// Extension to provide the formula editing functionality
export const KatexExtension = Extension.create({
  name: "katex",

  addGlobalAttributes() {
    return [
      {
        types: ["span"],
        attributes: {
          "data-formula": {
            default: null,
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      insertFormula:
        (formula: string) =>
        ({editor, tr, dispatch}) => {
          const description = getFormulaDescription(formula);

          // Insert directly using the transaction API to avoid recursion
          if (dispatch && tr) {
            const node = editor.schema.nodes.formula.create({
              formula,
              description: `[Formula: ${description}]`,
            });

            tr.replaceSelectionWith(node);
            return true;
          }

          return false;
        },

      updateFormula:
        (position: number, formula: string) =>
        ({tr, dispatch}) => {
          if (dispatch) {
            // Find the formula node at the position and update it
            const description = getFormulaDescription(formula);
            tr.setNodeMarkup(position, undefined, {
              formula,
              description: `[Formula: ${description}]`,
            });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("katex"),

        props: {
          decorations(state) {
            const {doc} = state;
            const decorations: Decoration[] = [];

            // Find all formula nodes and replace them with rendered KaTeX
            doc.descendants((node: ProseMirrorNode, pos: number) => {
              if (node.type.name === "formula") {
                const formula = node.attrs.formula as string;

                // Create a replacement decoration
                decorations.push(
                  Decoration.widget(pos, () => {
                    const container = document.createElement("span");
                    container.className = "katex-formula-container";
                    container.contentEditable = "false";
                    container.dataset.position = pos.toString();

                    try {
                      // Render KaTeX
                      katex.render(formula, container, {
                        throwOnError: false,
                        displayMode: false,
                      });

                      // Make it clickable for editing
                      container.classList.add(
                        "cursor-pointer",
                        "hover:bg-blue-50",
                        "px-1",
                        "py-0.5",
                        "rounded"
                      );
                      container.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Dispatch edit event
                        const editEvent = new CustomEvent("editFormula", {
                          bubbles: true,
                          detail: {
                            position: pos,
                            formula: formula,
                          },
                        });
                        container.dispatchEvent(editEvent);
                      });
                    } catch (e) {
                      console.error("KaTeX rendering error:", e);
                      container.textContent =
                        node.attrs.description || "[Formula rendering error]";
                    }

                    return container;
                  })
                );

                // Hide the original node
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "hidden-formula-node",
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});