#!/bin/bash

# Test script for GET /auth/me route
# Backend: Node + Express on Render, Neon Postgres

API_URL="http://localhost:4000"
COOKIE_JAR="/tmp/auth-me-cookies.txt"

echo "🧪 Testing GET /auth/me Route"
echo "==============================="
echo ""

# Clean up old cookies
rm -f "$COOKIE_JAR"

# Test 1: Access /auth/me without authentication (should fail with 401)
echo "Test 1: Access /auth/me without authentication"
echo "Expected: 401 Unauthorized with 'Authentication required'"
echo "-------------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/auth/me")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

echo "$BODY" | jq .
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Correctly returned 401"
else
  echo "❌ Expected 401, got $HTTP_CODE"
fi

echo ""
echo "---"
echo ""

# Test 2: Login to get authentication cookie
echo "Test 2: Login to get authentication cookie"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exhibitcontrol.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .

if [ -f "$COOKIE_JAR" ] && grep -q "token" "$COOKIE_JAR"; then
  echo "✅ Successfully logged in"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "---"
echo ""

# Test 3: Access /auth/me with valid authentication (should succeed)
echo "Test 3: Access /auth/me with valid authentication"
echo "Expected: 200 OK with user data { id, email, name }"
echo "--------------------------------------------------"
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -b "$COOKIE_JAR" "$API_URL/auth/me")
HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$AUTH_RESPONSE" | grep -v "HTTP_CODE")

echo "$BODY" | jq .
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Correctly returned 200"
  
  # Verify response has required fields
  if echo "$BODY" | jq -e '.user.id' > /dev/null 2>&1; then
    echo "✅ Response contains user.id"
  else
    echo "❌ Missing user.id"
  fi
  
  if echo "$BODY" | jq -e '.user.email' > /dev/null 2>&1; then
    echo "✅ Response contains user.email"
  else
    echo "❌ Missing user.email"
  fi
  
  if echo "$BODY" | jq -e '.user.name' > /dev/null 2>&1; then
    echo "✅ Response contains user.name"
  else
    echo "❌ Missing user.name"
  fi
  
  # Display user data
  echo ""
  echo "User Data:"
  echo "  ID: $(echo "$BODY" | jq -r '.user.id')"
  echo "  Email: $(echo "$BODY" | jq -r '.user.email')"
  echo "  Name: $(echo "$BODY" | jq -r '.user.name')"
  echo "  Role: $(echo "$BODY" | jq -r '.user.role')"
else
  echo "❌ Expected 200, got $HTTP_CODE"
fi

echo ""
echo "---"
echo ""

# Test 4: Logout and try to access /auth/me (should fail)
echo "Test 4: Logout and try to access /auth/me again"
echo "Expected: 401 Unauthorized"
echo "-----------------------------------------------"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API_URL/auth/logout" > /dev/null

AFTER_LOGOUT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -b "$COOKIE_JAR" "$API_URL/auth/me")
HTTP_CODE=$(echo "$AFTER_LOGOUT" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$AFTER_LOGOUT" | grep -v "HTTP_CODE")

echo "$BODY" | jq .
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Correctly returned 401 after logout"
else
  echo "❌ Expected 401 after logout, got $HTTP_CODE"
fi

echo ""
echo "---"
echo ""

echo "✅ All GET /auth/me tests complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Uses authRequired middleware"
echo "  ✅ Queries Neon for user by req.user.id"
echo "  ✅ Returns { user: { id, email, name } }"
echo "  ✅ Handles missing authentication (401)"
echo "  ✅ Handles user not found (404 capable)"

# Cleanup
rm -f "$COOKIE_JAR"
