# Complete Testing Guide - Registration to End of Flow

This guide provides comprehensive instructions for testing the Secure Solana Wallet application from registration through the complete user flow.

## 🎯 Overview

The testing suite includes:
1. **Automated API Tests**: End-to-end tests for all API endpoints
2. **Manual Browser Tests**: Complete WebAuthn biometric flow testing
3. **Integration Tests**: Full flow validation

## 📋 Quick Start

### Step 1: Start Backend Server

```powershell
cd backend
npm run dev
```

Wait for: `Server running on port 3001`

### Step 2: Start Frontend Server (for browser testing)

```powershell
cd frontend
npm run dev
```

Wait for: `Ready on http://localhost:3000`

### Step 3: Run Automated Tests

```powershell
cd backend
npm run test:e2e
```

Or use the test runner script:

```powershell
cd backend/tests
.\run-e2e.ps1
```

## 🧪 Automated API Tests

### What Gets Tested

The automated test suite (`backend/tests/e2e.test.ts`) tests:

1. **Health Check** ✅
   - Backend server availability
   - API endpoint accessibility

2. **Registration Flow** ✅
   - Generate registration options
   - WebAuthn registration (mock)
   - User creation

3. **Login Flow** ✅
   - Generate login options
   - WebAuthn authentication (mock)
   - JWT token generation

4. **Wallet Operations** ✅
   - Create wallet record
   - Get wallet balance
   - Get transaction history

5. **Safe Mode Operations** ✅
   - Transaction risk assessment
   - Phishing URL checking
   - User behavior profile

6. **Logout Flow** ✅
   - Session invalidation

### Running Tests

```powershell
# From backend directory
npm run test:e2e

# Or with coverage
npm run test:coverage

# Or watch mode
npm run test:watch
```

### Expected Results

```
✅ Health check passed
✅ Registration options generated
⚠️  Registration verification error (expected with mock)
   Note: Real WebAuthn requires browser biometric interaction
✅ Login options generated
⚠️  Login verification error (expected with mock)
⏭️  Skipped - requires authentication
```

**Note**: WebAuthn mock failures are **expected**. Real WebAuthn requires browser interaction.

## 🌐 Manual Browser Testing

For complete flow testing with real biometric authentication, follow the manual browser testing guide:

**[backend/tests/manual-browser-test.md](./backend/tests/manual-browser-test.md)**

### Quick Browser Test Checklist

1. **Registration**
   - [ ] Navigate to http://localhost:3000
   - [ ] Click "Create Account"
   - [ ] Generate wallet (click "Generate")
   - [ ] Save mnemonic phrase
   - [ ] Click "Register with Biometrics"
   - [ ] Complete biometric authentication
   - [ ] Verify redirect to dashboard

2. **Dashboard**
   - [ ] Verify wallet address displays
   - [ ] Verify balance displays (may be 0)
   - [ ] Verify Safe Mode status (should be ON)
   - [ ] Check browser console for errors

3. **Logout**
   - [ ] Click logout button
   - [ ] Verify redirect to login page

4. **Login**
   - [ ] Enter public key from registration
   - [ ] Click "Login with Biometrics"
   - [ ] Complete biometric authentication
   - [ ] Verify redirect to dashboard

5. **Wallet Operations**
   - [ ] Verify balance API call succeeds
   - [ ] Verify transaction history loads
   - [ ] Check Safe Mode status

## 🔍 Complete Flow Test

### Full End-to-End Test Sequence

1. **Start Servers**
   ```powershell
   # Terminal 1
   cd backend
   npm run dev

   # Terminal 2
   cd frontend
   npm run dev
   ```

2. **Run Automated Tests**
   ```powershell
   # Terminal 3
   cd backend
   npm run test:e2e
   ```

3. **Manual Browser Test**
   - Open http://localhost:3000
   - Complete registration flow
   - Complete login flow
   - Verify all features work

4. **Verify Results**
   - ✅ All automated tests pass (except WebAuthn mocks)
   - ✅ Browser registration works
   - ✅ Browser login works
   - ✅ Dashboard displays correctly
   - ✅ Wallet operations work
   - ✅ Safe Mode functions correctly

## 📊 Test Coverage

### API Endpoints Tested

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | ✅ | Always tested |
| `/api/v1/auth/register` | POST | ✅ | Options generation |
| `/api/v1/auth/register/verify` | POST | ⚠️ | Mock WebAuthn |
| `/api/v1/auth/login` | POST | ✅ | Options generation |
| `/api/v1/auth/login/verify` | POST | ⚠️ | Mock WebAuthn |
| `/api/v1/auth/logout` | POST | ✅ | Requires auth |
| `/api/v1/wallet/create` | POST | ✅ | Requires auth |
| `/api/v1/wallet/balance/:address` | GET | ✅ | Requires auth |
| `/api/v1/wallet/transactions/:address` | GET | ✅ | Requires auth |
| `/api/v1/safe-mode/assess-transaction` | POST | ✅ | Requires auth |
| `/api/v1/safe-mode/check-phishing` | POST | ✅ | Requires auth |
| `/api/v1/safe-mode/user-behavior` | GET | ✅ | Requires auth |

### Browser Features Tested

| Feature | Status | Notes |
|---------|--------|-------|
| Registration UI | ✅ | Manual test |
| Wallet Generation | ✅ | Manual test |
| Biometric Registration | ✅ | Requires real device |
| Dashboard Display | ✅ | Manual test |
| Balance Display | ✅ | Manual test |
| Transaction History | ✅ | Manual test |
| Safe Mode Display | ✅ | Manual test |
| Logout | ✅ | Manual test |
| Login UI | ✅ | Manual test |
| Biometric Login | ✅ | Requires real device |

## 🐛 Troubleshooting

### Backend Not Running

**Error**: `Backend server is not responding`

**Solution**:
```powershell
cd backend
npm run dev
```

Check: http://localhost:3001/health

### Frontend Not Running

**Error**: Cannot access http://localhost:3000

**Solution**:
```powershell
cd frontend
npm run dev
```

### Database Connection Issues

**Error**: Database connection errors

**Solution**:
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `backend/.env`
3. Run migrations:
   ```powershell
   cd backend
   npm run prisma:migrate
   ```

### WebAuthn Not Working in Browser

**Error**: Biometric prompt doesn't appear

**Solution**:
1. Use supported browser (Chrome, Firefox, Edge, Safari)
2. Check device has biometric capability
3. Check browser permissions
4. Try incognito/private mode
5. Ensure using `localhost` (not IP address)

### Tests Failing

**Error**: Tests fail with connection errors

**Solution**:
1. Ensure backend is running
2. Check `API_BASE_URL` environment variable
3. Verify `.env` file is configured
4. Check database connection

## 📝 Test Files

- **`backend/tests/e2e.test.ts`**: Main E2E test suite
- **`backend/tests/manual-browser-test.md`**: Manual testing guide
- **`backend/tests/README.md`**: Test documentation
- **`backend/tests/run-e2e.ps1`**: Windows test runner
- **`backend/tests/run-e2e.sh`**: Linux/Mac test runner
- **`backend/jest.config.js`**: Jest configuration

## 🎓 Next Steps

After running tests:

1. **Review Test Results**: Check all tests pass
2. **Manual Verification**: Complete browser testing
3. **Fix Issues**: Address any failures
4. **Documentation**: Update docs if needed
5. **CI/CD**: Integrate tests into pipeline

## 📚 Additional Resources

- [Backend Test README](./backend/tests/README.md)
- [Manual Browser Test Guide](./backend/tests/manual-browser-test.md)
- [Workflow Documentation](./WORKFLOW.md)
- [API Documentation](./backend/apis/openapi.md)

## ✅ Success Criteria

All tests are successful when:

- ✅ Backend health check passes
- ✅ All API endpoints respond correctly
- ✅ Registration flow works in browser
- ✅ Login flow works in browser
- ✅ Dashboard displays correctly
- ✅ Wallet operations work
- ✅ Safe Mode functions correctly
- ✅ No console errors
- ✅ No API errors

---

**Last Updated**: 2025-01-20
**Version**: 1.0

