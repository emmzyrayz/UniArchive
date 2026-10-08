// Starts one in-memory MongoDB for the "db" test project. Each test file
// gets its own database on it (tests/db/setup.ts). It's a one-node replica
// set, so transactions work (the credits ledger uses them). The first run
// downloads a MongoDB binary (cached in ~/.cache/mongodb-binaries).
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await replSet.waitUntilRunning();
  project.provide("mongoUri", replSet.getUri());
  return async () => {
    await replSet.stop();
  };
}
