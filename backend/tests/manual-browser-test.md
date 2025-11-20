# Manual Browser Testing Guide

This guide walks you through testing the complete flow from registration to end using a real browser with WebAuthn biometric authentication.

## Prerequisites

1. **Backend server running**: `cd backend && npm run dev`
2. **Frontend server running**: `cd frontend && npm run dev`
3. **Browser with WebAuthn support**: Chrome, Firefox, Edge, or Safari
4. **Biometric device**: Fingerprint reader, Face ID, or Windows Hello

## Test Flow

### Step 1: Start Servers

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Verify both are running:
- Backend: http://localhost:3001/health
- Frontend: http://localhost:3000

### Step 2: Registration Flow

1. **Open Browser**: Navigate to http://localhost:3000
2. **Click "Create Account"**: Should redirect to `/register`
3. **Generate Wallet**:
   - Click "Generate" button
   - A new Solana public key should appear
   - **IMPORTANT**: Save the mnemonic phrase shown in the alert
   - Copy the public key for later use
4. **Register with Biometrics**:
   - Click "Register with Biometrics" button
   - Browser will prompt for biometric authentication
   - Use your fingerprint/Face ID/Windows Hello
   - On success, you should be redirected to `/dashboard`

**Expected Results**:
- ✅ Public key generated
- ✅ Mnemonic phrase displayed
- ✅ Biometric prompt appears
- ✅ Registration successful
- ✅ Redirected to dashboard
- ✅ JWT token stored in browser

### Step 3: Dashboard Verification

1. **Check Dashboard Loads**:
   - Should see wallet address (truncated)
   - Should see SOL balance (may be 0 for new wallet)
   - Should see Safe Mode status (ON by default)
   - Should see SPL tokens list (may be empty)

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Check Network tab for API calls:
     - `GET /api/v1/wallet/balance/:address` - Should return 200
     - Check for any errors

**Expected Results**:
- ✅ Dashboard loads without errors
- ✅ Balance API call succeeds
- ✅ Safe Mode shows as enabled
- ✅ No console errors

### Step 4: Logout

1. **Click Logout Button**: Should clear session
2. **Verify Redirect**: Should redirect to `/login` or `/`

**Expected Results**:
- ✅ Session cleared
- ✅ Redirected to login page
- ✅ Cannot access dashboard without re-authentication

### Step 5: Login Flow

1. **Navigate to Login**: Go to `/login` or click "Login" from landing page
2. **Enter Public Key**: Use the same public key from registration
3. **Login with Biometrics**:
   - Click "Login with Biometrics" button
   - Browser will prompt for biometric authentication
   - Use your fingerprint/Face ID/Windows Hello
   - On success, should redirect to `/dashboard`

**Expected Results**:
- ✅ Login options generated
- ✅ Biometric prompt appears
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ Same wallet data displayed

### Step 6: Wallet Operations

1. **View Balance**:
   - Check SOL balance displays correctly
   - Check SPL tokens list (if any)

2. **View Transactions**:
   - Check transaction history (may be empty for new wallet)
   - Verify API calls succeed

**Expected Results**:
- ✅ Balance displays correctly
- ✅ Transaction history loads (even if empty)
- ✅ No API errors

### Step 7: Safe Mode Testing

1. **Check Safe Mode Status**:
   - Should show "Safe Mode: ON" or similar
   - Status should be visible on dashboard

2. **Test Risk Assessment** (if transaction feature exists):
   - Try to create a transaction
   - Safe Mode should assess risk
   - Check for warnings/blocking

**Expected Results**:
- ✅ Safe Mode status visible
- ✅ Risk assessment works (if implemented)
- ✅ Warnings appear for risky transactions

### Step 8: Error Scenarios

1. **Wrong Public Key**:
   - Try logging in with a different public key
   - Should show "User not found" error

2. **Biometric Failure**:
   - Cancel biometric prompt
   - Should show appropriate error message

3. **Unauthorized Access**:
   - Try accessing `/dashboard` without authentication
   - Should redirect to login

**Expected Results**:
- ✅ Errors handled gracefully
- ✅ User-friendly error messages
- ✅ Proper redirects

## Test Checklist

- [ ] Registration flow works
- [ ] Wallet generation works
- [ ] Biometric registration works
- [ ] Dashboard loads correctly
- [ ] Balance API works
- [ ] Transaction history API works
- [ ] Logout works
- [ ] Login flow works
- [ ] Biometric login works
- [ ] Safe Mode displays correctly
- [ ] Error handling works
- [ ] Unauthorized access blocked

## Troubleshooting

### Biometric Not Working
- Check browser supports WebAuthn (Chrome, Firefox, Edge, Safari)
- Check device has biometric capability
- Check browser permissions for biometric access
- Try in incognito/private mode

### API Errors
- Check backend is running on port 3001
- Check CORS configuration
- Check JWT_SECRET is set in backend .env
- Check database connection

### Frontend Errors
- Check frontend is running on port 3000
- Check NEXT_PUBLIC_API_URL in .env.local
- Clear browser cache and localStorage
- Check browser console for errors

## Notes

- WebAuthn requires HTTPS in production (localhost is exception)
- Some browsers may require user gesture for WebAuthn
- Biometric prompts are browser/OS dependent
- Test on multiple browsers for compatibility

