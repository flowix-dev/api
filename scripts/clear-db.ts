import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flowix";

async function clearDb(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const collections = await mongoose.connection.db!.listCollections().toArray();

    if (collections.length === 0) {
      console.log("No collections found");
      return;
    }

    for (const col of collections) {
      const count = await mongoose.connection.db!.collection(col.name).countDocuments();
      await mongoose.connection.db!.collection(col.name).deleteMany({});
      console.log(`  Cleared "${col.name}" (${count} documents removed)`);
    }

    console.log("\nAll collections cleared successfully");
  } catch (error) {
    console.error("Failed to clear database:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

clearDb();
