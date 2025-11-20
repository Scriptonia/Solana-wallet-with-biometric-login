# Secure Solana Wallet Backend API Specification

This document provides the OpenAPI 3.0 specification for the backend APIs of the Secure Solana Wallet with Biometric Login and Advanced Safe Mode. The APIs are designed to support secure user authentication via WebAuthn (integrating device biometrics like fingerprint, FaceID, TouchID, and Windows Hello), Safe Mode risk assessments for Solana transactions (flagging based on amount thresholds, address novelty/blacklisting, instruction anomalies, and user behavior deviations), phishing prevention through URL validation and external threat database checks, and wallet operations for SPL tokens, NFTs, DeFi protocols, and transaction decoding/simulations.

The backend is built with Node.js + Express, using PostgreSQL via Prisma ORM for user data, transaction history, and behavior analytics. APIs integrate with Solana RPC for blockchain interactions and external services like PhishTank or Solana-specific threat feeds. Authentication uses JWT tokens post-WebAuthn verification, with secure key management. All endpoints enforce CORS for web app and browser extension origins, rate limiting, and input validation to prevent common attacks.

For coordination:
- **FrontendDev**: These APIs define contracts for biometric challenges, transaction previews, and risk flags. Use the schemas for request/response typing in TypeScript.
- **ProductManager**: Aligns with requirements for biometric login, Safe Mode blocking/warnings, phishing prevention, and Solana ecosystem support (SPL/NFT/DeFi). No direct hardware wallet (Ledger/YubiKey) APIs here—handled client-side via WebUSB/HID.
- **Unique Aspects**: Endpoints include Solana-specific serialization (e.g., base58 addresses, transaction blobs), behavior scoring via ML-lite heuristics in the backend, and optional PDA (Program-Derived Address) handling for DeFi.

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Secure Solana Wallet Backend API
  description: |
    APIs for secure Solana wallet operations, biometric authentication, Safe Mode transaction risk assessment, and phishing prevention.
    Supports SPL tokens, NFTs, DeFi protocols, and transaction simulations on Solana mainnet/devnet.
    Authentication: WebAuthn for biometrics + JWT for sessions.
    Base URL: https://api.secure-solana-wallet.com/v1 (or local dev: http://localhost:3000/v1)
  version: 1.0.0
  contact:
    name: BackendDev Team
    email: backend@secure-solana-wallet.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.secure-solana-wallet.com/v1
    description: Production server
  - url: http://localhost:3000/v1
    description: Local development
security:
  - bearerAuth: []  # JWT Bearer token after WebAuthn login
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    # Error Response (shared)
    ApiError:
      type: object
      properties:
        code:
          type: string
          enum: [VALIDATION_ERROR, AUTH_ERROR, RPC_ERROR, PHISH_ERROR, RISK_ERROR]
        message:
          type: string
        details:
          type: object
          additionalProperties: true
      required: [code, message]
    
    # User Schemas
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
          example: "550e8400-e29b-41d4-a716-446655440000"
        email:
          type: string
          format: email
        walletAddress:
          type: string
          description: Base58-encoded Solana public key
          example: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        createdAt:
          type: string
          format: date-time
        behaviorProfile:
          type: object
          description: Anonymized user behavior data for risk assessment (e.g., avg tx amount, frequency)
          properties:
            avgTxAmount:
              type: number
              format: lamports  # Solana native unit
            txFrequency:
              type: number  # tx per day
            lastActive:
              type: string
              format: date-time
      required: [id, walletAddress]
    
    WebAuthnChallenge:
      type: object
      properties:
        challenge:
          type: string
          description: Base64url-encoded challenge for WebAuthn
        userId:
          type: string
          format: uuid
        rpId:
          type: string
          description: Relying Party ID (e.g., secure-solana-wallet.com)
        timeout:
          type: integer
          example: 60000  # ms
      required: [challenge, userId, rpId]
    
    WebAuthnCredential:
      type: object
      properties:
        id:
          type: string
          format: base64url
        rawId:
          type: string
          format: base64url
        response:
          type: object
          properties:
            clientDataJSON:
              type: string
              format: base64url
            authenticatorData:
              type: string
              format: base64url
            signature:
              type: string
              format: base64url
            userHandle:
              type: string
              format: base64url
        type:
          type: string
          enum: [public-key]
      required: [id, rawId, response, type]
    
    # Transaction Schemas (Solana-specific)
    SolanaTransaction:
      type: object
      properties:
        signature:
          type: string
          description: Base58-encoded tx signature
        message:
          type: object
          description: Decoded transaction message
          properties:
            accountKeys:
              type: array
              items:
                type: string  # Base58 addresses
            instructions:
              type: array
              items:
                type: object
                properties:
                  programId:
                    type: string  # Base58
                  accounts:
                    type: array
                    items: { type: integer }  # Indices
                  data:
                    type: string  # Base64-encoded instruction data
            recentBlockhash:
              type: string
        simulationResult:
          type: object
          description: Result from Solana simulateTransaction RPC
          properties:
            err:
              type: object  # Solana error if any
            logs:
              type: array
              items: { type: string }
            accounts:
              type: array
              items:
                type: object
                properties:
                  lamports:
                    type: integer
                  data:
                    type: string  # Base64
                  owner:
                    type: string
                  executable:
                    type: boolean
                  rentEpoch:
                    type: integer
      required: [signature, message]
    
    TransactionRiskAssessment:
      type: object
      properties:
        riskLevel:
          type: string
          enum: [LOW, MEDIUM, HIGH, BLOCKED]
          description: Based on amount, address checks, instructions, behavior deviation
        flags:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                enum: [HIGH_AMOUNT, NEW_ADDRESS, BLACKLISTED, ANOMALOUS_INSTRUCTIONS, BEHAVIOR_DEVIATION]
              details:
                type: string
                example: "Amount exceeds user avg by 500%"
              score:
                type: number
                minimum: 0
                maximum: 1
        recommendation:
          type: string
          enum: [APPROVE, WARN, BLOCK]
        simulatedPreview:
          $ref: '#/components/schemas/SolanaTransaction/properties/simulationResult'
      required: [riskLevel, flags]
    
    # Phishing Schemas
    PhishingCheckRequest:
      type: object
      properties:
        url:
          type: string
          format: uri
          example: "https://fake-solana-dapp.com/sign"
        domain:
          type: string
          example: "fake-solana-dapp.com"
        context:
          type: string
          enum: [TRANSACTION_SIGN, DAPP_CONNECT, NFT_MINT]
      required: [url]
    
    PhishingCheckResponse:
      type: object
      properties:
        isPhishing:
          type: boolean
        threatScore:
          type: number
          minimum: 0
          maximum: 1
          description: Score from external DBs (e.g., PhishTank match)
        sources:
          type: array
          items:
            type: string
            enum: [PHISHTANK, SOLANA_THREAT_FEED, DOMAIN_BLACKLIST]
        details:
          type: string
          example: "Domain matches known phishing pattern for Solana dApps"
      required: [isPhishing, threatScore]
    
    # Wallet Schemas
    BalanceResponse:
      type: object
      properties:
        lamports:
          type: integer
          description: Native SOL balance
        tokens:
          type: array
          items:
            type: object
            properties:
              mint:
                type: string  # SPL token mint address
              decimals:
                type: integer
              amount:
                type: integer  # In token units
              symbol:
                type: string  # e.g., USDC
              metadata:
                type: object  # For NFTs
                properties:
                  name:
                    type: string
                  uri:
                    type: string  # Metadata JSON URI
        nftCount:
          type: integer
      required: [lamports]
    
    TransactionHistory:
      type: array
      items:
        type: object
        properties:
          signature:
            type: string
          blockTime:
            type: integer
            format: unix-timestamp
          fee:
            type: integer
          status:
            type: string
            enum: [CONFIRMED, FAILED]
          decoded:
            type: object
            properties:
              type:
                type: string
                enum: [TRANSFER, SWAP, NFT_MINT, DEFI_INTERACT]
              from:
                type: string
              to:
                type: string
              amount:
                type: number
paths:
  # Auth Endpoints (WebAuthn for Biometrics)
  /auth/register:
    post:
      summary: Register new user with WebAuthn biometric setup
      description: Initiate WebAuthn registration for biometric login (fingerprint/FaceID/TouchID/Windows Hello). Stores public key in DB.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                username:
                  type: string
                walletAddress:
                  type: string
                  description: Solana wallet public key (client-generated)
              required: [email, walletAddress]
      responses:
        '200':
          description: WebAuthn challenge for registration
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebAuthnChallenge'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
        '409':
          description: User already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /auth/register/credential:
    post:
      summary: Complete WebAuthn registration with credential
      description: Submit WebAuthn credential to verify and store biometric public key. Issues initial JWT.
      security: []  # No auth yet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebAuthnCredential'
      responses:
        '200':
          description: Registration successful, returns JWT and user info
          content:
            application/json:
              schema:
                type: object
                properties:
                  jwt:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        '401':
          description: Invalid credential
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /auth/login/challenge:
    post:
      summary: Get WebAuthn challenge for biometric login
      description: Provides challenge for existing user's biometric authentication.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
              required: [email]
      responses:
        '200':
          description: Challenge for login
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebAuthnChallenge'
        '404':
          description: User not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /auth/login/verify:
    post:
      summary: Verify WebAuthn credential for login
      description: Authenticate biometric credential and issue JWT session token.
      security: []  # No auth yet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebAuthnCredential'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  jwt:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        '401':
          description: Invalid or expired credential
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  # Wallet Endpoints
  /wallet/balance/{address}:
    get:
      summary: Get wallet balance (SOL + SPL tokens/NFTs)
      description: Fetches balance via Solana RPC, including SPL tokens and NFT metadata. Supports DeFi token decoding.
      parameters:
        - name: address
          in: path
          required: true
          schema:
            type: string
            description: Base58 Solana address
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Balance details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BalanceResponse'
        '400':
          description: Invalid address
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
        '404':
          description: Wallet not associated with user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /wallet/transactions/{address}:
    get:
      summary: Get transaction history
      description: Retrieves and decodes recent transactions, including SPL transfers, NFT mints, DeFi interactions. Limited to user-associated wallets.
      parameters:
        - name: address
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            minimum: 1
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Transaction history
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransactionHistory'
        '400':
          description: Invalid params
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  # Safe Mode Endpoints
  /safe/assess-transaction:
    post:
      summary: Assess transaction risk in Safe Mode
      description: Simulates transaction via Solana RPC, flags risks (high amounts > user avg, new/blacklisted addresses, anomalous instructions, behavior deviations), and provides warnings/blocks.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                unsignedTx:
                  type: string
                  description: Base64-encoded unsigned Solana transaction blob
                walletAddress:
                  type: string
                context:
                  type: string
                  enum: [DAPP_SIGN, MANUAL_SEND, DEFI_SWAP]
              required: [unsignedTx, walletAddress]
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Risk assessment
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransactionRiskAssessment'
        '400':
          description: Invalid transaction
        '429':
          description: Rate limit for simulations
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
        '500':
          description: RPC simulation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /safe/user-behavior:
    get:
      summary: Get user behavior profile for Safe Mode
      description: Retrieves anonymized profile for baseline risk calculations (e.g., avg tx patterns).
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Behavior profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User/properties/behaviorProfile'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /safe/update-behavior:
    post:
      summary: Update user behavior after confirmed transaction
      description: Logs successful tx to refine behavior model (e.g., update avg amount/frequency). Called post-signing.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                signature:
                  type: string
                amount:
                  type: integer  # Lamports
                type:
                  type: string
                  enum: [TRANSFER, SWAP, NFT]
              required: [signature, amount]
      security:
        - bearerAuth: []
      responses:
        '204':
          description: Updated successfully
        '400':
          description: Invalid data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  # Phishing Prevention Endpoints
  /phish/check:
    post:
      summary: Check URL/domain for phishing threats
      description: Validates URL against PhishTank, Solana threat feeds, and domain patterns. Provides simulation preview integration.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PhishingCheckRequest'
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Phishing check result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PhishingCheckResponse'
        '400':
          description: Invalid URL
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
        '503':
          description: External service unavailable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  # User Management
  /users/me:
    get:
      summary: Get current user profile
      description: Fetches user details, including wallet and behavior profile.
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiError'
  
  /users/{id}:
    get:
      summary: Get user by ID (admin only, for support)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '403':
          description: Forbidden (non-admin)
        '404':
          description: User not found
tags:
  - name: Auth
    description: Biometric WebAuthn authentication
  - name: Wallet
    description: Solana wallet balances and history (SPL/NFT/DeFi support)
  - name: Safe Mode
    description: Transaction risk assessment and behavior tracking
  - name: Phishing
    description: URL and threat validation
  - name: Users
    description: User profile management
```

## Implementation Notes

- **Security**: All endpoints use HTTPS. WebAuthn challenges are unique per request (stored in Redis for 60s expiry). JWTs include claims for walletAddress and exp (24h). Transaction assessments use server-side Solana RPC proxy to avoid client exposure.
- **Solana Integration**: Uses `@solana/web3.js` for decoding/simulations. Flags: High amount (>3x user avg), new addresses (no prior tx), blacklisted (via backend DB synced from feeds), instructions (e.g., unusual program calls), behavior (deviation score via simple z-score on tx data).
- **Database Schemas (Prisma Reference)**: Users table with encrypted credential IDs, BehaviorProfiles table for analytics, TransactionLogs for history (non-custodial—signatures only).
- **Error Handling**: Standardized ApiError with Solana-specific codes (e.g., RPC_ERROR for cluster issues).
- **Rate Limiting**: 100 req/min per IP/JWT for /safe/assess, 10/min for phishing checks.
- **Testing**: Endpoints support devnet RPC for simulations. Coordinate with FrontendDev for WebAuthn payload handling in Next.js.
- **Deployment**: Dockerized Express app on AWS Fargate, with Prisma migrations for PostgreSQL.

This spec is versioned and can be imported into Swagger UI for interactive testing. For updates, reference unique ID: 1763624900470_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__backend__apis_openapi_md_tbbeyd.