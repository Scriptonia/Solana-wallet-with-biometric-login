# API Endpoints & Sensitive Information Inventory

This document provides a complete inventory of all API endpoints and sensitive information in the Secure Solana Wallet application.

---

## 📡 API Endpoints

### Base URL
- **Development**: `http://localhost:3001`
- **Production**: Configure via `CORS_ORIGIN` environment variable

### API Version
- **Version**: `v1`
- **Base Path**: `/api/v1`

---

## 🔐 Authentication APIs

### 1. Registration Flow

#### `POST /api/v1/auth/register`
**Purpose**: Generate WebAuthn registration options

**Authentication**: ❌ Public (Rate Limited)

**Request Body**:
```json
{
  "solanaPubkey": "string" // Solana public key (base58)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "challenge": "string",
    "rp": { "name": "string", "id": "string" },
    "user": { "id": "string", "name": "string" },
    "pubKeyCredParams": [],
    "timeout": 60000,
    "userId": "string"
  }
}
```

**Rate Limit**: Yes (authRateLimiter)

---

#### `POST /api/v1/auth/register/verify`
**Purpose**: Verify WebAuthn registration and create user

**Authentication**: ❌ Public (Rate Limited)

**Request Body**:
```json
{
  "response": {
    "id": "string",
    "rawId": "string",
    "type": "public-key",
    "response": {
      "clientDataJSON": "string",
      "attestationObject": "string"
    }
  },
  "expectedChallenge": "string",
  "solanaPubkey": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN", // ⚠️ SENSITIVE
    "user": {
      "id": "string",
      "solanaPublicKey": "string",
      "safeModeEnabled": true
    }
  }
}
```

**Rate Limit**: Yes (authRateLimiter)

**Sensitive Data Returned**:
- ✅ JWT Token (24h expiry)

---

### 2. Login Flow

#### `POST /api/v1/auth/login`
**Purpose**: Generate WebAuthn authentication options

**Authentication**: ❌ Public (Rate Limited)

**Request Body**:
```json
{
  "solanaPubkey": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "challenge": "string",
    "allowCredentials": [
      {
        "id": "string",
        "type": "public-key",
        "transports": []
      }
    ],
    "timeout": 60000
  }
}
```

**Rate Limit**: Yes (authRateLimiter)

---

#### `POST /api/v1/auth/login/verify`
**Purpose**: Verify WebAuthn authentication and issue JWT

**Authentication**: ❌ Public (Rate Limited)

**Request Body**:
```json
{
  "response": {
    "id": "string",
    "rawId": "string",
    "type": "public-key",
    "response": {
      "clientDataJSON": "string",
      "authenticatorData": "string",
      "signature": "string",
      "userHandle": "string | null"
    }
  },
  "expectedChallenge": "string",
  "solanaPubkey": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN", // ⚠️ SENSITIVE
    "user": {
      "id": "string",
      "solanaPublicKey": "string",
      "safeModeEnabled": true
    }
  }
}
```

**Rate Limit**: Yes (authRateLimiter)

**Sensitive Data Returned**:
- ✅ JWT Token (24h expiry)

---

#### `POST /api/v1/auth/logout`
**Purpose**: Invalidate JWT session

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**: `{}`

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Sensitive Data**:
- ✅ JWT Token (invalidated in database)

---

## 💰 Wallet APIs

### `GET /api/v1/wallet/balance/:address`
**Purpose**: Get SOL balance and SPL tokens for a wallet

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**URL Parameters**:
- `address` (string): Solana wallet address

**Query Parameters**:
- None

**Response**:
```json
{
  "success": true,
  "data": {
    "sol": 1.5,
    "tokens": [
      {
        "mint": "string",
        "amount": "string",
        "decimals": 8
      }
    ]
  }
}
```

**Sensitive Data**:
- ⚠️ Wallet balance information
- ⚠️ Token holdings

**Access Control**: Verifies wallet belongs to authenticated user

---

### `GET /api/v1/wallet/transactions/:address`
**Purpose**: Get transaction history for a wallet

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**URL Parameters**:
- `address` (string): Solana wallet address

**Query Parameters**:
- `limit` (number, optional): Number of transactions (default: 50)
- `offset` (number, optional): Pagination offset (default: 0)
- `helius` (boolean, optional): Use Helius API (default: true)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "signature": "string",
      "timestamp": "number",
      "amount": "number",
      "type": "string"
    }
  ],
  "source": "helius" | "database"
}
```

**Sensitive Data**:
- ⚠️ Transaction history
- ⚠️ Transaction signatures
- ⚠️ Financial activity

**Access Control**: Verifies wallet belongs to authenticated user

---

### `POST /api/v1/wallet/create`
**Purpose**: Create a wallet record in database

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**:
```json
{
  "publicKey": "string",
  "label": "string" // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "string",
      "publicKey": "string",
      "label": "string",
      "balance": 0
    }
  }
}
```

**Sensitive Data**:
- ⚠️ Wallet public key (stored in database)

---

## 🛡️ Safe Mode APIs

### `POST /api/v1/safe-mode/assess-transaction`
**Purpose**: Assess transaction risk level

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**:
```json
{
  "transaction": "string", // base64 encoded transaction (optional)
  "walletAddress": "string",
  "amount": 1.5,
  "recipientAddress": "string",
  "instructions": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "riskScore": 0.75,
    "flags": [
      {
        "type": "LARGE_AMOUNT",
        "severity": "HIGH",
        "message": "string"
      }
    ],
    "recommendation": "BLOCK" | "WARN" | "ALLOW"
  }
}
```

**Sensitive Data**:
- ⚠️ Transaction details
- ⚠️ Risk assessment data

---

### `POST /api/v1/safe-mode/check-phishing`
**Purpose**: Check if URL or address is phishing

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**:
```json
{
  "url": "string", // OR
  "address": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isPhishing": false,
    "threatScore": 0.2,
    "sources": ["heuristic", "phishtank"],
    "details": {}
  }
}
```

**Sensitive Data**:
- ⚠️ URLs being checked
- ⚠️ Addresses being checked

---

### `GET /api/v1/safe-mode/user-behavior`
**Purpose**: Get user behavior profile

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "avgAmount": 0.5,
    "txnFrequency": 10,
    "commonAddresses": ["string"],
    "deviationScore": 0.1
  }
}
```

**Sensitive Data**:
- ⚠️ User behavior patterns
- ⚠️ Transaction history patterns
- ⚠️ Common addresses

---

### `POST /api/v1/safe-mode/update-behavior`
**Purpose**: Update user behavior profile after transaction

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**:
```json
{
  "signature": "string",
  "amount": 1.5,
  "type": "string"
}
```

**Response**: `204 No Content`

**Sensitive Data**:
- ⚠️ Transaction signatures
- ⚠️ Transaction amounts

---

## 📝 Transaction APIs

### `POST /api/v1/transactions/simulate`
**Purpose**: Simulate transaction and assess risk

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Rate Limit**: Yes (simulationRateLimiter)

**Request Body**:
```json
{
  "transaction": "string", // base64 encoded transaction
  "walletAddress": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "simulationResult": {
      "err": null,
      "logs": [],
      "accounts": []
    },
    "riskAssessment": {
      "riskLevel": "LOW",
      "riskScore": 0.1
    }
  }
}
```

**Sensitive Data**:
- ⚠️ Transaction data
- ⚠️ Simulation results

---

### `POST /api/v1/transactions/create`
**Purpose**: Create transaction record in database

**Authentication**: ✅ Required (Bearer Token)

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body**:
```json
{
  "walletId": "string",
  "amount": 1.5,
  "recipientAddress": "string",
  "instructions": [],
  "simulationResult": {},
  "riskScore": 0.1,
  "isBlocked": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "walletId": "string",
    "amount": 1.5,
    "recipientAddress": "string",
    "status": "pending",
    "riskScore": 0.1,
    "isBlocked": false,
    "createdAt": "ISO_DATE"
  }
}
```

**Sensitive Data**:
- ⚠️ Transaction details
- ⚠️ Risk scores

---

## 🏥 Health Check

### `GET /health`
**Purpose**: Server health check

**Authentication**: ❌ Public

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

---

## 🔒 Sensitive Information

### Environment Variables (Backend `.env`)

#### 🔴 CRITICAL - Never Expose

1. **`JWT_SECRET`**
   - **Type**: String (minimum 32 characters)
   - **Purpose**: Sign and verify JWT tokens
   - **Exposure Risk**: 🔴 CRITICAL
   - **Impact**: If exposed, attackers can forge authentication tokens
   - **Storage**: `.env` file (never commit to Git)
   - **Generation**: Use provided scripts or `openssl rand -hex 32`

2. **`DATABASE_URL`**
   - **Type**: PostgreSQL connection string
   - **Format**: `postgres://user:password@host:port/database?sslmode=require`
   - **Purpose**: Database connection
   - **Exposure Risk**: 🔴 CRITICAL
   - **Impact**: Full database access if exposed
   - **Contains**: Database credentials, connection details
   - **Setup**: 
     - Use local PostgreSQL: `postgres://user:password@localhost:5432/solana_wallet?sslmode=require`
     - Or use free cloud services:
       - Supabase: https://supabase.com
       - Neon: https://neon.tech
       - Railway: https://railway.app
   - **Example Format**: `postgres://username:password@host:port/database?sslmode=require`

3. **`HELIUS_API_KEY`**
   - **Type**: String (UUID format)
   - **Purpose**: Access to Helius Solana RPC API
   - **Exposure Risk**: 🟡 MEDIUM
   - **Impact**: API quota abuse, potential costs
   - **How to Get**: Sign up for free at https://www.helius.dev/
   - **Setup**: Add to `.env` file as `HELIUS_API_KEY=your-api-key-here`

4. **`PHISHTANK_API_KEY`**
   - **Type**: String
   - **Purpose**: PhishTank phishing database API access
   - **Exposure Risk**: 🟡 MEDIUM
   - **Impact**: API quota abuse
   - **Storage**: `.env` file (optional)

#### 🟡 MEDIUM - Protect in Production

5. **`WEBAUTHN_RP_ID`**
   - **Type**: String (domain name)
   - **Purpose**: WebAuthn Relying Party identifier
   - **Exposure Risk**: 🟢 LOW (public by design)
   - **Development**: `localhost`
   - **Production**: Your domain (e.g., `wallet.yourdomain.com`)

6. **`WEBAUTHN_ORIGIN`**
   - **Type**: URL string
   - **Purpose**: WebAuthn origin validation
   - **Exposure Risk**: 🟢 LOW (public by design)
   - **Development**: `http://localhost:3000`
   - **Production**: `https://wallet.yourdomain.com`

7. **`CORS_ORIGIN`**
   - **Type**: Comma-separated URLs
   - **Purpose**: Allowed CORS origins
   - **Exposure Risk**: 🟢 LOW (public by design)
   - **Development**: `http://localhost:3000`
   - **Production**: Your production URLs

#### 🟢 LOW - Configuration Only

8. **`PORT`**
   - **Type**: Number
   - **Default**: `3001`
   - **Exposure Risk**: 🟢 LOW

9. **`NODE_ENV`**
   - **Type**: String (`development` | `production`)
   - **Exposure Risk**: 🟢 LOW

10. **`SOLANA_RPC_URL`**
    - **Type**: URL string
    - **Purpose**: Solana RPC endpoint
    - **Exposure Risk**: 🟡 MEDIUM (if using API key in URL)
    - **Options**:
      - Public RPC: `https://api.mainnet-beta.solana.com` (rate limited)
      - Helius RPC: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY` (get free key from https://www.helius.dev/)
    - **Setup**: Add to `.env` file

11. **`SOLANA_DEVNET_RPC_URL`**
    - **Type**: URL string
    - **Default**: `https://api.devnet.solana.com`
    - **Exposure Risk**: 🟢 LOW (public endpoint)

12. **`HELIUS_RPC_URL`**
    - **Type**: URL string
    - **Purpose**: Helius RPC endpoint with API key
    - **Format**: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`
    - **Exposure Risk**: 🟡 MEDIUM (if API key exposed)
    - **Setup**: Get free API key from https://www.helius.dev/ and add to `.env`

13. **`HELIUS_API_URL`**
    - **Type**: URL string
    - **Default**: `https://api-mainnet.helius-rpc.com`
    - **Exposure Risk**: 🟢 LOW

---

### Frontend Environment Variables (`.env.local`)

1. **`NEXT_PUBLIC_API_URL`**
   - **Type**: URL string
   - **Purpose**: Backend API URL
   - **Exposure Risk**: 🟢 LOW (public by design - `NEXT_PUBLIC_` prefix)
   - **Default**: `http://localhost:3001`

2. **`NEXT_PUBLIC_SOLANA_RPC_URL`**
   - **Type**: URL string
   - **Purpose**: Solana RPC endpoint for frontend
   - **Exposure Risk**: 🟢 LOW (public by design)
   - **Default**: `https://api.devnet.solana.com`

---

### Database Sensitive Data

#### Tables with Sensitive Information

1. **`User` Table**
   - `solanaPublicKey`: ⚠️ Wallet public key
   - `id`: User identifier

2. **`Authenticator` Table**
   - `credentialId`: ⚠️ WebAuthn credential ID
   - `publicKey`: ⚠️ WebAuthn public key (encrypted)
   - `signCount`: Security counter

3. **`Session` Table**
   - `token`: ⚠️ JWT token (hashed)
   - `userId`: User identifier
   - `ipAddress`: ⚠️ IP address
   - `userAgent`: ⚠️ Browser user agent

4. **`Wallet` Table**
   - `publicKey`: ⚠️ Solana wallet public key
   - `userId`: User identifier

5. **`Transaction` Table**
   - `amount`: ⚠️ Transaction amount
   - `recipientAddress`: ⚠️ Recipient wallet address
   - `instructions`: ⚠️ Transaction instructions
   - `riskScore`: Risk assessment score

6. **`BehaviorProfile` Table**
   - `avgAmount`: ⚠️ Average transaction amount
   - `commonAddresses`: ⚠️ Frequently used addresses
   - `txnFrequency`: Transaction frequency

7. **`RiskFlag` Table**
   - `flagType`: Risk flag type
   - `severity`: Risk severity
   - `details`: Risk details

---

## 🚨 Security Recommendations

### Immediate Actions Required

1. **🔒 Set Up Your Own API Keys**
   - Get Helius API key from https://www.helius.dev/ (free tier available)
   - Add to `.env` file as `HELIUS_API_KEY=your-api-key-here`
   - Never commit API keys to Git

2. **🔒 Protect JWT_SECRET**
   - Ensure minimum 32 characters
   - Use cryptographically secure random generation
   - Never commit to Git
   - Rotate periodically in production

3. **🔒 Protect DATABASE_URL**
   - Use strong database passwords
   - Enable SSL/TLS connections
   - Restrict database access by IP
   - Use connection pooling

4. **🔒 Secure API Keys**
   - Store in environment variables only
   - Use secrets management service in production (AWS Secrets Manager, etc.)
   - Rotate keys periodically
   - Monitor API usage for abuse

### Best Practices

1. **Environment Variables**
   - ✅ Never commit `.env` files to Git
   - ✅ Use different secrets for dev/staging/production
   - ✅ Rotate secrets periodically
   - ✅ Use secrets management services in production

2. **API Security**
   - ✅ All sensitive endpoints require authentication
   - ✅ Rate limiting on public endpoints
   - ✅ CORS properly configured
   - ✅ Input validation on all endpoints

3. **Data Protection**
   - ✅ Encrypt sensitive data at rest
   - ✅ Use HTTPS in production
   - ✅ Implement proper access controls
   - ✅ Log access to sensitive data

4. **Monitoring**
   - ✅ Monitor API usage for anomalies
   - ✅ Alert on failed authentication attempts
   - ✅ Track sensitive data access
   - ✅ Monitor for API key abuse

---

## 📊 API Summary Table

| Endpoint | Method | Auth Required | Rate Limited | Sensitive Data |
|----------|--------|---------------|-------------|----------------|
| `/health` | GET | ❌ | ❌ | None |
| `/api/v1/auth/register` | POST | ❌ | ✅ | None |
| `/api/v1/auth/register/verify` | POST | ❌ | ✅ | JWT Token |
| `/api/v1/auth/login` | POST | ❌ | ✅ | None |
| `/api/v1/auth/login/verify` | POST | ❌ | ✅ | JWT Token |
| `/api/v1/auth/logout` | POST | ✅ | ❌ | JWT Token |
| `/api/v1/wallet/balance/:address` | GET | ✅ | ❌ | Balance, Tokens |
| `/api/v1/wallet/transactions/:address` | GET | ✅ | ❌ | Transaction History |
| `/api/v1/wallet/create` | POST | ✅ | ❌ | Wallet Public Key |
| `/api/v1/safe-mode/assess-transaction` | POST | ✅ | ❌ | Transaction Data |
| `/api/v1/safe-mode/check-phishing` | POST | ✅ | ❌ | URLs, Addresses |
| `/api/v1/safe-mode/user-behavior` | GET | ✅ | ❌ | Behavior Patterns |
| `/api/v1/safe-mode/update-behavior` | POST | ✅ | ❌ | Transaction Data |
| `/api/v1/transactions/simulate` | POST | ✅ | ✅ | Transaction Data |
| `/api/v1/transactions/create` | POST | ✅ | ❌ | Transaction Data |

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- All amounts are in SOL (or token units)
- JWT tokens expire after 24 hours
- Rate limits are configured per endpoint type
- All sensitive endpoints verify user ownership of resources

---

**Last Updated**: 2025-01-20  
**Version**: 1.0

