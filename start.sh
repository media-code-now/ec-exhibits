#!/bin/bash

echo "🚀 EC-Exhibits Portal - Quick Setup"
echo "===================================="
echo ""
echo "You have 2 options:"
echo ""
echo "1. 🌐 Use Neon (Production Database - Recommended)"
echo "   - Free tier available"
echo "   - Serverless PostgreSQL"
echo "   - 5 minutes to set up"
echo ""
echo "2. 🔄 Continue with Mock Data (Current Setup)"
echo "   - No database needed"
echo "   - Development only"
echo "   - Data resets on restart"
echo ""
read -p "Choose option (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "📋 STEP-BY-STEP NEON SETUP:"
    echo ""
    echo "1. Go to: https://console.neon.tech"
    echo "2. Click 'Sign Up' or 'Sign In'"
    echo "3. Create new project: 'ec-exhibits'"
    echo "4. Copy your connection string (looks like):"
    echo "   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
    echo ""
    echo "5. In Neon SQL Editor, run these 2 files:"
    echo "   a) server/migrations/001_initial_schema.sql"
    echo "   b) server/migrations/002_seed_demo_data.sql"
    echo ""
    echo "6. Come back here and paste your DATABASE_URL"
    echo ""
    read -p "Paste your Neon DATABASE_URL: " db_url
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=\".*\"|DATABASE_URL=\"$db_url\"|g" server/.env
    else
        # Linux
        sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"$db_url\"|g" server/.env
    fi
    
    echo ""
    echo "✅ DATABASE_URL saved to server/.env"
    echo ""
    echo "📦 Installing Prisma..."
    cd server && npx prisma generate
    
    echo ""
    echo "✅ Setup complete! Starting servers..."
    echo ""
    
    # Start backend
    npm run dev &
    BACKEND_PID=$!
    
    # Start frontend
    cd ../client && npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo "🎉 SERVERS RUNNING!"
    echo ""
    echo "Backend:  http://localhost:4000"
    echo "Frontend: http://localhost:5173"
    echo ""
    echo "Demo login:"
    echo "  Email: olivia@exhibitcontrol.com"
    echo "  Password: demo123"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    # Wait for user interrupt
    wait $BACKEND_PID $FRONTEND_PID
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo "✅ Continuing with mock data (current setup)"
    echo ""
    echo "Starting servers..."
    
    # Kill existing servers
    lsof -ti:4000 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    
    # Start backend
    cd server && npm run dev &
    BACKEND_PID=$!
    
    sleep 2
    
    # Start frontend  
    cd ../client && npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo "🎉 SERVERS RUNNING!"
    echo ""
    echo "Backend:  http://localhost:4000"
    echo "Frontend: http://localhost:5173"
    echo ""
    echo "Mock users (auto-login):"
    echo "  - Olivia Owner"
    echo "  - Samuel Staff"
    echo "  - Cameron Client"
    echo ""
    echo "⚠️  Data will reset when server restarts"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    # Wait for user interrupt
    wait $BACKEND_PID $FRONTEND_PID
else
    echo "Invalid choice. Please run again and select 1 or 2."
    exit 1
fi
