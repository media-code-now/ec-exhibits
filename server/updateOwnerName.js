#!/usr/bin/env node

/**
 * Update Owner Name Script
 * 
 * Updates the display name for the owner user in the database
 * 
 * Usage: node updateOwnerName.js
 */

import 'dotenv/config';
import prisma from './lib/db.js';

async function updateOwnerName() {
  console.log('🔄 Updating owner name...\n');

  try {
    const email = 'matan@ec-exhibits.com';
    const newDisplayName = 'Matan Yagil';

    // Check if user exists
    console.log('🔍 Looking for user...');
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!existingUser) {
      console.log('❌ User not found with email:', email);
      console.log('');
      console.log('💡 Run the seed script first:');
      console.log('   node seedUser.js');
      process.exit(1);
    }

    console.log('✅ User found!');
    console.log(`   ID: ${existingUser.id}`);
    console.log(`   Current name: ${existingUser.displayName}`);
    console.log(`   New name: ${newDisplayName}`);
    console.log('');

    // Update the user
    console.log('📝 Updating user...');
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { displayName: newDisplayName }
    });

    console.log('✅ User updated successfully!');
    console.log('');
    console.log('📋 Updated user details:');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Name: ${updatedUser.displayName}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log('');
    console.log('🎉 Done!');

  } catch (error) {
    console.error('❌ Error updating user:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateOwnerName();
