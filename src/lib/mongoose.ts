// src/lib/mongoose.ts
// Cached Mongoose connection shared across hot reloads and serverless invocations.
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis._mongooseCache ?? {
  conn: null,
  promise: null,
};
globalThis._mongooseCache = cached;

const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  family: 4,
  retryWrites: true,
  w: "majority",
  appName: "UniArchive",
};

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  // Checked here rather than at import time so `next build` can analyse
  // routes without the variable being set.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, CONNECT_OPTIONS).catch((error) => {
      cached.promise = null;
      console.error("MongoDB connection failed:", error);
      throw error;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
