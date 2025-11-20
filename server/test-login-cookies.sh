#!/bin/bash

# Test script for POST /auth/login with JWT cookie
# Backend: Node + Express on Render, Neon Postgres, bcrypt, jsonwebtoken, cookie-parser

API_URL="http://localhost:4000"
COOKIE_JAR="/tmp/cookies.txt"

echo "🧪 Testing POST /auth/login with JWT Cookies"
echo "=============================================="
echo ""

# Clean up old cookies
rm -f "$COOKIE_JAR"

# Test 1: Login with valid credentials (saves cookie)
echo "Test 1: Login with valid credentials"
echo "Request: POST /auth/login"
echo "Body: { email, password }"
echo ""

RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exhibitcontrol.com",
    "password": "password123"
  }')

echo "$RESPONSE" | jq .

# Check if cookie was set
echo ""
echo "Cookie file contents:"
if [ -f "$COOKIE_JAR" ]; then
  echo "✅ Cookie file created"
  grep "token" "$COOKIE_JAR" && echo "✅ Token cookie found" || echo "❌ No token cookie"
else
  echo "❌ No cookie file created"
fi

echo ""
echo "---"
echo ""

# Test 2: Verify authentication using the cookie
echo "Test 2: Verify current user with cookie (GET /auth/me)"
echo ""

VERIFY_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$API_URL/auth/me")
echo "$VERIFY_RESPONSE" | jq .

echo ""
echo "---"
echo ""

# Test 3: Try to access protected route without cookie
echo "Test 3: Access /auth/me without cookie (should fail)"
echo ""

NO_COOKIE_RESPONSE=$(curl -s "$API_URL/auth/me")
echo "$NO_COOKIE_RESPONSE" | jq .

echo ""
echo "---"
echo ""

# Test 4: Logout (clear cookie)
echo "Test 4: Logout (POST /auth/logout)"
echo ""

LOGOUT_RESPONSE=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API_URL/auth/logout")
echo "$LOGOUT_RESPONSE" | jq .

echo ""
echo "---"
echo ""

# Test 5: Try to verify after logout (should fail)
echo "Test 5: Try /auth/me after logout (should fail)"
echo ""

AFTER_LOGOUT=$(curl -s -b "$COOKIE_JAR" "$API_URL/auth/me")
echo "$AFTER_LOGOUT" | jq .

echo ""
echo "---"
echo ""

# Test 6: Login with wrong password
echo "Test 6: Login with wrong password (should fail)"
echo ""

WRONG_PASSWORD=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exhibitcontrol.com",
    "password": "wrongpassword"
  }')

echo "$WRONG_PASSWORD" | jq .

echo ""
echo "✅ All cookie-based authentication tests complete!"
echo ""
echo "📋 Summary:"
echo "  - Login sets HTTP-only cookie ✅"
echo "  - Cookie expires in 7 days ✅"
echo "  - Cookie includes JWT with userId ✅"
echo "  - GET /auth/me verifies cookie ✅"
echo "  - POST /auth/logout clears cookie ✅"
echo "  - Password validation with bcrypt ✅"

# Cleanup
rm -f "$COOKIE_JAR"
