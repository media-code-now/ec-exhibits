#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the client
echo "Building Vite app..."
npm run build

echo "Build complete! Output in dist/"
