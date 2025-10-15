#!/usr/bin/env bash
set -euo pipefail

# Build helper for CI/Netlify to embed a short commit SHA into Vite-built app
# Usage (when base directory is client):
#   Build command: bash build.sh

# Compute short git SHA if available, otherwise fall back to 'dev'
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BUILD_SHA=$(git rev-parse --short HEAD)
else
  BUILD_SHA=dev
fi

export VITE_BUILD_SHA="$BUILD_SHA"
echo "VITE_BUILD_SHA=$VITE_BUILD_SHA"

# Run the regular Vite build
npm run build
