import mongoose from "mongoose";
import { config } from "./index.js";

/**
 * Connect to MongoDB database
 */
export const connectDB = async () => {
  try {
    const connUri = config.mongoUri;
    if (!connUri) {
      throw new Error("MONGODB_URI environment variable is missing. Please define it in your .env file.");
    }

    const conn = await mongoose.connect(connUri);
    console.log(`[HydroGuard] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[HydroGuard] MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
