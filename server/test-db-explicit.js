import { PrismaClient } from '@prisma/client';

// Explicitly set the DATABASE_URL for testing
const DATABASE_URL = 'postgresql://neondb_owner:npg_ju3ndQHoK2GA@ep-wispy-sky-afxqrqfg-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: ['query', 'error', 'warn']
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection with explicit URL...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true
      }
    });
    
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`   - ${u.displayName} (${u.email}) [${u.role}]`);
    });
    
    console.log('\n🎉 Database connection successful!\n');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
