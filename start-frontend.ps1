# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Set-Location "frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
"@ | Out-File -FilePath ".env.local" -Encoding utf8
}

Write-Host "`nStarting Next.js development server..." -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000`n" -ForegroundColor Cyan

npm run dev



