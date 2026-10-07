// Per test file: point the app's connection (lib/mongoose.ts) at a fresh
// database on the in-memory server, and refuse anything else.
import { afterAll, inject } from "vitest";
import mongoose from "mongoose";

const uri = inject("mongoUri");
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/$/.test(uri)) {
  throw new Error(`Refusing to run database tests against ${uri}: only the in-memory server is allowed.`);
}
process.env.MONGODB_URI = `${uri}test_${process.pid}_${Date.now().toString(36)}`;

afterAll(async () => {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  globalThis._mongooseCache = undefined;
});
