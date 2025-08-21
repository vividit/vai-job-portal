import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Modern MongoDB connection options
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 45000, // Socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true, // Enable retryable writes
      w: 'majority' // Write concern
    });
    
    // Set mongoose options globally (modern way)
    mongoose.set('bufferCommands', false);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    
    // More detailed error information
    if (error.code === 'ENOTFOUND') {
      console.error("💡 DNS lookup failed. Check your internet connection and MongoDB URI.");
    } else if (error.code === 'ECONNREFUSED') {
      console.error("💡 Connection refused. Make sure MongoDB is running.");
    } else if (error.message.includes('authentication')) {
      console.error("💡 Authentication failed. Check your username and password.");
    }
    
    process.exit(1);
  }
};

export default connectDB;
