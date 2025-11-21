import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client with Neon-optimized configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection health check and reconnection
let isConnected = false;

async function connectWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      isConnected = true;
      console.log('[DB] Successfully connected to database');
      return;
    } catch (error) {
      console.error(`[DB] Connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  throw new Error('Failed to connect to database after multiple attempts');
}

// Initial connection
connectWithRetry().catch(console.error);

// Periodic health check to maintain connection
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (!isConnected) {
      console.log('[DB] Connection restored');
      isConnected = true;
    }
  } catch (error) {
    if (isConnected) {
      console.error('[DB] Connection lost, attempting to reconnect...');
      isConnected = false;
    }
    try {
      await prisma.$connect();
      isConnected = true;
      console.log('[DB] Reconnected successfully');
    } catch (reconnectError) {
      console.error('[DB] Reconnection failed:', reconnectError.message);
    }
  }
}, 30000); // Check every 30 seconds

// Graceful shutdown
const shutdown = async () => {
  console.log('[DB] Disconnecting from database...');
  await prisma.$disconnect();
  isConnected = false;
  console.log('[DB] Disconnected');
};

process.on('beforeExit', shutdown);
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

// Helper function for raw SQL queries if needed
// (Most of the time you'll use Prisma's type-safe API)
export const query = async (text, params = []) => {
  try {
    const result = await prisma.$queryRawUnsafe(text, ...params);
    return { rows: result };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Export the Prisma client for type-safe queries
export default prisma;

// Export named for convenience
export { prisma };
