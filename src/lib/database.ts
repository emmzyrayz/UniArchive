// /lib/database.ts - Updated to support multiple databases
import mongoose from 'mongoose';

// Type assertion to ensure MONGODB_URI is treated as string after validation
const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uniPlatformConn: mongoose.Connection | null;
  uniPlatformPromise: Promise<mongoose.Connection> | null;
}

// Extend the global namespace
declare global {
  // eslint-disable-next-line no-var
  var mongoose: GlobalMongoose | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { 
    conn: null, 
    promise: null,
    uniPlatformConn: null,
    uniPlatformPromise: null,
  };
}

// Default database connection (for user sessions, auth, etc.)
async function connectDB(): Promise<typeof mongoose> {
  // Add debug logging
  console.log('🔄 Attempting MongoDB connection (default database)...');
  console.log('📍 Connection string (masked):', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  
  if (cached?.conn) {
    console.log('✅ Using existing MongoDB connection (default)');
    return cached.conn;
  }

  if (!cached?.promise) {
    // Updated connection options to match MongoDB Atlas requirements
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority',
      appName: 'UniUsers', // Match the appName from Atlas
    };

    console.log('🚀 Creating new MongoDB connection (default)...');
    
    // Ensure cached exists before assignment
    if (!cached) {
      cached = global.mongoose = { 
        conn: null, 
        promise: null,
        uniPlatformConn: null,
        uniPlatformPromise: null,
      };
    }
    
    // Direct connection using mongoose (which uses MongoDB driver internally)
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected Successfully (default database)');
      console.log('📊 Connection state:', mongoose.connection.readyState);
      console.log('🏷️  Database name:', mongoose.connection.name);
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB Connection Error (default):', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno
      });
      
      // Provide specific troubleshooting based on error
      if (error.message?.includes('ECONNREFUSED')) {
        console.error('🔧 Troubleshooting steps:');
        console.error('   1. Check if your IP is whitelisted in MongoDB Atlas');
        console.error('   2. Verify cluster is running and accessible');
        console.error('   3. Ensure connection string includes database name');
        console.error('   4. Check network/firewall settings');
      }
      
      if (cached) {
        cached.promise = null; // Reset promise on error
      }
      throw error
    });
  }

  try {
    if (cached?.promise) {
      cached.conn = await cached.promise;
      return cached.conn;
    } else {
      throw new Error('Failed to create MongoDB connection promise');
    }
  } catch (e) {
    if (cached) {
      cached.promise = null;
    }
    console.error('💥 Failed to establish MongoDB connection (default):', e);
    throw e;
  }
}

// University platform database connection (for schools, courses, materials)
async function connectUniPlatformDB(): Promise<mongoose.Connection> {
  console.log('🔄 Attempting MongoDB connection (UniPlatform database)...');
  
  if (cached!.uniPlatformConn) {
    console.log('✅ Using existing UniPlatform MongoDB connection');
    return cached!.uniPlatformConn;
  }

  if (!cached!.uniPlatformPromise) {
    // Create connection to uniplatform database
    const uniPlatformUri = MONGODB_URI.replace(/\/[^\/]*(\?|$)/, '/uniplatform$1');
    console.log('📍 UniPlatform connection string (masked):', uniPlatformUri.replace(/\/\/.*@/, '//***:***@'));
    
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority',
      appName: 'UniPlatform',
    };

    console.log('🚀 Creating new MongoDB connection (UniPlatform)...');
    
    cached!.uniPlatformPromise = mongoose.createConnection(uniPlatformUri, opts).asPromise().then((connection) => {
      console.log('✅ Connected to UniPlatform MongoDB database');
      console.log('📊 Connection state:', connection.readyState);
      console.log('🏷️  Database name:', connection.name);
      return connection;
    }).catch((error) => {
      console.error('❌ UniPlatform MongoDB Connection Error:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno
      });
      
      if (cached) {
        cached.uniPlatformPromise = null; // Reset promise on error
      }
      throw error;
    });
  }

  try {
    cached!.uniPlatformConn = await cached!.uniPlatformPromise;
    return cached!.uniPlatformConn;
  } catch (e) {
    cached!.uniPlatformPromise = null;
    console.error('💥 Failed to establish UniPlatform MongoDB connection:', e);
    throw e;
  }
}

// Helper function to get the correct connection for school models
export async function getSchoolDBConnection(): Promise<mongoose.Connection> {
  return await connectUniPlatformDB();
}

// Export both connections
export default connectDB;
export { connectUniPlatformDB };