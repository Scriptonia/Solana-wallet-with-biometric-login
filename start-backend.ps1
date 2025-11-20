# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Set-Location "backend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "Please run QUICK_SETUP_ENV.ps1 first" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStarting backend server..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:3001`n" -ForegroundColor Cyan

npm run dev



