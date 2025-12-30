# Phase 4 Testing Script

Automated verification tool for Phase 4: Real Trading Execution implementation.

## Overview

The `test-phase4.ts` script automatically verifies all items from the Phase 4 testing checklist:

1. ✅ Environment configuration
2. ✅ Wallet connection and signing
3. ✅ CLOB authentication
4. ✅ Token allowances (informational)
5. ✅ Safety controls
6. ✅ Kill switch functionality
7. ✅ Order placement system (dry-run)

## Usage

### Prerequisites

Set up your environment variables:

```bash
# Required for live testing
export WALLET_PRIVATE_KEY="0x..."

# Optional configuration (defaults shown)
export CHAIN_ID=137                    # Polygon mainnet
export POLYGON_RPC_URL="https://polygon-rpc.com"
export MAX_POSITION_SIZE=100           # Max USDC per position
export DAILY_LOSS_LIMIT=50             # Max daily loss
export MAX_OPEN_POSITIONS=5            # Max concurrent positions
```

### Run the Test

```bash
# From the repository root
pnpm --filter @pomabot/api test:phase4

# Or from apps/api directory
cd apps/api
pnpm test:phase4
```

### Expected Output

The script will run through all tests and provide colored output:

```
╔═══════════════════════════════════════════════╗
║   Phase 4 Testing Script - CLOB Integration  ║
╚═══════════════════════════════════════════════╝

[1/7] Testing Environment Configuration...
  ✓ WALLET_PRIVATE_KEY: configured
  ✓ CHAIN_ID: 137
  ✓ MAX_POSITION_SIZE: 100
  ✓ DAILY_LOSS_LIMIT: 50
  ✓ MAX_OPEN_POSITIONS: 5

[2/7] Testing Wallet Connection and Signing...
  ✓ Wallet initialized
  ✓ Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  ✓ Message signing works
  ✓ Signature: 0x1234567890abcdef...
  ✓ EIP-712 signing works
  ✓ Typed signature: 0xfedcba9876543210...

[3/7] Testing CLOB Authentication...
  ✓ Polymarket connector initialized
  ✓ CLOB authentication successful
  ✓ API credentials derived from wallet signature

[4/7] Testing Token Allowances (informational)...
  ⚠ Token allowances must be set manually via Polymarket interface
    Required tokens:
      • USDC: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
      • CTF: 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
      • Exchange: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
      • Neg Risk Exchange: 0xC5d563A36AE78145C45a50134d48A1215220f80a

[5/7] Testing Safety Controls...
  ✓ Safety controls initialized
  ✓ Position size check passed (50 USDC)
  ✓ Position size limit works (blocks 500 USDC position)
  ✓ Position tracking works
  ✓ Duplicate position prevention works
  ✓ Daily P&L tracking: 0.00 USDC
  ✓ Open positions: 1/5

[6/7] Testing Kill Switch...
  ✓ Trading initially enabled
  ✓ Kill switch activation works
  ✓ Kill switch blocks trades
  ✓ Kill switch deactivation works

[7/7] Testing Order Placement (dry-run)...
  ✓ Test market found: Will Bitcoin reach $100k by EOY?...
  ⚠ Note: Order submission skipped in test mode
  ⚠ To test real order placement, use minimal position size ($1-5)

═══════════════════════════════════════════════
Test Summary
═══════════════════════════════════════════════

✓ Environment Configuration
   All required environment variables configured
   Details: Optional vars: CHAIN_ID=137, MAX_POSITION_SIZE=100

✓ Wallet Connection and Signing
   Wallet connection and signing successful
   Details: Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

✓ CLOB Authentication
   CLOB authentication successful
   Details: API credentials derived and ready for trading

✓ Token Allowances
   Token allowance check complete (manual setup required)
   Details: User must set allowances via Polymarket interface before live trading

✓ Safety Controls
   All safety control checks passed
   Details: Limits: 5 positions, $50 daily loss

✓ Kill Switch
   Kill switch functionality verified
   Details: Can activate and deactivate emergency stop

✓ Order Placement
   Order placement system verified (dry-run)
   Details: CLOB authenticated and ready for order submission

═══════════════════════════════════════════════
Results: 7/7 tests passed (100%)
═══════════════════════════════════════════════

✅ All tests passed! Phase 4 implementation verified.
Ready for live trading with proper configuration.
```

## Test Details

### 1. Environment Configuration
Checks that all required and optional environment variables are set correctly.

### 2. Wallet Connection and Signing
- Initializes wallet from private key
- Tests plain message signing (for CLOB authentication)
- Tests EIP-712 typed data signing (for orders)

### 3. CLOB Authentication
- Connects to Polymarket CLOB API
- Derives API credentials from wallet signature
- Verifies authentication success

### 4. Token Allowances
Provides informational output about required token approvals. These must be set manually via the Polymarket interface before live trading.

### 5. Safety Controls
- Tests position size limits
- Tests daily loss tracking
- Tests position tracking
- Tests duplicate position prevention
- Verifies P&L calculations

### 6. Kill Switch
- Tests kill switch activation
- Verifies trades are blocked when active
- Tests kill switch deactivation
- Confirms trading resumes after deactivation

### 7. Order Placement
- Fetches real market data
- Verifies CLOB is ready for order submission
- Does NOT submit real orders (dry-run only)

## Running Without WALLET_PRIVATE_KEY

If `WALLET_PRIVATE_KEY` is not set, the script will run in simulation mode and skip tests that require a wallet:

```bash
pnpm --filter @pomabot/api test:phase4
```

Output:
```
[1/7] Testing Environment Configuration...
  ⚠ WALLET_PRIVATE_KEY not set - running in simulation mode

[2/7] Testing Wallet Connection and Signing...
  ⚠ Skipped - no WALLET_PRIVATE_KEY

[3/7] Testing CLOB Authentication...
  ⚠ Skipped - wallet not initialized
```

## Troubleshooting

### "CLOB authentication failed"
- Verify `WALLET_PRIVATE_KEY` is correct
- Ensure wallet has MATIC for gas fees
- Check network connectivity

### "Position size limit works" fails
- Check `MAX_POSITION_SIZE` is set correctly
- Verify safety controls are initialized properly

### "Kill switch" tests fail
- Ensure safety controls are initialized
- Check test order and dependencies

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed or fatal error occurred

## Integration with CI/CD

You can integrate this test into your CI/CD pipeline:

```yaml
# .github/workflows/test-phase4.yml
name: Phase 4 Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm --filter @pomabot/api test:phase4
        env:
          WALLET_PRIVATE_KEY: ${{ secrets.WALLET_PRIVATE_KEY }}
```

## Safety Notes

⚠️ **Important:**
- This script does NOT submit real orders to the CLOB
- It only verifies that the system is ready for order submission
- For real order testing, manually place small orders ($1-5) first
- Always test with minimal position sizes before scaling up

## See Also

- [PHASE4_IMPLEMENTATION.md](../../PHASE4_IMPLEMENTATION.md) - Full implementation guide
- [ROADMAP.md](../../ROADMAP.md) - Phase 4 requirements and checklist
