// Starts one in-memory MongoDB for the "db" test project. Each test file
// gets its own database on it (tests/db/setup.ts). The first run downloads
// a MongoDB binary (cached in ~/.cache/mongodb-binaries).
import { MongoMemoryServer } from "mongodb-memory-server-core";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export default async function setup(project: TestProject) {
  const server = await MongoMemoryServer.create();
  project.provide("mongoUri", server.getUri());
  return async () => {
    await server.stop();
  };
}
