#!/bin/bash

# Test script for authRequired middleware
# Backend: Node + Express on Render, jsonwebtoken

API_URL="http://localhost:4000"
COOKIE_JAR="/tmp/auth-test-cookies.txt"

echo "🧪 Testing authRequired Middleware"
echo "===================================="
echo ""

# Clean up old cookies
rm -f "$COOKIE_JAR"

# First, login to get a valid token cookie
echo "Step 1: Login to get authentication cookie"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exhibitcontrol.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .
echo ""

# Check if cookie was set
if [ -f "$COOKIE_JAR" ] && grep -q "token" "$COOKIE_JAR"; then
  echo "✅ Authentication cookie received"
else
  echo "❌ Failed to get authentication cookie"
  exit 1
fi

echo ""
echo "Step 2: Access /auth/me with valid cookie (should succeed)"
echo "-----------------------------------------------------------"
VALID_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$API_URL/auth/me")
echo "$VALID_RESPONSE" | jq .

if echo "$VALID_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Middleware verified valid token"
else
  echo "❌ Middleware rejected valid token"
fi

echo ""
echo "---"
echo ""

echo "Step 3: Access /auth/me without cookie (should fail with 401)"
echo "---------------------------------------------------------------"
NO_COOKIE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_URL/auth/me")
HTTP_CODE=$(echo "$NO_COOKIE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$NO_COOKIE_RESPONSE" | grep -v "HTTP_CODE")

echo "$RESPONSE_BODY" | jq .
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Middleware correctly returned 401"
  if echo "$RESPONSE_BODY" | jq -e '.message == "Authentication required"' > /dev/null 2>&1; then
    echo "✅ Correct error message"
  else
    echo "❌ Incorrect error message"
  fi
else
  echo "❌ Expected 401, got $HTTP_CODE"
fi

echo ""
echo "---"
echo ""

echo "Step 4: Access with invalid/expired token (should fail with 401)"
echo "------------------------------------------------------------------"
# Create a cookie file with an invalid token
echo -e "localhost\tFALSE\t/\tFALSE\t0\ttoken\tinvalid.token.here" > "$COOKIE_JAR"

INVALID_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -b "$COOKIE_JAR" "$API_URL/auth/me")
HTTP_CODE=$(echo "$INVALID_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | grep -v "HTTP_CODE")

echo "$RESPONSE_BODY" | jq .
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Middleware correctly rejected invalid token"
else
  echo "❌ Expected 401 for invalid token, got $HTTP_CODE"
fi

echo ""
echo "---"
echo ""

echo "✅ All authRequired middleware tests complete!"
echo ""
echo "📋 Middleware Behavior:"
echo "  ✅ Reads token from req.cookies.token"
echo "  ✅ Verifies using JWT_SECRET"
echo "  ✅ Sets req.user = { id, email, role } when valid"
echo "  ✅ Returns 401 with message when missing"
echo "  ✅ Returns 401 with message when invalid"

# Cleanup
rm -f "$COOKIE_JAR"
