# PowerShell script to generate JWT Secret
# Run: .\generate-jwt-secret.ps1

Write-Host "`n✅ Generating JWT Secret..." -ForegroundColor Green

# Generate 64-character random hex string (256 bits)
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$jwtSecret = [System.BitConverter]::ToString($bytes).Replace("-", "").ToLower()

Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host $jwtSecret -ForegroundColor Yellow
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "`n📝 Add this to your .env file as:" -ForegroundColor Green
Write-Host "JWT_SECRET=$jwtSecret`n" -ForegroundColor White



