# Helius RPC Integration

## ✅ Integration Complete

Helius RPC has been integrated into the backend for:
1. **Main RPC Endpoint** - For balance queries, transaction simulation
2. **Parsed Transaction History API** - For enriched transaction data

## Configuration

### Update `.env` file in `backend/` directory:

Add these lines to your `.env` file:

```env
# Helius RPC Configuration
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=23f69914-c7a0-4577-af0c-221536a2f792
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=23f69914-c7a0-4577-af0c-221536a2f792
HELIUS_API_URL=https://api-mainnet.helius-rpc.com
HELIUS_API_KEY=23f69914-c7a0-4577-af0c-221536a2f792
```

## What Was Added

### 1. Helius Service (`backend/src/services/heliusService.ts`)
- `getParsedTransactionHistory()` - Fetches enriched transaction data
- `parseTransaction()` - Parses Helius transaction format
- Handles native transfers, token transfers, NFT transfers
- Extracts transaction types, fees, and instruction details

### 2. Updated Solana Service
- Added `getParsedTransactionHistory()` method
- Automatically uses Helius API with fallback to standard RPC
- Returns enriched transaction data with parsed information

### 3. Updated Wallet Routes
- `/api/v1/wallet/transactions/:address` now uses Helius by default
- Query parameter `?helius=false` to disable Helius and use database
- Returns parsed transaction data with:
  - Transaction type
  - Native SOL transfers
  - Token transfers (SPL tokens)
  - NFT transfers
  - Instruction details
  - Fees and timestamps

## API Usage

### Get Transaction History (with Helius parsing)

```bash
GET /api/v1/wallet/transactions/:address?limit=50&helius=true
```

**Response includes:**
- `signature` - Transaction signature
- `timestamp` - Block timestamp
- `type` - Transaction type (TRANSFER, SWAP, NFT_MINT, etc.)
- `parsed` - Parsed transaction details:
  - `amount` - SOL amount transferred
  - `from` / `to` - Addresses
  - `tokens` - Token transfers array
  - `nfts` - NFT transfers array
  - `fee` - Transaction fee
- `nativeTransfers` - Native SOL transfers
- `tokenTransfers` - SPL token transfers
- `nftTransfers` - NFT transfers
- `instructions` - Decoded instructions

## Benefits of Helius Integration

1. **Enriched Data** - Pre-parsed transaction information
2. **Better Performance** - Optimized API endpoints
3. **Transaction Types** - Automatic classification (TRANSFER, SWAP, etc.)
4. **Token Support** - Built-in SPL token parsing
5. **NFT Support** - Automatic NFT transfer detection
6. **Instruction Decoding** - Pre-decoded program instructions

## Testing

To test the integration:

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Make a request to get transaction history:
   ```bash
   curl http://localhost:3001/api/v1/wallet/transactions/YOUR_ADDRESS \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. The response will include Helius-parsed transaction data

## Fallback Behavior

If Helius API fails or is unavailable, the system automatically falls back to:
- Standard Solana RPC for transaction fetching
- Database-stored transactions if available

This ensures the application continues to work even if Helius has issues.



