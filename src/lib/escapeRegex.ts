// src/lib/escapeRegex.ts
// Escape user input before it goes into a MongoDB $regex.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
