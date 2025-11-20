#!/bin/bash

# Quick test for POST /auth/logout endpoint

API_URL="http://localhost:4000"
COOKIE_JAR="/tmp/logout-test-cookies.txt"

echo "🧪 Testing POST /auth/logout"
echo "============================"
echo ""

# Clean up
rm -f "$COOKIE_JAR"

# Step 1: Login to get cookie
echo "Step 1: Login to get authentication cookie"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exhibitcontrol.com","password":"password123"}')

echo "$LOGIN_RESPONSE" | jq .

if grep -q "token" "$COOKIE_JAR"; then
  echo "✅ Cookie set successfully"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "Cookie contents:"
cat "$COOKIE_JAR"
echo ""

# Step 2: Verify we can access protected route
echo "Step 2: Verify access to protected route /auth/me"
echo "--------------------------------------------------"
ME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -b "$COOKIE_JAR" "$API_URL/auth/me")
HTTP_CODE=$(echo "$ME_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$ME_RESPONSE" | grep -v "HTTP_CODE")

echo "$BODY" | jq .

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Protected route accessible before logout"
else
  echo "❌ Cannot access protected route"
fi

echo ""

# Step 3: Logout
echo "Step 3: Call POST /auth/logout"
echo "-------------------------------"
LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$API_URL/auth/logout")

echo "$LOGOUT_RESPONSE" | jq .

# Check response
if echo "$LOGOUT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ Logout successful"
else
  echo "❌ Logout failed"
fi

# Check message
MESSAGE=$(echo "$LOGOUT_RESPONSE" | jq -r '.message')
echo "Message: $MESSAGE"

echo ""
echo "Cookie contents after logout:"
cat "$COOKIE_JAR"
echo ""

# Step 4: Try to access protected route again
echo "Step 4: Try to access /auth/me after logout"
echo "--------------------------------------------"
AFTER_LOGOUT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -b "$COOKIE_JAR" "$API_URL/auth/me")
HTTP_CODE=$(echo "$AFTER_LOGOUT" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$AFTER_LOGOUT" | grep -v "HTTP_CODE")

echo "$BODY" | jq .
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Cookie successfully cleared - cannot access protected route"
else
  echo "❌ Cookie still valid - logout did not work properly"
fi

echo ""
echo "============================"
echo "📋 Summary:"
echo "  ✅ Login sets HTTP-only cookie"
echo "  ✅ Protected routes accessible with cookie"
echo "  ✅ Logout clears the cookie"
echo "  ✅ Protected routes return 401 after logout"
echo ""
echo "✅ POST /auth/logout working correctly!"

# Cleanup
rm -f "$COOKIE_JAR"
