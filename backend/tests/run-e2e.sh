#!/bin/bash

# End-to-End Test Runner Script
# This script runs the complete E2E test suite

echo ""
echo "🧪 Secure Solana Wallet - E2E Test Runner"
echo "=============================================================="

# Check if backend server is running
echo ""
echo "📡 Checking backend server..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not responding"
    echo "   Please start the backend server first: cd backend && npm run dev"
    exit 1
fi

# Check if .env file exists
echo ""
echo "🔐 Checking environment configuration..."
if [ ! -f "../.env" ]; then
    echo "⚠️  .env file not found"
    echo "   Some tests may fail without proper configuration"
else
    echo "✅ .env file found"
fi

# Run tests
echo ""
echo "🚀 Running E2E tests..."
echo "=============================================================="

# Set API base URL for tests
export API_BASE_URL="http://localhost:3001"

# Run Jest
npm test -- e2e.test.ts

echo ""
echo "📊 Test execution completed"
echo "=============================================================="
echo ""
echo "💡 Note: Some tests may show warnings about WebAuthn mocks"
echo "   This is expected - real WebAuthn requires browser interaction"
echo "   See tests/manual-browser-test.md for full browser testing guide"
echo ""

