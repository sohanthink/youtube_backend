import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// console.log("db name:", process.env.MONGODB_URL);

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      // `${process.env.MONGODB_URL}/${DB_NAME}`
      process.env.MONGODB_URL
    );
    console.log(
      `\n MongoDB connected !! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("mongoDb connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
