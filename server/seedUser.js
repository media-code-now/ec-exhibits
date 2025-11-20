#!/usr/bin/env node

/**
 * Seed Test User Script
 * 
 * Creates a test user in Neon Postgres database
 * 
 * Usage: node seedUser.js
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from './lib/db.js';

const SALT_ROUNDS = 10;

async function seedTestUser() {
  console.log('🌱 Seeding test user...\n');

  try {
    // Test user data
    const testUser = {
      email: 'matan@ec-exhibits.com',
      password: 'Password123!',
      displayName: 'Test User',
      role: 'owner' // Change to 'staff' or 'client' if needed
    };

    console.log('📋 Test user details:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Name: ${testUser.displayName}`);
    console.log(`   Role: ${testUser.role}`);
    console.log('');

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await prisma.user.findUnique({
      where: { email: testUser.email }
    });

    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.displayName}`);
      console.log('');
      console.log('💡 To recreate the user, delete it first:');
      console.log(`   DELETE FROM users WHERE email = '${testUser.email}';`);
      process.exit(0);
    }

    console.log('✅ User does not exist, creating...\n');

    // Hash the password
    console.log('🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(testUser.password, SALT_ROUNDS);
    console.log('✅ Password hashed\n');

    // Create the user
    console.log('💾 Creating user in database...');
    const newUser = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash: passwordHash,
        displayName: testUser.displayName,
        role: testUser.role
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('✅ User created successfully!\n');
    console.log('📊 User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:           ${newUser.id}`);
    console.log(`Email:        ${newUser.email}`);
    console.log(`Name:         ${newUser.displayName}`);
    console.log(`Role:         ${newUser.role}`);
    console.log(`Created At:   ${newUser.createdAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔑 Login Credentials:');
    console.log(`   Email:    ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log('');

    console.log('🧪 Test with curl:');
    console.log(`   curl -X POST http://localhost:4000/auth/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"${testUser.email}","password":"${testUser.password}"}'`);
    console.log('');

    console.log('✨ Done!');

  } catch (error) {
    console.error('❌ Error seeding user:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from database
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTestUser();
