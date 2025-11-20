#!/bin/bash

echo "Starting Secure Solana Wallet..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "Starting PostgreSQL with Docker..."
    docker-compose up -d postgres
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Start backend
echo "Starting backend server..."
cd backend
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env with your database credentials"
fi

npm install
npx prisma generate
npx prisma migrate dev --name init || true

# Start backend in background
npm run dev &
BACKEND_PID=$!

cd ../frontend

# Start frontend
echo "Starting frontend server..."
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
    echo "NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com" >> .env.local
fi

npm install
npm run dev &
FRONTEND_PID=$!

echo "Backend running on http://localhost:3001"
echo "Frontend running on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT
wait



