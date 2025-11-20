# Quick Setup Script for .env file
# This script helps you set up all required environment variables

Write-Host "`n🔧 Secure Solana Wallet - Environment Setup" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

# Check if .env exists
$envFile = ".env"
$envExists = Test-Path $envFile

if ($envExists) {
    Write-Host "`n⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to update it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "`n❌ Setup cancelled." -ForegroundColor Red
        exit
    }
}

# Generate JWT Secret
Write-Host "`n📝 Generating JWT Secret..." -ForegroundColor Green
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$jwtSecret = [System.BitConverter]::ToString($bytes).Replace("-", "").ToLower()
Write-Host "✅ JWT Secret generated!" -ForegroundColor Green

# Database URL - User must provide their own
Write-Host "`n🗄️  Database Configuration" -ForegroundColor Yellow
Write-Host "You need to provide your PostgreSQL database connection string." -ForegroundColor Gray
Write-Host "Format: postgres://username:password@host:port/database?sslmode=require" -ForegroundColor Gray
Write-Host "Example: postgres://user:pass@localhost:5432/solana_wallet?sslmode=require" -ForegroundColor Gray
$dbUrl = Read-Host "Enter DATABASE_URL (or press Enter to skip and set manually later)"

# Helius RPC - User must provide their own API key
Write-Host "`n🔗 Helius RPC Configuration" -ForegroundColor Yellow
Write-Host "Get your free Helius API key from: https://www.helius.dev/" -ForegroundColor Gray
$heliusKey = Read-Host "Enter Helius API Key (or press Enter to use public Solana RPC)"
$heliusApi = "https://api-mainnet.helius-rpc.com"

if ($heliusKey) {
    $heliusRpc = "https://mainnet.helius-rpc.com/?api-key=$heliusKey"
} else {
    Write-Host "⚠️  Using public Solana RPC (rate limited)" -ForegroundColor Yellow
    $heliusRpc = "https://api.mainnet-beta.solana.com"
    $heliusKey = ""
}

# PhishTank API (optional)
Write-Host "`n🔐 PhishTank API Key (Optional but Recommended)" -ForegroundColor Yellow
Write-Host "Get it free from: https://www.phishtank.com/api_register.php" -ForegroundColor Gray
$phishtankKey = Read-Host "Enter PhishTank API Key (or press Enter to skip)"

# Create .env content
$envContent = @"
# Database Connection
# IMPORTANT: Replace with your own PostgreSQL database URL
# Format: postgres://username:password@host:port/database?sslmode=require
DATABASE_URL="$dbUrl"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (Auto-generated - keep this secret!)
JWT_SECRET=$jwtSecret

# Solana RPC Configuration
# Get your free API key from https://www.helius.dev/
SOLANA_RPC_URL=$heliusRpc
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com

# Helius RPC Configuration (Optional - for enhanced features)
HELIUS_RPC_URL=$heliusRpc
HELIUS_API_URL=$heliusApi
HELIUS_API_KEY=$heliusKey

# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Secure Solana Wallet
WEBAUTHN_ORIGIN=http://localhost:3000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
"@

# Add PhishTank if provided
if ($phishtankKey) {
    $envContent = $envContent + [Environment]::NewLine + "# PhishTank API (Optional)" + [Environment]::NewLine + "PHISHTANK_API_KEY=$phishtankKey" + [Environment]::NewLine
}

# Write to file
$envContent | Out-File -FilePath $envFile -Encoding utf8

Write-Host "`n✅ .env file created/updated successfully!" -ForegroundColor Green
Write-Host "`n📋 Summary:" -ForegroundColor Cyan
if ($dbUrl) {
    Write-Host "  ✅ Database: Configured" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Database: Not configured - you must set DATABASE_URL manually" -ForegroundColor Yellow
}
Write-Host "  ✅ JWT Secret: Generated" -ForegroundColor Green
if ($heliusKey) {
    Write-Host "  ✅ Helius RPC: Configured" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Helius RPC: Using public Solana RPC (rate limited)" -ForegroundColor Yellow
    Write-Host "     Get free API key from: https://www.helius.dev/" -ForegroundColor Gray
}
Write-Host "  ✅ WebAuthn: Configured" -ForegroundColor Green
if ($phishtankKey) {
    Write-Host "  ✅ PhishTank API: Configured" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  PhishTank API: Not configured (optional)" -ForegroundColor Yellow
    Write-Host "     Get it from: https://www.phishtank.com/api_register.php" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Ready to start the server!" -ForegroundColor Green
Write-Host "   Run: npm run dev" -ForegroundColor White
Write-Host ""

