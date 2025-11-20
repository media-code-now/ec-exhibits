#!/bin/bash

# Test Production Backend Script
# Tests if the backend is properly connected to database and ready to use

echo "🧪 Testing EC-Exhibits Production Backend"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="https://ec-exhibits.onrender.com"

# Test 1: Database Connection
echo "1️⃣  Testing database connection..."
DB_RESPONSE=$(curl -s "$BACKEND_URL/db/test")
if echo "$DB_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Database connected${NC}"
    echo "$DB_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "$DB_RESPONSE" | jq '.'
    echo ""
    echo -e "${YELLOW}⚠️  Backend might still be deploying. Wait 2-3 minutes and try again.${NC}"
    exit 1
fi

echo ""

# Test 2: Register User (if needed)
echo "2️⃣  Checking if test user exists..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"matan@ec-exhibits.com","password":"Password123!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ User already exists and login works!${NC}"
    echo "$LOGIN_RESPONSE" | jq '.user'
else
    echo -e "${YELLOW}⚠️  User doesn't exist, attempting to register...${NC}"
    
    REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email":"matan@ec-exhibits.com",
            "password":"Password123!",
            "displayName":"Matan",
            "role":"owner"
        }')
    
    if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ User registered successfully!${NC}"
        echo "$REGISTER_RESPONSE" | jq '.user'
    else
        echo -e "${RED}❌ Registration failed${NC}"
        echo "$REGISTER_RESPONSE" | jq '.'
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✨ Production backend is ready!${NC}"
echo ""
echo "🔑 Login Credentials:"
echo "   Email:    matan@ec-exhibits.com"
echo "   Password: Password123!"
echo ""
echo "🌐 Try logging in at: https://ec-exhibits.netlify.app"
