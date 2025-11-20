# Quick Start Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/) OR use Docker
3. **npm or yarn**

## Option 1: Using Docker (Recommended)

### Step 1: Start PostgreSQL

```bash
docker-compose up -d postgres
```

### Step 2: Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL: postgresql://postgres:postgres@localhost:5432/solana_wallet_db
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Step 3: Setup Frontend (New Terminal)

```bash
cd frontend
npm install
# Create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

### Step 4: Access Application

Open your browser to: **http://localhost:3000**

## Option 2: Using Scripts

### Windows (PowerShell)

```powershell
.\start.ps1
```

### Linux/Mac

```bash
chmod +x start.sh
./start.sh
```

## Manual Setup

### 1. Database Setup

Create PostgreSQL database:

```sql
CREATE DATABASE solana_wallet_db;
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
DATABASE_URL="postgresql://user:password@localhost:5432/solana_wallet_db"
PORT=3001
JWT_SECRET=your-secret-key-min-32-chars
SOLANA_RPC_URL=https://api.devnet.solana.com
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Start server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Start server
npm run dev
```

## Testing the Application

1. Navigate to http://localhost:3000
2. You'll see the login page
3. For testing, you can use any valid Solana public key format (base58, 32-44 characters)
4. Click "Login with Biometrics" - your browser will prompt for biometric authentication
5. Once authenticated, you'll see the dashboard

## Troubleshooting

### Database Connection Error

- Ensure PostgreSQL is running: `pg_isready` or check Docker container
- Verify DATABASE_URL in backend/.env matches your PostgreSQL setup
- Check PostgreSQL logs if using Docker: `docker-compose logs postgres`

### WebAuthn Not Working

- WebAuthn requires HTTPS or localhost (which we're using)
- Ensure you're using a modern browser (Chrome, Firefox, Edge, Safari)
- Some browsers require user interaction before showing biometric prompts

### Port Already in Use

- Backend default: 3001, change in backend/.env
- Frontend default: 3000, change by running: `npm run dev -- -p 3002`

### Prisma Errors

- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate reset` to reset database (WARNING: deletes all data)

## Next Steps

- Read the full README_SETUP.md for detailed information
- Check the API documentation in backend/apis/openapi.md
- Review the component documentation in frontend/components.md



