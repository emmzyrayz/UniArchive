// src/instrumentation.ts
// Runs once when a server instance starts.
export async function register() {
  // Email is only sent from the Node.js runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warnIfMailUnconfigured } = await import("@/lib/mailConfig");
    warnIfMailUnconfigured();
  }
}
