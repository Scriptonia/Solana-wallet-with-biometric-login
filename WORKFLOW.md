# Secure Solana Wallet - Complete Workflow Documentation

## 🔄 Application Workflow

This document explains the complete user flow and technical workflow of the Secure Solana Wallet application.

---

## 📱 User Flow

### 1. Initial Access (Landing Page)
**Route:** `/` (Home page)

**Flow:**
1. User opens http://localhost:3000
2. If not authenticated → Shows landing page with two options:
   - **"Create Account"** button → Routes to `/register`
   - **"Login"** button → Routes to `/login`
3. If authenticated → Automatically redirects to `/dashboard`

---

### 2. Registration Flow
**Route:** `/register`

**Step-by-Step Process:**

#### Step 1: Generate or Enter Solana Public Key
- User can either:
  - **Generate New Wallet**: Click "Generate" button
    - Creates a new Solana Keypair using `Keypair.generate()`
    - Generates a BIP39 mnemonic phrase (12/24 words)
    - Displays public key in input field
    - Shows mnemonic phrase in alert (user must save it)
    - Stores temporarily in sessionStorage
  - **Enter Existing Key**: Manually type a Solana public key

#### Step 2: Biometric Registration
- User clicks **"Register with Biometrics"** button
- Browser prompts for biometric authentication (fingerprint/FaceID/Windows Hello)
- Frontend calls: `POST /api/v1/auth/register`
  - Backend generates WebAuthn registration options
  - Returns challenge and configuration
- Frontend uses `navigator.credentials.create()` to:
  - Create WebAuthn credential
  - Sign challenge with biometric
  - Return attestation response
- Frontend calls: `POST /api/v1/auth/register/verify`
  - Backend verifies attestation
  - Stores authenticator in database
  - Creates user record
  - Issues JWT token
- On success:
  - Stores JWT token in Zustand store
  - Clears temporary mnemonic from sessionStorage
  - Redirects to `/dashboard`

**Database Changes:**
- Creates `User` record with `solanaPublicKey`
- Creates `Authenticator` record with WebAuthn credential
- Creates `Session` record with JWT token

---

### 3. Login Flow
**Route:** `/login`

**Step-by-Step Process:**

#### Step 1: Enter Solana Public Key
- User enters their Solana public key (the one used during registration)

#### Step 2: Biometric Authentication
- User clicks **"Login with Biometrics"** button
- Frontend calls: `POST /api/v1/auth/login`
  - Backend looks up user by `solanaPublicKey`
  - Retrieves registered authenticators
  - Generates WebAuthn authentication challenge
  - Returns challenge and allowed credentials
- Browser prompts for biometric authentication
- Frontend uses `navigator.credentials.get()` to:
  - Get WebAuthn assertion
  - Sign challenge with stored credential
  - Return assertion response
- Frontend calls: `POST /api/v1/auth/login/verify`
  - Backend verifies assertion signature
  - Checks authenticator counter (prevents replay attacks)
  - Updates authenticator `signCount` and `lastUsedAt`
  - Issues JWT token
- On success:
  - Stores JWT token in Zustand store
  - Redirects to `/dashboard`

**Error Handling:**
- If user not found → Shows error: "User not found"
- If biometric fails → Shows error: "Biometric authentication failed"
- If verification fails → Shows error: "Login failed. Please try again."

---

### 4. Dashboard Flow
**Route:** `/dashboard`

**What Happens:**
1. Checks authentication status (via Zustand store)
2. If not authenticated → Redirects to `/login`
3. If authenticated:
   - Fetches wallet balance: `GET /api/v1/wallet/balance/:address`
   - Fetches SPL tokens: Via Solana RPC
   - Displays:
     - Safe Mode status (ON/OFF)
     - Total SOL balance
     - Wallet address (truncated)
     - SPL tokens list
     - Recent transactions (if any)

**Features:**
- **Safe Mode Toggle**: Shows current status
- **Balance Display**: Shows SOL and token balances
- **Logout Button**: Clears session and redirects to login

---

## 🔧 Technical Workflow

### Backend API Flow

#### Registration Endpoint Flow
```
Client → POST /api/v1/auth/register
  ↓
Backend: BiometricService.generateRegistrationOptions()
  ↓
- Creates/updates User in database
- Generates WebAuthn challenge
- Stores challenge in memory (Map)
- Returns registration options
  ↓
Client: navigator.credentials.create()
  ↓
Client → POST /api/v1/auth/register/verify
  ↓
Backend: BiometricService.verifyRegistration()
  ↓
- Verifies WebAuthn attestation
- Stores Authenticator in database
- Issues JWT token
- Creates Session record
  ↓
Returns: { token, user }
```

#### Login Endpoint Flow
```
Client → POST /api/v1/auth/login
  ↓
Backend: BiometricService.generateAuthenticationOptions()
  ↓
- Looks up User by solanaPublicKey
- Retrieves Authenticators
- Generates challenge
- Returns authentication options
  ↓
Client: navigator.credentials.get()
  ↓
Client → POST /api/v1/auth/login/verify
  ↓
Backend: BiometricService.verifyAuthentication()
  ↓
- Verifies assertion signature
- Checks counter (replay attack prevention)
- Updates authenticator counter
- Issues JWT token
- Creates Session record
  ↓
Returns: { token, user }
```

#### Wallet Balance Flow
```
Client → GET /api/v1/wallet/balance/:address
  ↓
Backend: authenticateToken middleware
  ↓
- Verifies JWT token
- Extracts userId from token
  ↓
Backend: Verifies wallet belongs to user
  ↓
Backend: SolanaService.getBalance()
  ↓
- Connects to Helius RPC
- Fetches SOL balance
- Fetches SPL token accounts
  ↓
Returns: { sol, tokens: [...] }
```

#### Transaction History Flow
```
Client → GET /api/v1/wallet/transactions/:address?helius=true
  ↓
Backend: authenticateToken middleware
  ↓
Backend: SolanaService.getParsedTransactionHistory()
  ↓
- Uses Helius API: GET /v0/addresses/{address}/transactions
- Parses enriched transaction data
- Falls back to standard RPC if Helius fails
  ↓
Returns: Array of parsed transactions
```

---

## 🔐 Security Workflow

### Biometric Authentication Security

1. **Challenge-Response**: Each authentication uses a unique, random challenge
2. **Counter Tracking**: Authenticator counter prevents replay attacks
3. **Origin Validation**: WebAuthn validates request origin
4. **RP ID Verification**: Ensures requests come from correct domain
5. **User Verification**: Requires biometric confirmation (not just presence)

### Safe Mode Workflow

#### Transaction Risk Assessment
```
User initiates transaction
  ↓
Frontend: Builds transaction
  ↓
Frontend → POST /api/v1/safe-mode/assess-transaction
  ↓
Backend: RiskService.assessTransaction()
  ↓
Checks:
1. Amount threshold (> user avg * 5 or > 10 SOL)
2. First-time address (no previous transactions)
3. Blacklisted address (ThreatCache lookup)
4. Unusual instructions (> 10 instructions)
5. Behavior deviation (frequency > avg * 3)
  ↓
Calculates risk score (0-1)
  ↓
Returns: { riskLevel, riskScore, flags, recommendation }
  ↓
Frontend: Displays warning/block modal
  ↓
If BLOCKED: Transaction cannot proceed
If WARN: User can override with biometric confirmation
```

#### Phishing Prevention
```
User connects to dApp or enters URL
  ↓
Frontend → POST /api/v1/safe-mode/check-phishing
  ↓
Backend: PhishingService.checkURL()
  ↓
Checks:
1. ThreatCache (database)
2. PhishTank API (if configured)
3. Domain blacklist
4. Heuristic patterns
  ↓
Returns: { isPhishing, threatScore, sources }
  ↓
Frontend: Shows warning or blocks connection
```

---

## 📊 Data Flow Diagrams

### Registration Data Flow
```
User Input (Public Key)
    ↓
Frontend State (Zustand)
    ↓
API Call → Backend
    ↓
Database (Prisma)
    ├─ User table
    ├─ Authenticator table
    └─ Session table
    ↓
JWT Token → Frontend
    ↓
Zustand Store (encrypted)
    ↓
Dashboard Access
```

### Transaction Flow
```
User Action (Send SOL)
    ↓
Frontend: Build Transaction
    ↓
API: Simulate Transaction
    ├─ Solana RPC (Helius)
    └─ Risk Assessment
    ↓
Safe Mode Check
    ├─ Amount Check
    ├─ Address Check
    ├─ Behavior Check
    └─ Phishing Check
    ↓
If Risky → Show Warning/Block
If Safe → Proceed to Sign
    ↓
Biometric Re-authentication
    ↓
Sign Transaction
    ↓
Broadcast to Solana
    ↓
Update Database
    └─ Transaction record
    └─ Behavior profile update
```

---

## 🗄️ Database Workflow

### User Registration
1. **User Table**: Creates record with `solanaPublicKey`
2. **Authenticator Table**: Stores WebAuthn credential
3. **Session Table**: Creates active session
4. **BehaviorProfile Table**: Initializes empty profile

### User Login
1. **Session Table**: Creates new session record
2. **Authenticator Table**: Updates `lastUsedAt` and `signCount`
3. **User Table**: Updates `lastActivity`

### Transaction Processing
1. **Transaction Table**: Creates pending transaction
2. **RiskFlag Table**: Stores risk flags (if any)
3. **BehaviorProfile Table**: Updates after confirmed transaction

---

## 🔄 State Management Flow

### Zustand Stores

#### Auth Store
```
State:
- isAuthenticated: boolean
- token: string | null
- user: { id, solanaPublicKey, safeModeEnabled }

Actions:
- setAuth(token, user) → Sets authenticated state
- logout() → Clears state
```

#### Wallet Store
```
State:
- publicKey: PublicKey | null
- balance: number
- tokens: Array
- nfts: Array

Actions:
- setWallet(publicKey)
- setBalance(balance)
- setTokens(tokens)
```

#### Safe Mode Store
```
State:
- enabled: boolean
- riskThreshold: number
- flags: Array

Actions:
- setEnabled(enabled)
- setRiskThreshold(threshold)
- setFlags(flags)
```

---

## 🚨 Error Handling Workflow

### Frontend Error Flow
```
API Call
    ↓
Try/Catch Block
    ↓
If Error:
    ├─ Log to console
    ├─ Show toast notification
    └─ Update UI state
    ↓
User sees error message
```

### Backend Error Flow
```
Request
    ↓
Middleware (Auth, Rate Limit)
    ↓
Route Handler
    ↓
Service Layer
    ↓
If Error:
    ├─ Log with Winston
    ├─ Return error response
    └─ Global error handler
    ↓
Client receives error
```

---

## 📝 Complete User Journey Example

### New User Registration
1. **Landing Page** (`/`)
   - Clicks "Create Account"
   
2. **Registration Page** (`/register`)
   - Clicks "Generate" → New wallet created
   - Saves mnemonic phrase (shown in alert)
   - Clicks "Register with Biometrics"
   - Browser prompts: "Use your fingerprint to register"
   - Biometric scan successful
   - Redirected to Dashboard

3. **Dashboard** (`/dashboard`)
   - Sees wallet balance (0 SOL initially)
   - Safe Mode is ON by default
   - Can view wallet address

### Returning User Login
1. **Landing Page** (`/`)
   - Clicks "Login"
   
2. **Login Page** (`/login`)
   - Enters Solana public key
   - Clicks "Login with Biometrics"
   - Browser prompts: "Use your fingerprint to login"
   - Biometric scan successful
   - Redirected to Dashboard

3. **Dashboard** (`/dashboard`)
   - Sees current balance
   - Can manage wallet
   - Can view transactions

### Transaction Flow
1. **User wants to send SOL**
   - Enters recipient address
   - Enters amount
   - Clicks "Send"

2. **Safe Mode Assessment**
   - Transaction is simulated
   - Risk assessment runs
   - If risky → Warning modal appears
   - User can override or cancel

3. **Biometric Confirmation**
   - If proceeding, biometric prompt appears
   - User confirms with fingerprint/FaceID
   - Transaction is signed

4. **Transaction Broadcast**
   - Signed transaction sent to Solana network
   - Status updated in database
   - Balance refreshed

---

## 🔍 Troubleshooting Workflow

### Common Issues

#### "Login failed" Error
**Possible Causes:**
1. User not registered → Use registration flow first
2. Wrong public key → Verify correct key
3. Biometric not set up → Check device settings
4. Backend not running → Start backend server

**Solution Flow:**
```
Check backend status → http://localhost:3001/health
    ↓
If not running → Start backend
    ↓
Verify public key matches registration
    ↓
Try registration flow if user doesn't exist
```

#### "Connection Refused" Error
**Possible Causes:**
1. Backend not running
2. Wrong port
3. CORS issue

**Solution Flow:**
```
Check backend: npm run dev (in backend directory)
    ↓
Verify .env file has correct PORT
    ↓
Check CORS_ORIGIN matches frontend URL
```

#### EPERM Error (Frontend)
**Cause:** Windows file permission issue with `.next` folder

**Solution:**
```powershell
# Delete .next folder and restart
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
```

---

## 📋 API Endpoint Summary

### Authentication
- `POST /api/v1/auth/register` - Get registration options
- `POST /api/v1/auth/register/verify` - Verify registration
- `POST /api/v1/auth/login` - Get login challenge
- `POST /api/v1/auth/login/verify` - Verify login
- `POST /api/v1/auth/logout` - Logout

### Wallet
- `GET /api/v1/wallet/balance/:address` - Get balance
- `GET /api/v1/wallet/transactions/:address` - Get transaction history
- `POST /api/v1/wallet/create` - Create wallet record

### Safe Mode
- `POST /api/v1/safe-mode/assess-transaction` - Assess risk
- `POST /api/v1/safe-mode/check-phishing` - Check URL/address
- `GET /api/v1/safe-mode/user-behavior` - Get behavior profile

### Transactions
- `POST /api/v1/transactions/simulate` - Simulate transaction
- `POST /api/v1/transactions/create` - Create transaction record

---

## 🎯 Key Points

1. **Registration is Required**: Users must register before they can login
2. **Biometric is Mandatory**: No password fallback (WebAuthn only)
3. **Safe Mode is Default**: Enabled by default for all users
4. **Helius Integration**: Transaction history uses Helius parsed API
5. **JWT Sessions**: Tokens expire after 24 hours
6. **Database First**: User must exist in database before login

---

## 📚 Next Steps for Users

After reading this workflow:

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Register**: Go to http://localhost:3000/register
4. **Generate Wallet**: Click "Generate" button
5. **Save Mnemonic**: Copy the mnemonic phrase shown
6. **Register Biometric**: Click "Register with Biometrics"
7. **Login**: Use the same public key to login
8. **Explore Dashboard**: View balance and Safe Mode status

---

*Last Updated: 2025-11-20*
*Version: 1.0*



