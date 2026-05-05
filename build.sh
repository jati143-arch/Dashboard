#!/bin/sh
set -e

echo "==> Installing client dependencies..."
cd client
npm install
echo "==> Building client..."
npm run build
cd ..

echo "==> Installing server dependencies..."
cd server
npm install
cd ..

echo "==> Build complete!"
