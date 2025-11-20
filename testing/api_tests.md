# API Tests for Secure Solana Wallet Backend

This document outlines comprehensive, production-ready API endpoint tests for the backend of the Secure Solana Wallet application. These tests focus on validating the Node.js + Express server logic, integration with PostgreSQL via Prisma ORM, and interactions with Solana RPC endpoints. Tests are designed using Jest as the testing framework, Supertest for HTTP assertions, and mocks for external dependencies like Solana RPC (via `@solana/web3.js` mocks) and phishing databases (e.g., simulated PhishTank API).

The tests ensure:
- **Security**: Proper authentication (JWT-based post-biometric verification), rate limiting, and safe mode flagging for suspicious transactions.
- **Functionality**: Wallet operations (balance retrieval, SPL token/NFT support), transaction simulation with risk warnings, phishing prevention via URL validation and external checks.
- **Edge Cases**: Handling of large transactions, blacklisted addresses, unusual instructions, and behavioral deviations (e.g., mocked user analytics).
- **Integration**: Solana-specific features like program-derived addresses (PDAs), transaction decoding, and optional hardware wallet metadata (Ledger/YubiKey compatibility checks).
- **Cross-Platform Alignment**: APIs are RESTful, documented for FrontendDev consumption (e.g., Next.js integration via API routes), and support web app/browser extension payloads.

All tests assume a test database (PostgreSQL in-memory via Prisma's SQLite fallback for CI/CD) and environment variables like `JWT_SECRET`, `SOLANA_RPC_URL` (mocked), and `PHISHING_DB_API_KEY`.

## Setup and Prerequisites

### Installation
Run the following to set up testing dependencies:

```bash
npm install --save-dev jest supertest @types/jest @types/supertest nock sinon prisma @prisma/client @solana/web3.js
```

### Test Configuration
In `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/testing/**',
  ],
};
```

### Mocking Strategy
- **Solana RPC**: Use `nock` to intercept `@solana/web3.js` calls (e.g., `getBalance`, `simulateTransaction`).
- **External Phishing DB**: Mock responses from PhishTank or custom blockchain threat feeds.
- **Database**: Use Prisma's transaction rollback in tests to isolate changes.
- **Biometric/WebAuthn**: Client-side, but backend tests verify JWT issuance after simulated credential assertion.
- **Hardware Wallet**: Mock WebUSB/HID responses for Ledger/YubiKey compatibility checks.

### Global Setup (`src/testing/setup.ts`)
```typescript
import { PrismaClient } from '@prisma/client';
import nock from 'nock';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Seed test users and wallets
  await prisma.user.create({
    data: { id: 'test-user', email: 'user@test.com', solanaAddress: 'TestSolanaPubkey' },
  });
  nock('https://api.mainnet-beta.solana.com') // Mock Solana RPC
    .persist()
    .post('/').reply(200, { jsonrpc: '2.0', result: { value: 1000000000 } }); // Example balance
});

afterEach(async () => {
  await prisma.$transaction(async (tx) => {
    await tx.user.deleteMany();
    await tx.transactionFlag.deleteMany();
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Test Suites

### 1. Authentication APIs
These test JWT issuance after biometric login (backend verifies WebAuthn challenge-response). Endpoints: `POST /auth/login`, `POST /auth/verify-biometric`.

#### Test: Successful Biometric Login (WebAuthn Credential)
```typescript
import request from 'supertest';
import app from '../../src/app'; // Your Express app
import jwt from 'jsonwebtoken';

describe('Authentication APIs', () => {
  it('should issue JWT after valid WebAuthn biometric verification', async () => {
    const mockWebAuthnResponse = {
      id: 'mock-credential-id',
      rawId: Buffer.from('mock-raw-id').toString('base64'),
      response: {
        authenticatorData: 'mock-data',
        clientDataJSON: Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: 'mock-challenge' })).toString('base64'),
        signature: 'mock-signature',
        userHandle: 'test-user-handle',
      },
      type: 'public-key',
    };

    const res = await request(app)
      .post('/auth/verify-biometric')
      .set('Authorization', 'Bearer mock-pre-challenge-jwt') // Simulated pre-biometric JWT
      .send({ webauthnResponse: mockWebAuthnResponse, biometricType: 'FaceID' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!);
    expect(decoded).toHaveProperty('userId', 'test-user');
  });

  it('should reject invalid biometric signature', async () => {
    const invalidResponse = { /* tampered mock */ };
    await request(app)
      .post('/auth/verify-biometric')
      .send({ webauthnResponse: invalidResponse })
      .expect(401)
      .expect((res) => expect(res.body.error).toBe('Invalid biometric verification'));
  });
});
```

#### Test: Session Refresh with Hardware Wallet Check
For optional Ledger/YubiKey: Tests `POST /auth/refresh` with hardware metadata.

```typescript
it('should refresh token with Ledger hardware wallet attachment', async () => {
  nock('https://ledger-api.mock') // Mock Ledger verification
    .post('/verify').reply(200, { attached: true, model: 'Nano S' });

  const res = await request(app)
    .post('/auth/refresh')
    .set('Authorization', 'Bearer valid-jwt')
    .send({ hardwareWallet: { type: 'Ledger', attached: true } })
    .expect(200);

  expect(res.body).toHaveProperty('newToken');
  expect(res.body.hardwareVerified).toBe(true);
});
```

### 2. Wallet Management APIs
Endpoints: `GET /wallet/balance/:address`, `POST /wallet/create`, `GET /wallet/assets` (SPL tokens, NFTs).

#### Test: Retrieve Balance with SPL Token Support
```typescript
import { Connection, PublicKey } from '@solana/web3.js';

describe('Wallet APIs', () => {
  it('should fetch SOL and SPL token balances successfully', async () => {
    const testAddress = 'TestSolanaPubkey';
    // Mock Solana RPC for balance and token accounts
    nock('https://api.mainnet-beta.solana.com')
      .post('/')
      .reply(200, {
        jsonrpc: '2.0',
        result: {
          value: 500000000, // 0.5 SOL
          context: { slot: 12345 },
        },
      })
      .post('/')
      .reply(200, {
        jsonrpc: '2.0',
        result: [{ pubkey: new PublicKey('SPLTokenAccount'), account: { data: { parsed: { info: { tokenAmount: { uiAmount: 100 } } } } } }],
      });

    const res = await request(app)
      .get(`/wallet/balance/${testAddress}`)
      .set('Authorization', 'Bearer valid-jwt')
      .expect(200);

    expect(res.body).toHaveProperty('solBalance', 0.5);
    expect(res.body.tokens).toContainEqual({ mint: expect.any(String), amount: 100 });
  });

  it('should handle NFT metadata fetch for wallet assets', async () => {
    nock('https://api.metaplex.com') // Mock NFT metadata
      .get('/nft/TestNFT').reply(200, { name: 'Test NFT', image: 'ipfs://mock' });

    const res = await request(app)
      .get('/wallet/assets')
      .set('Authorization', 'Bearer valid-jwt')
      .expect(200);

    expect(res.body.nfts).toHaveLength(1);
    expect(res.body.nfts[0]).toHaveProperty('name', 'Test NFT');
  });

  it('should create new wallet with PDA derivation', async () => {
    const res = await request(app)
      .post('/wallet/create')
      .set('Authorization', 'Bearer valid-jwt')
      .send({ seedPhrase: 'mock-12-word-phrase', usePDA: true })
      .expect(201);

    expect(res.body).toHaveProperty('solanaAddress');
    expect(res.body.isPDA).toBe(true);
    // Verify in DB via Prisma
    const wallet = await prisma.wallet.findUnique({ where: { address: res.body.solanaAddress } });
    expect(wallet).not.toBeNull();
  });
});
```

### 3. Transaction APIs with Safe Mode
Endpoints: `POST /transactions/simulate`, `POST /transactions/send`, `POST /transactions/flag-risk`.

Safe Mode tests flag based on: amount > threshold (e.g., >1 SOL), first-time/blacklisted addresses, unusual instructions (e.g., non-standard SPL transfers), behavioral deviations (mocked via user history).

#### Test: Simulate Transaction with Risk Flagging
```typescript
describe('Transaction APIs', () => {
  it('should simulate transaction and flag as risky (large amount + blacklisted address)', async () => {
    const mockTx = {
      fromPubkey: 'UserPubkey',
      toPubkey: 'BlacklistedAddress', // Simulated blacklist
      amount: 5, // 5 SOL > threshold
      instructions: [{ programId: 'UnusualProgram', data: 'suspicious' }],
    };

    // Mock Solana simulation
    nock('https://api.mainnet-beta.solana.com')
      .post('/')
      .reply(200, {
        jsonrpc: '2.0',
        result: { err: null, logs: ['Simulation success'], accounts: null },
      });

    // Mock phishing DB
    nock('https://phishtank.org/api')
      .get('/check/BlacklistedAddress').reply(200, { isPhishing: true });

    const res = await request(app)
      .post('/transactions/simulate')
      .set('Authorization', 'Bearer valid-jwt')
      .send(mockTx)
      .expect(200);

    expect(res.body.risks).toContain('largeAmount');
    expect(res.body.risks).toContain('blacklistedAddress');
    expect(res.body.risks).toContain('unusualInstructions');
    expect(res.body.warning).toBe('Transaction blocked in Safe Mode. Review: Phishing risk detected.');
    // Verify flag in DB
    const flag = await prisma.transactionFlag.findFirst({ where: { txHash: res.body.simulatedHash } });
    expect(flag?.riskLevel).toBe('high');
  });

  it('should block suspicious transaction based on user behavior deviation', async () => {
    // Mock user behavior: Normal is <1 tx/day; this is 10th in hour
    await prisma.userBehavior.create({ data: { userId: 'test-user', txCountHour: 10, normalThreshold: 1 } });

    const deviantTx = { /* high-volume tx */ };
    const res = await request(app)
      .post('/transactions/send')
      .set('Authorization', 'Bearer valid-jwt')
      .send(deviantTx)
      .expect(403);

    expect(res.body.error).toBe('Safe Mode: Unusual behavior detected. Transaction blocked.');
  });

  it('should decode DeFi transaction instructions and preview', async () => {
    const defiTx = { instructions: [{ programId: 'SerumDEX', data: 'swap-instruction' }] };
    nock('https://api.mainnet-beta.solana.com').post('/').reply(200, { /* decoded logs */ });

    const res = await request(app)
      .post('/transactions/simulate')
      .set('Authorization', 'Bearer valid-jwt')
      .send(defiTx)
      .expect(200);

    expect(res.body.decoded).toHaveProperty('action', 'DeFi Swap');
    expect(res.body.preview).toContain('Expected: Receive 100 USDC for 1 SOL');
  });

  it('should allow safe transaction (no flags) with phishing URL validation', async () => {
    const safeTx = { toPubkey: 'TrustedAddress', amount: 0.1, url: 'https://solana.com' };
    nock('https://phishtank.org/api').get('/check/https://solana.com').reply(200, { isPhishing: false });

    const res = await request(app)
      .post('/transactions/send')
      .set('Authorization', 'Bearer valid-jwt')
      .send(safeTx)
      .expect(200);

    expect(res.body).toHaveProperty('txSignature');
    expect(res.body.safeModePassed).toBe(true);
  });
});
```

### 4. Phishing Prevention APIs
Endpoints: `POST /phishing/validate-url`, `GET /phishing/threats/:address`.

#### Test: URL and Address Validation
```typescript
describe('Phishing Prevention APIs', () => {
  it('should validate URL and check against external DB', async () => {
    const res = await request(app)
      .post('/phishing/validate-url')
      .send({ url: 'https://fake-phish-site.com' })
      .expect(200);

    expect(res.body.isSafe).toBe(false);
    expect(res.body.threats).toContain('Domain mismatch with known Solana dApps');
  });

  it('should query threats for blacklisted address', async () => {
    nock('https://blockchain-threat-feed.mock')
      .get('/address/BlacklistedAddress').reply(200, { threats: ['Reported phishing drain'] });

    const res = await request(app)
      .get('/phishing/threats/BlacklistedAddress')
      .set('Authorization', 'Bearer valid-jwt')
      .expect(200);

    expect(res.body.threatLevel).toBe('high');
  });
});
```

## Running Tests
Execute with:
```bash
npm test -- --coverage  # Full suite with coverage
npm test -- testing/api_tests.ts  # Specific file
```

## Coverage and CI/CD Integration
- Aim for >90% coverage on backend routes.
- Integrate with GitHub Actions: Use Docker for PostgreSQL test container.
- Mock all external calls to ensure deterministic tests.

This test suite is tailored to the Secure Solana Wallet's unique features, ensuring robust backend validation for biometric-secured, safe-mode-protected transactions. For API contract updates, coordinate with FrontendDev. Unique ID: 1763624900518_secure_solana_wallet_with_biometric_login_and_advanced_safe_mode__testing_api_tests_md_7l98zn