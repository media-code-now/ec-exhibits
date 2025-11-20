#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting EC-Exhibits Application..."
echo "===================================="
echo ""

# Kill any existing processes on ports 4000 and 5173
echo "Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
echo "Starting backend server on port 4000..."
cd "$SCRIPT_DIR/server"
node index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 2

# Start frontend
echo "Starting frontend server on port 5173..."
cd "$SCRIPT_DIR/client"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
sleep 3

echo ""
echo "===================================="
echo "✅ Servers started successfully!"
echo "===================================="
echo ""
echo "Backend:  http://localhost:4000 (PID: $BACKEND_PID)"
echo "Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "Backend logs:  tail -f /tmp/backend.log"
echo "Frontend logs: tail -f /tmp/frontend.log"
echo ""
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running
wait
