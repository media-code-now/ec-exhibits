#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   EC-Exhibits Portal - Neon Database Setup    ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo ""

# Step 1: Check if .env exists
echo -e "${GREEN}📋 Step 1: Checking environment file...${NC}"
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp server/.env.example server/.env
    echo -e "${GREEN}✅ Created server/.env${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi
echo ""

# Step 2: Instructions for Neon setup
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 2: Create Your Neon Database (2 min)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. Open your browser and go to:"
echo -e "   ${BLUE}https://console.neon.tech${NC}"
echo ""
echo "2. Sign up or log in (free tier available)"
echo ""
echo "3. Click ${GREEN}'New Project'${NC} button"
echo ""
echo "4. Project details:"
echo "   - Name: ${GREEN}ec-exhibits${NC}"
echo "   - Region: Choose closest to you"
echo "   - Postgres version: 15 or later"
echo ""
echo "5. After creation, click on your project"
echo ""
echo "6. Go to ${GREEN}'Dashboard'${NC} → ${GREEN}'Connection Details'${NC}"
echo ""
echo "7. Copy the connection string (it looks like this):"
echo -e "   ${YELLOW}postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require${NC}"
echo ""
read -p "Press ENTER when you have your connection string ready..."
echo ""

# Step 3: Get DATABASE_URL
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 3: Configure Database Connection        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "Paste your Neon DATABASE_URL here:"
read -p "DATABASE_URL: " db_url

if [ -z "$db_url" ]; then
    echo -e "${RED}❌ No URL provided. Exiting...${NC}"
    exit 1
fi

# Update .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" server/.env
else
    # Linux
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$db_url\"|g" server/.env
fi

echo -e "${GREEN}✅ DATABASE_URL saved to server/.env${NC}"
echo ""

# Step 4: Run SQL migrations
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 4: Run SQL Migrations in Neon           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "Now you need to create the database tables:"
echo ""
echo "1. Go back to Neon Console: ${BLUE}https://console.neon.tech${NC}"
echo ""
echo "2. Click on your ${GREEN}'ec-exhibits'${NC} project"
echo ""
echo "3. Click ${GREEN}'SQL Editor'${NC} in the left sidebar"
echo ""
echo "4. Run FIRST migration (creates tables):"
echo "   - Open: ${YELLOW}server/migrations/001_initial_schema.sql${NC}"
echo "   - Copy ALL contents"
echo "   - Paste into Neon SQL Editor"
echo "   - Click ${GREEN}'Run'${NC} button"
echo "   - Wait for success message"
echo ""
read -p "Press ENTER when first migration is complete..."
echo ""

echo "5. Run SECOND migration (adds demo data):"
echo "   - Open: ${YELLOW}server/migrations/002_seed_demo_data.sql${NC}"
echo "   - Copy ALL contents"
echo "   - Paste into Neon SQL Editor"
echo "   - Click ${GREEN}'Run'${NC} button"
echo "   - Wait for success message"
echo ""
read -p "Press ENTER when second migration is complete..."
echo ""

# Step 5: Install dependencies and generate Prisma
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 5: Generate Prisma Client               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

cd server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

echo -e "${GREEN}🔧 Generating Prisma Client...${NC}"
npx prisma generate

echo ""
echo -e "${GREEN}✅ Prisma Client generated successfully!${NC}"
echo ""

# Step 6: Test connection
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Step 6: Test Database Connection             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}🔍 Testing database connection...${NC}"

# Create test script
cat > test-connection.js << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    const users = await prisma.user.findMany();
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(u => console.log(`   - ${u.displayName} (${u.email}) [${u.role}]`));
    
    const projects = await prisma.project.findMany();
    console.log(`\n✅ Found ${projects.length} projects:`);
    projects.forEach(p => console.log(`   - ${p.name}`));
    
    const templates = await prisma.template.findMany();
    console.log(`\n✅ Found ${templates.length} templates:`);
    templates.forEach(t => console.log(`   - ${t.name} (${t.stageCount} stages)`));
    
    await prisma.$disconnect();
    console.log('\n✅ Database connection successful!');
    console.log('🎉 Your Neon database is ready to use!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    await prisma.$disconnect();
    return false;
  }
}

testConnection();
EOF

node test-connection.js
TEST_RESULT=$?

# Clean up test script
rm test-connection.js

echo ""

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          🎉 Setup Complete!                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✅ Your Neon database is configured and working!${NC}"
    echo ""
    echo "Demo users (password: ${GREEN}demo123${NC}):"
    echo "  - olivia@exhibitcontrol.com (Owner)"
    echo "  - samuel@exhibitcontrol.com (Staff)"
    echo "  - cameron@client.com (Client)"
    echo ""
    echo "Next steps:"
    echo "  1. Start the backend: ${BLUE}cd server && npm run dev${NC}"
    echo "  2. Start the frontend: ${BLUE}cd client && npm run dev${NC}"
    echo "  3. Visit: ${BLUE}http://localhost:5173${NC}"
    echo ""
    echo "Browse database: ${BLUE}cd server && npx prisma studio${NC}"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          ⚠️  Setup Failed                      ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check DATABASE_URL in server/.env"
    echo "2. Verify migrations ran successfully in Neon"
    echo "3. Check Neon project is active (not suspended)"
    echo "4. Try running: cd server && npx prisma db push"
    echo ""
    echo "Need help? Check: DATABASE_SETUP.md"
    echo ""
fi
