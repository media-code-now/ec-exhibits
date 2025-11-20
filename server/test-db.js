import 'dotenv/config';
import prisma from './lib/db.js';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test 1: Simple query
    console.log('Test 1: Simple query');
    const result = await prisma.$queryRaw`SELECT 1 as test_value, NOW() as server_time`;
    console.log('✅ Raw query works:', result[0]);
    
    // Test 2: Count users
    console.log('\nTest 2: Count users');
    const userCount = await prisma.user.count();
    console.log('✅ User count:', userCount);
    
    // Test 3: List all users
    console.log('\nTest 3: List all users');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`   - ${u.displayName} (${u.email}) [${u.role}]`);
    });
    
    // Test 4: Count projects
    console.log('\nTest 4: Count projects');
    const projectCount = await prisma.project.count();
    console.log('✅ Project count:', projectCount);
    
    console.log('\n🎉 All database tests passed!\n');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
