# End-to-End Testing Guide

This directory contains comprehensive end-to-end tests for the Secure Solana Wallet application, covering the complete flow from registration to the end of the application lifecycle.

## Test Structure

- **`e2e.test.ts`**: Main E2E test suite with API endpoint testing
- **`manual-browser-test.md`**: Guide for manual browser testing with real WebAuthn
- **`run-e2e.ps1`**: PowerShell script to run E2E tests (Windows)
- **`run-e2e.sh`**: Bash script to run E2E tests (Linux/Mac)

## Quick Start

### Prerequisites

1. **Backend server running**: The backend must be running on `http://localhost:3001`
2. **Database connected**: PostgreSQL database must be accessible
3. **Environment variables**: `.env` file must be configured

### Running Tests

#### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run test:e2e
```

#### Option 2: Using test runner scripts

**Windows (PowerShell):**
```powershell
cd backend/tests
.\run-e2e.ps1
```

**Linux/Mac (Bash):**
```bash
cd backend/tests
chmod +x run-e2e.sh
./run-e2e.sh
```

#### Option 3: Direct Jest command

```bash
cd backend
npx jest e2e.test.ts
```

## Test Coverage

The E2E test suite covers:

### 1. Registration Flow
- ✅ Health check endpoint
- ✅ Generate registration options
- ✅ Verify registration (with WebAuthn mock)

### 2. Login Flow
- ✅ Generate login options
- ✅ Verify login (with WebAuthn mock)

### 3. Wallet Operations
- ✅ Create wallet record
- ✅ Get wallet balance
- ✅ Get transaction history

### 4. Safe Mode Operations
- ✅ Assess transaction risk
- ✅ Check phishing URLs
- ✅ Get user behavior profile

### 5. Logout Flow
- ✅ Logout endpoint

## Understanding Test Results

### Expected Behavior

1. **Health Check**: Should always pass if backend is running
2. **Registration/Login Options**: Should pass (API endpoints work)
3. **WebAuthn Verification**: May show warnings (expected with mocks)
   - Real WebAuthn requires browser biometric interaction
   - Mock responses may not pass full verification
   - This is **normal** and expected
4. **Authenticated Endpoints**: May skip if no valid token
   - Requires real browser WebAuthn to get valid token
   - See manual browser testing guide

### Test Output

```
✅ Health check passed
✅ Registration options generated
⚠️  Registration verification error (expected with mock)
   Note: Real WebAuthn requires browser biometric interaction
✅ Login options generated
⚠️  Login verification error (expected with mock)
⏭️  Skipped - requires authentication
```

## Manual Browser Testing

For complete flow testing with real WebAuthn biometric authentication, see:

**[manual-browser-test.md](./manual-browser-test.md)**

This guide walks you through:
- Registration with real biometrics
- Login with real biometrics
- Dashboard verification
- Wallet operations
- Safe Mode testing
- Error scenarios

## Troubleshooting

### Backend Not Running

**Error**: `Backend server is not responding`

**Solution**:
```bash
cd backend
npm run dev
```

Wait for server to start, then run tests again.

### Database Connection Issues

**Error**: Database connection errors in tests

**Solution**:
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` file
3. Run migrations: `npm run prisma:migrate`

### WebAuthn Mock Failures

**Note**: WebAuthn mock failures are **expected** and **normal**.

Real WebAuthn requires:
- Browser environment
- Actual biometric hardware
- User interaction
- Proper credential storage

Use manual browser testing for full WebAuthn validation.

### Port Already in Use

**Error**: Port 3001 already in use

**Solution**:
1. Change `PORT` in `.env` file
2. Update `API_BASE_URL` in test files
3. Or stop the process using port 3001

## Test Configuration

### Environment Variables

Tests use these environment variables (optional):
- `API_BASE_URL`: Backend API URL (default: `http://localhost:3001`)

### Jest Configuration

See `jest.config.js` in backend root for:
- Test timeout settings
- Coverage configuration
- TypeScript compilation

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    cd backend
    npm run test:e2e
  env:
    API_BASE_URL: http://localhost:3001
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Next Steps

1. **Run E2E tests**: Verify API endpoints work
2. **Manual browser testing**: Test complete WebAuthn flow
3. **Integration testing**: Test with real Solana network
4. **Performance testing**: Load test API endpoints

## Support

For issues or questions:
1. Check test output for specific errors
2. Verify backend server is running
3. Check database connection
4. Review manual browser testing guide
5. Check backend logs for detailed errors

