#!/bin/bash

# Remove unnecessary files
echo "Cleaning up unnecessary files..."

# Remove Vite's README
rm -f frontend/client/README.md

# Remove .vite cache folders
find . -name ".vite" -type d -exec rm -rf {} +

# Remove dist folders (will be regenerated)
find . -name "dist" -type d -exec rm -rf {} +
find . -name "dist-ssr" -type d -exec rm -rf {} +

# Remove log files
find . -name "*.log" -type f -delete

# Remove .DS_Store files (Mac)
find . -name ".DS_Store" -type f -delete

# Remove node_modules if you want to reinstall fresh
# find . -name "node_modules" -type d -exec rm -rf {} +

echo "Cleanup complete!"
echo "Run 'npm install' in both backend and frontend/client to reinstall dependencies if needed"
