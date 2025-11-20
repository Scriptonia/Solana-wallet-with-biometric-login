# Secure Solana Wallet - Setup Guide

This guide will help you set up and run the Secure Solana Wallet application on localhost.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

## Project Structure

```
secure-solana-wallet-with-biometric-login-and-advanced-safe-mode/
├── backend/          # Node.js/Express backend
├── frontend/         # Next.js frontend
└── db/              # Database migrations and schema
```

## Setup Instructions

### 1. Database Setup

First, create a PostgreSQL database:

```sql
CREATE DATABASE solana_wallet_db;
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the backend directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/solana_wallet_db"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-change-this-in-production
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=Secure Solana Wallet
WEBAUTHN_ORIGIN=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. You'll be redirected to the login page
3. Enter a Solana public key (you can generate one for testing)
4. Click "Login with Biometrics" to authenticate using your device's biometric authentication
5. Once logged in, you'll see the dashboard with your wallet balance and Safe Mode status

## Features

- **Biometric Authentication**: Uses WebAuthn for secure biometric login
- **Safe Mode**: Automatically flags and blocks suspicious transactions
- **Transaction Simulation**: Preview transactions before signing
- **Phishing Prevention**: URL and address validation
- **Wallet Management**: View balances, tokens, and transaction history

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check that the DATABASE_URL in `.env` is correct
- Verify database credentials

### WebAuthn/Biometric Issues

- Ensure you're using HTTPS or localhost (required for WebAuthn)
- Check browser compatibility (Chrome, Firefox, Safari support WebAuthn)
- Some browsers may require user interaction before showing biometric prompts

### Port Conflicts

- If port 3000 or 3001 is already in use, change the ports in the respective `.env` files

## Development Notes

- Backend API runs on port 3001
- Frontend runs on port 3000
- Database migrations are managed via Prisma
- All sensitive data is encrypted and never stored in plain text

## Security Considerations

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Enable HTTPS in production
- Regularly update dependencies for security patches



