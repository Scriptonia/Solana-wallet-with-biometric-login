# PowerShell script to start the Secure Solana Wallet

Write-Host "Starting Secure Solana Wallet..." -ForegroundColor Green

# Check if PostgreSQL is running (you may need to adjust this)
$pgRunning = $false
try {
    $pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
    $pgRunning = $pgTest
} catch {
    $pgRunning = $false
}

if (-not $pgRunning) {
    Write-Host "Starting PostgreSQL with Docker..." -ForegroundColor Yellow
    docker-compose up -d postgres
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Start backend
Write-Host "Setting up backend..." -ForegroundColor Cyan
Set-Location backend

if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env -ErrorAction SilentlyContinue
    Write-Host "Please update .env with your database credentials" -ForegroundColor Yellow
}

if (-not (Test-Path node_modules)) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "Running database migrations..." -ForegroundColor Cyan
npx prisma migrate dev --name init

Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
$backendProcess = $true

Set-Location ../frontend

# Start frontend
Write-Host "Setting up frontend..." -ForegroundColor Cyan

if (-not (Test-Path .env.local)) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    @"
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
"@ | Out-File -FilePath .env.local -Encoding utf8
}

if (-not (Test-Path node_modules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "Backend running on http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend running on http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to stop servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Set-Location ..



