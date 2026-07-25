import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billing360_db';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      family: 4
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] MongoDB Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
