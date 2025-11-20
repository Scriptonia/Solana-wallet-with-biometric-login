# Open Source Setup Guide

This project is open source and **all sensitive information has been removed**. You must provide your own API keys and credentials.

## 🔒 Security First

**IMPORTANT**: This repository does NOT contain:
- ❌ Database credentials
- ❌ API keys
- ❌ JWT secrets
- ❌ Any sensitive information

All sensitive data has been removed and replaced with placeholders or user prompts.

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd secure-solana-wallet-with-biometric-login-and-advanced-safe-mode
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Create `.env` File

Create a `.env` file in the `backend` directory with the following template:

```env
# Database Connection
# Get a free PostgreSQL database from:
# - Supabase: https://supabase.com (recommended)
# - Neon: https://neon.tech
# - Railway: https://railway.app
# Or use local PostgreSQL
DATABASE_URL="postgres://username:password@host:port/database?sslmode=require"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (REQUIRED)
# Generate using: openssl rand -hex 32
JWT_SECRET=your-generated-jwt-secret-minimum-32-characters

# Solana RPC Configuration
# Option 1: Public RPC (rate limited)
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Option 2: Helius RPC (recommended - get free API key from https://www.helius.dev/)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com

# Helius RPC Configuration (Optional)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_API_URL=https://api-mainnet.helius-rpc.com
HELIUS_API_KEY=YOUR_HELIUS_API_KEY

# WebAuthn Configuration
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Secure Solana Wallet
WEBAUTHN_ORIGIN=http://localhost:3000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# PhishTank API (Optional - get free key from https://www.phishtank.com/api_register.php)
PHISHTANK_API_KEY=your-phishtank-api-key-here
```

#### Use Setup Script (Easier)

```powershell
# Windows
cd backend
.\QUICK_SETUP_ENV.ps1

# The script will:
# - Generate JWT secret automatically
# - Prompt for database URL
# - Prompt for Helius API key
# - Prompt for PhishTank API key (optional)
# - Create .env file
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

#### Create `.env.local` File

Create a `.env.local` file in the `frontend` directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Solana RPC URL
# Option 1: Public RPC
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Option 2: Helius RPC (recommended)
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
```

### 4. Database Setup

#### Option A: Use Free Cloud Database (Recommended)

1. **Supabase** (Recommended)
   - Sign up at https://supabase.com
   - Create a new project
   - Copy the connection string from Settings > Database
   - Add to `DATABASE_URL` in `.env`

2. **Neon**
   - Sign up at https://neon.tech
   - Create a new project
   - Copy the connection string
   - Add to `DATABASE_URL` in `.env`

3. **Railway**
   - Sign up at https://railway.app
   - Create a new PostgreSQL database
   - Copy the connection string
   - Add to `DATABASE_URL` in `.env`

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL (if not installed)
# Then create database:
createdb solana_wallet

# Update DATABASE_URL in .env:
DATABASE_URL="postgres://username:password@localhost:5432/solana_wallet?sslmode=require"
```

#### Run Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 5. Get API Keys

#### Helius API Key (Recommended)

1. Sign up at https://www.helius.dev/
2. Get your free API key
3. Add to `.env`:
   ```env
   HELIUS_API_KEY=your-api-key-here
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-api-key-here
   HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-api-key-here
   ```

#### PhishTank API Key (Optional)

1. Sign up at https://www.phishtank.com/api_register.php
2. Get your free API key
3. Add to `.env`:
   ```env
   PHISHTANK_API_KEY=your-api-key-here
   ```

### 6. Start the Application

#### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

#### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 📋 Required vs Optional

### Required
- ✅ `DATABASE_URL` - PostgreSQL database connection
- ✅ `JWT_SECRET` - For authentication tokens
- ✅ `SOLANA_RPC_URL` - Solana RPC endpoint (can use public)

### Optional (but recommended)
- 🔶 `HELIUS_API_KEY` - Enhanced Solana RPC features
- 🔶 `PHISHTANK_API_KEY` - Phishing detection

## 🔒 Security Best Practices

1. **Never commit `.env` files**
   - Already in `.gitignore`
   - Double-check before committing

2. **Use different secrets for production**
   - Never use development secrets in production
   - Use secrets management services (AWS Secrets Manager, etc.)

3. **Rotate secrets periodically**
   - Change JWT_SECRET regularly
   - Rotate API keys if exposed

4. **Use strong passwords**
   - Database passwords should be strong
   - JWT_SECRET should be 32+ characters

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL

# If using local PostgreSQL
psql -U username -d solana_wallet
```

### API Key Issues

- **Helius**: Verify API key at https://www.helius.dev/
- **PhishTank**: Check API key at https://www.phishtank.com/

### Port Already in Use

```bash
# Change PORT in .env
PORT=3002
```

## 📚 Additional Resources

- [API Keys Setup Guide](./API_KEYS_SETUP.md)
- [Complete Setup Guide](./README_SETUP.md)
- [Workflow Documentation](./WORKFLOW.md)

## 🤝 Contributing

When contributing:
1. Never commit `.env` files
2. Never hardcode API keys or secrets
3. Use environment variables for all sensitive data
4. Update documentation if adding new environment variables

## 📝 License

This project is open source. See LICENSE file for details.

---

**Remember**: All sensitive information has been removed from this repository. You must provide your own credentials to run the application.

