#!/bin/bash

echo "======================================================================"
echo "         🏥 BARA-AWLIA MEDICAL HALL PHARMACY SYSTEM"
echo "======================================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js (v18 or higher) from https://nodejs.org"
    exit 1
fi

# 2. Check dependencies
if [ ! -d "node_modules" ]; then
    echo "[1/3] First-time setup detected. Installing dependencies..."
    npm install
fi

# 3. Ensure environment & database
echo "[2/3] Verifying database and environment variables..."
node scripts/ensure-setup.mjs

# 4. Launch server
echo "[3/3] Starting server on port 3000..."
echo ""
echo "======================================================================"
echo " 🚀 SERVER IS STARTING!"
echo " 👉 Local Access:   http://localhost:3000"
echo " 🔑 Default Login:  ADMIN / PIN: 1234"
echo "======================================================================"
echo ""

# Open browser if supported
if command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open http://localhost:3000) &
elif command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:3000) &
fi

npm run dev
