#!/bin/sh
set -e

echo "==> Installing Python dependencies for MoneyControl/NSE data..."
pip install -r python/requirements.txt --quiet

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
