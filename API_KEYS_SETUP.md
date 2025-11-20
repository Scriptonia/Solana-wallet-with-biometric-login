# API Keys & Secrets Setup Guide

This guide helps you get all the required API keys and secrets for the Secure Solana Wallet.

## ✅ 1. JWT Secret (REQUIRED)

**What it is:** A random secret string used to sign and verify JWT tokens for authentication.

**How to generate:**

### Option A: Using PowerShell Script (Easiest - Windows)
```powershell
cd backend
.\generate-jwt-secret.ps1
```

### Option B: Using Node.js Script
```bash
cd backend
node generate-jwt-secret.js
```

### Option C: Using Quick Setup Script (Recommended)
```powershell
cd backend
.\QUICK_SETUP_ENV.ps1
```
This will generate JWT secret AND set up your entire .env file!

### Option D: Using OpenSSL (Linux/Mac)
```bash
openssl rand -hex 32
```

### Option E: Online Generator
Visit: https://generate-secret.vercel.app/32
- Set length to 64 characters
- Copy the generated string

### Option F: Manual PowerShell Command
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Add to `.env`:**
```env
JWT_SECRET=your-generated-secret-here-minimum-32-characters
```

---

## ✅ 2. PhishTank API Key (OPTIONAL - But Recommended)

**What it is:** API key for PhishTank phishing database to enhance URL/domain validation.

**Why it's useful:** 
- Detects known phishing websites
- Enhances Safe Mode phishing protection
- Real-time threat detection

**How to get it (FREE):**

### Step 1: Sign Up
1. Go to: **https://www.phishtank.com/api_register.php**
2. Fill out the registration form:
   - Username
   - Email address
   - Password
   - Agree to terms
3. Click "Register"

### Step 2: Verify Email
- Check your email for verification link
- Click the verification link

### Step 3: Get API Key
1. Log in to PhishTank: **https://www.phishtank.com/login.php**
2. Go to: **https://www.phishtank.com/api_register.php** (while logged in)
3. You'll see your API key displayed
4. Copy the API key

### Step 4: Add to `.env`
```env
PHISHTANK_API_KEY=your-phishtank-api-key-here
```

**Free Tier Limits:**
- 10,000 requests per day
- More than enough for development and moderate production use

**Alternative:** If you don't want to sign up, the app will still work but with reduced phishing detection (uses heuristics only).

---

## ✅ 3. WebAuthn (NO API KEY NEEDED)

**What it is:** Web Authentication API built into modern browsers.

**Status:** ✅ Already configured - No API key needed!

**How it works:**
- Uses browser's built-in biometric authentication
- Works with:
  - Fingerprint (Android, Windows)
  - Face ID (iOS, Windows Hello)
  - Touch ID (macOS)
  - Windows Hello
- No external service required

**Configuration in `.env`:**
```env
WEBAUTHN_RP_ID=localhost          # For development
WEBAUTHN_RP_NAME=Secure Solana Wallet
WEBAUTHN_ORIGIN=http://localhost:3000
```

**For Production:**
- Change `WEBAUTHN_RP_ID` to your domain (e.g., `wallet.yourdomain.com`)
- Change `WEBAUTHN_ORIGIN` to your production URL (e.g., `https://wallet.yourdomain.com`)

---

## 📋 Complete `.env` Template

Here's a complete `.env` file template with all configurations:

```env
# Database Connection
# IMPORTANT: Replace with your own PostgreSQL database URL
# You can use a local PostgreSQL instance or a cloud service like:
# - Supabase (free tier available): https://supabase.com
# - Neon (free tier available): https://neon.tech
# - Railway (free tier available): https://railway.app
# - Or any PostgreSQL database
# Format: postgres://username:password@host:port/database?sslmode=require
DATABASE_URL="postgres://username:password@localhost:5432/solana_wallet?sslmode=require"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (GENERATE THIS - see above)
# Use the provided scripts or: openssl rand -hex 32
JWT_SECRET=your-generated-jwt-secret-minimum-32-characters

# Solana RPC Configuration
# Get your free Helius API key from: https://www.helius.dev/
# Or use public Solana RPC (rate limited): https://api.mainnet-beta.solana.com
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com

# Helius RPC Configuration (Optional - for enhanced features)
# Get your free API key from: https://www.helius.dev/
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_API_URL=https://api-mainnet.helius-rpc.com
HELIUS_API_KEY=YOUR_HELIUS_API_KEY

# WebAuthn (No API key needed ✅)
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Secure Solana Wallet
WEBAUTHN_ORIGIN=http://localhost:3000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# PhishTank API (OPTIONAL - Get from https://www.phishtank.com/api_register.php)
PHISHTANK_API_KEY=your-phishtank-api-key-here
```

---

## 🚀 Quick Setup Steps

### Easiest Method (Recommended):
```powershell
cd backend
.\QUICK_SETUP_ENV.ps1
```
This script will:
- ✅ Generate JWT secret automatically
- ✅ Set up all environment variables
- ✅ Ask for PhishTank API key (optional)
- ✅ Create/update .env file

### Manual Method:
1. **Generate JWT Secret:**
   ```powershell
   cd backend
   .\generate-jwt-secret.ps1
   ```
   Copy the output and add to `.env`

2. **Get PhishTank API (Optional but Recommended):**
   - Visit: https://www.phishtank.com/api_register.php
   - Sign up (free)
   - Copy API key
   - Add to `.env`

3. **WebAuthn:** Already configured - no action needed!

4. **Verify `.env` file:**
   - Make sure all required fields are filled
   - JWT_SECRET is at least 32 characters
   - Save the file

5. **Test the setup:**
   ```bash
   npm run dev
   ```

---

## 🔒 Security Notes

- **Never commit `.env` file to Git** (already in `.gitignore`)
- **JWT Secret:** Use a strong, random string (minimum 32 characters)
- **PhishTank API Key:** Keep it secret, don't share publicly
- **Production:** Use different secrets/keys for production environment

---

## ❓ Troubleshooting

### JWT Secret Issues
- **Error:** "JWT_SECRET is not defined"
  - **Fix:** Make sure JWT_SECRET is in `.env` file
  - **Fix:** Restart the server after adding to `.env`

### PhishTank API Issues
- **Error:** "PhishTank API error"
  - **Fix:** Verify API key is correct
  - **Fix:** Check if you've exceeded daily limit (10,000 requests)
  - **Note:** App works without PhishTank, just with reduced phishing detection

### WebAuthn Issues
- **Error:** "WebAuthn not supported"
  - **Fix:** Use a modern browser (Chrome, Firefox, Safari, Edge)
  - **Fix:** Ensure you're using HTTPS or localhost (required for WebAuthn)

---

## 📞 Need Help?

- **JWT Secret:** Use the provided scripts above
- **PhishTank:** Visit https://www.phishtank.com/developer_info.php
- **WebAuthn:** Built into browsers - no setup needed



