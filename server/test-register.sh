#!/bin/bash

# Test script for POST /auth/register endpoint
# Backend: Node + Express on Render, Neon Postgres, bcrypt

API_URL="http://localhost:4000"

echo "🧪 Testing POST /auth/register Route"
echo "===================================="
echo ""

# Test 1: Register with all required fields
echo "Test 1: Register new user with email, password, name"
echo "Request: POST /auth/register"
echo "Body: { email, password, name (displayName), role }"
echo ""

curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123",
    "displayName": "John Doe",
    "role": "staff"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 2: Try to register with same email (should fail)
echo "Test 2: Try duplicate email (should fail validation)"
echo ""

curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "anotherPassword",
    "displayName": "John Smith"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 3: Missing email (should fail validation)
echo "Test 3: Missing email field (should fail validation)"
echo ""

curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "password123",
    "displayName": "Jane Doe"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 4: Missing password (should fail validation)
echo "Test 4: Missing password field (should fail validation)"
echo ""

curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "displayName": "Jane Doe"
  }' | jq .

echo ""
echo "---"
echo ""

# Test 5: Verify users in database
echo "Test 5: Verify users are in database"
echo ""

cd "$(dirname "$0")" || exit
node -e "
import prisma from './lib/db.js';

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true
    }
  });

  console.log('Users in database:');
  users.forEach(u => {
    console.log(\`  ✅ \${u.displayName} (\${u.email}) - Role: \${u.role}\`);
    console.log(\`     ID: \${u.id}\`);
    console.log(\`     Password hashed: \${u.passwordHash.substring(0, 20)}...\`);
  });
  
  await prisma.\$disconnect();
}

checkUsers();
"

echo ""
echo "✅ All tests complete!"
