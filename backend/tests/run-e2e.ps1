# End-to-End Test Runner Script
# This script runs the complete E2E test suite

Write-Host "`n🧪 Secure Solana Wallet - E2E Test Runner" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

# Check if backend server is running
Write-Host "`n📡 Checking backend server..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "✅ Backend server is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend server returned status: $($healthCheck.StatusCode)" -ForegroundColor Red
        Write-Host "   Please start the backend server first: cd backend && npm run dev" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Backend server is not responding" -ForegroundColor Red
    Write-Host "   Please start the backend server first: cd backend && npm run dev" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
Write-Host "`n🔐 Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path "../.env")) {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "   Some tests may fail without proper configuration" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

# Run tests
Write-Host "`n🚀 Running E2E tests..." -ForegroundColor Yellow
Write-Host ("=" * 70) -ForegroundColor Cyan

# Set API base URL for tests
$env:API_BASE_URL = "http://localhost:3001"

# Run Jest
npm test -- e2e.test.ts

Write-Host "`n📊 Test execution completed" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "`n💡 Note: Some tests may show warnings about WebAuthn mocks" -ForegroundColor Yellow
Write-Host "   This is expected - real WebAuthn requires browser interaction" -ForegroundColor Yellow
Write-Host "   See tests/manual-browser-test.md for full browser testing guide`n" -ForegroundColor Yellow

