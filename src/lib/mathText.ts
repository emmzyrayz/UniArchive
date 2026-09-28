// src/lib/mathText.ts
// Parses text with LaTeX math between dollar signs: $x^2$ inline, $$x^2$$
// on its own line, \$ for a literal dollar. Pure, so it runs anywhere
// (rendering lives in components/layer2/math.tsx).
//
// Inline math follows the usual TeX/Pandoc convention so prices and stray
// dollars don't turn into math: an opening $ must be followed by a
// non-space, and a closing $ preceded by one, on the same line. Anything
// that doesn't form a pair stays plain text.

export type Segment = { kind: "text"; value: string } | { kind: "math"; value: string; display: boolean };

const isSpace = (ch: string | undefined) => ch === undefined || /\s/.test(ch);

/** The closing "$" of inline math opened just before `from`, or -1. */
function findInlineClose(input: string, from: number): number {
  for (let j = from; j < input.length; j++) {
    const ch = input[j];
    if (ch === "\n") return -1;
    if (ch === "\\") {
      j += 1; // skip the escaped character
      continue;
    }
    if (ch === "$" && !isSpace(input[j - 1])) return j;
  }
  return -1;
}

/** Splits text into plain and math runs. */
export function parseMathText(input: string): Segment[] {
  const segments: Segment[] = [];
  let text = "";
  const flush = () => {
    if (text) segments.push({ kind: "text", value: text });
    text = "";
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    if (ch === "\\" && input[i + 1] === "$") {
      text += "$";
      i += 2;
      continue;
    }

    if (ch === "$" && input[i + 1] === "$") {
      const close = input.indexOf("$$", i + 2);
      const body = close === -1 ? "" : input.slice(i + 2, close);
      if (body.trim()) {
        flush();
        segments.push({ kind: "math", value: body.trim(), display: true });
        i = close + 2;
      } else {
        text += "$$";
        i += 2;
      }
      continue;
    }

    if (ch === "$" && !isSpace(input[i + 1])) {
      const close = findInlineClose(input, i + 1);
      if (close !== -1) {
        flush();
        segments.push({ kind: "math", value: input.slice(i + 1, close), display: false });
        i = close + 1;
        continue;
      }
    }

    text += ch;
    i += 1;
  }
  flush();
  return segments;
}
