import mongoose from "mongoose";
import { config } from "./index.js";

/**
 * Drop stale unique indexes that were removed from schemas but may still
 * exist in the database from previous deployments.
 */
async function dropStaleIndexes(): Promise<void> {
  try {
    const db = mongoose.connection.db!;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    // apikeys.walletAddress_1 was previously unique; multiple keys per wallet are now allowed
    if (collectionNames.includes("apikeys")) {
      const indexes = await db.collection("apikeys").indexes();
      const staleIdx = indexes.find(
        (idx) =>
          idx.name === "walletAddress_1" && idx.unique === true
      );
      if (staleIdx) {
        await db.collection("apikeys").dropIndex("walletAddress_1");
        console.log("Dropped stale unique index: apikeys.walletAddress_1");
      }
    }
  } catch (e) {
    console.warn("Warning: could not clean up stale indexes:", (e as Error).message);
  }
}

/**
 * Connect to MongoDB. Called from server.ts at startup.
 */
export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  console.log("MongoDB connected");
  await dropStaleIndexes();
}
