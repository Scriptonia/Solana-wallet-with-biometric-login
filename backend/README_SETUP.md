# Backend Setup - Quick Start

## ✅ Files Created

1. **`QUICK_SETUP_ENV.ps1`** - Automated setup script (RECOMMENDED)
2. **`generate-jwt-secret.ps1`** - Generate JWT secret only
3. **`generate-jwt-secret.js`** - Node.js version
4. **`API_KEYS_SETUP.md`** - Complete documentation

## 🚀 Easiest Way to Setup

### Run the Quick Setup Script:

```powershell
cd backend
.\QUICK_SETUP_ENV.ps1
```

This will:
- ✅ Automatically generate JWT secret
- ✅ Set up all environment variables
- ✅ Ask for PhishTank API key (optional)
- ✅ Create/update your `.env` file

## 📝 Manual Setup

### Step 1: Generate JWT Secret

**Option A - PowerShell:**
```powershell
.\generate-jwt-secret.ps1
```

**Option B - Node.js:**
```bash
node generate-jwt-secret.js
```

Copy the generated secret.

### Step 2: Get PhishTank API Key (Optional)

1. Visit: https://www.phishtank.com/api_register.php
2. Sign up (free)
3. Verify email
4. Log in and get your API key
5. Copy the API key

### Step 3: Update .env File

Add these to your `backend/.env` file:

```env
JWT_SECRET=your-generated-secret-here
PHISHTANK_API_KEY=your-phishtank-api-key-here
```

## ✅ What's Already Configured

- ✅ Database (Prisma)
- ✅ Helius RPC
- ✅ WebAuthn (no API key needed)

## 🎯 Next Steps

After running the setup script:

1. Start the backend:
   ```powershell
   npm run dev
   ```

2. The server will run on: http://localhost:3001

3. Test the health endpoint:
   ```powershell
   curl http://localhost:3001/health
   ```

## 📚 More Information

See `API_KEYS_SETUP.md` for detailed documentation.



