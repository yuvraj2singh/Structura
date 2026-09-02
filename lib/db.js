import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // In dev without a real URI, we warn rather than crash at import time
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Structura] MONGODB_URI not set — DB calls will fail until configured.");
  }
}

/** Global cache to reuse connection across hot-reloads in dev */
let cached = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI environment variable is not set.");
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then(m => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
