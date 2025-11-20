# How to Start the Application

## ✅ Current Status

- **Backend**: ✅ Running on http://localhost:3001
- **Frontend**: ⏳ Starting on http://localhost:3000
- **Database**: ✅ Connected (Prisma)

## 🚀 Starting the Servers

### Backend (Terminal 1)

```powershell
cd secure-solana-wallet-with-biometric-login-and-advanced-safe-mode\backend
npm run dev
```

The backend will start on **http://localhost:3001**

### Frontend (Terminal 2)

```powershell
cd secure-solana-wallet-with-biometric-login-and-advanced-safe-mode\frontend
npm run dev
```

The frontend will start on **http://localhost:3000**

## 📋 Quick Checklist

- [x] Database connected (Prisma)
- [x] Backend dependencies installed
- [x] Frontend dependencies installed
- [x] .env file created (backend)
- [x] .env.local file created (frontend)
- [x] JWT secret generated
- [x] Helius RPC configured
- [x] TypeScript errors fixed

## 🌐 Access the Application

Once both servers are running:

1. **Frontend**: Open http://localhost:3000 in your browser
2. **Backend API**: http://localhost:3001/health (health check)

## 🔧 Troubleshooting

### Frontend shows "next is not recognized"
- **Solution**: Run `npm install` in the frontend directory

### Backend shows TypeScript errors
- **Solution**: All TypeScript errors have been fixed. If you see new errors, run `npx tsc --noEmit` to check.

### Port already in use
- **Backend**: Change `PORT=3001` in `backend/.env`
- **Frontend**: Run `npm run dev -- -p 3002` to use port 3002

## 📝 Environment Files

### Backend (.env)
- ✅ DATABASE_URL (Prisma)
- ✅ JWT_SECRET (auto-generated)
- ✅ SOLANA_RPC_URL (Helius)
- ✅ HELIUS_API_KEY
- ✅ WebAuthn config

### Frontend (.env.local)
- ✅ NEXT_PUBLIC_API_URL=http://localhost:3001
- ✅ NEXT_PUBLIC_SOLANA_RPC_URL

## 🎯 Next Steps

1. Wait for frontend to finish starting (usually 10-30 seconds)
2. Open http://localhost:3000
3. Test biometric login
4. Explore the dashboard



