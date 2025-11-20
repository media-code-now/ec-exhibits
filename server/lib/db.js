import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
// Prisma handles connection pooling automatically
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
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
