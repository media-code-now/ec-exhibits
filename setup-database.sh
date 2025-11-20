#!/bin/bash

echo "🚀 EC-Exhibits Portal - Database Setup Script"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env"
    echo ""
    echo "📝 IMPORTANT: Edit server/.env and add your Neon DATABASE_URL"
    echo "   Get it from: https://console.neon.tech"
    echo ""
    read -p "Press Enter after you've updated the DATABASE_URL in server/.env..."
fi

echo ""
echo "📦 Installing dependencies..."
cd server
npm install

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "📊 Database connection check..."
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run SQL migrations in Neon dashboard:"
echo "   - server/migrations/001_initial_schema.sql"
echo "   - server/migrations/002_seed_demo_data.sql (optional demo data)"
echo ""
echo "2. Start the server:"
echo "   cd server && npm run dev"
echo ""
echo "3. Browse database:"
echo "   npx prisma studio"
echo ""
