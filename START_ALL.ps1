# Start Both Backend and Frontend Servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Secure Solana Wallet" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Kill existing processes
Write-Host "`nKilling existing processes on ports 3000-3004..." -ForegroundColor Yellow
$ports = @(3000, 3001, 3002, 3003, 3004)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2
Write-Host "All processes killed`n" -ForegroundColor Green

# Start Backend
Write-Host "Starting Backend Server (Port 3001)..." -ForegroundColor Cyan
Set-Location "backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Backend Server (Port 3001)' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
Set-Location ".."

# Start Frontend
Write-Host "`nStarting Frontend Server (Port 3000)..." -ForegroundColor Cyan
Set-Location "frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Frontend Server (Port 3000)' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal
Set-Location ".."

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Servers Starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nBackend: http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "`nWait 15-20 seconds for servers to start" -ForegroundColor Yellow
Write-Host "Then open: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nTwo PowerShell windows will open - one for each server" -ForegroundColor Gray



