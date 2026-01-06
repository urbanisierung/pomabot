# Memory Optimization Deployment Notes

## Issue
Application crashed on Fly.io with 256MB RAM allocation due to out-of-memory errors.

## Root Cause
1. **Unbounded Signal History**: Each market's signal history array grew indefinitely
2. **No Market Cleanup**: Expired/resolved markets remained in memory
3. **No Memory Limits**: Node.js heap was unconstrained

## Changes Made

### 1. Signal History Limit (`apps/api/src/services/trading.ts`)
```typescript
private readonly MAX_SIGNAL_HISTORY = 50;

// Trim signal history when it exceeds limit
if (state.signalHistory.length > this.MAX_SIGNAL_HISTORY) {
  state.signalHistory = state.signalHistory.slice(-this.MAX_SIGNAL_HISTORY);
}
```

### 2. Market Cleanup (`apps/api/src/services/trading.ts`)
```typescript
private readonly MARKET_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

private cleanupExpiredMarkets(): void {
  // Removes markets that are:
  // - Past their close date
  // - Resolved
  // - Have resolution outcome
}
```

### 3. Node.js Memory Limit (`Dockerfile`)
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=200"
```

### 4. Memory Monitoring (`apps/api/src/services/trading.ts`)
```typescript
const memUsage = process.memoryUsage();
console.log(`Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap`);
```

## Expected Results

### Before
- Memory: Grows to 256MB+ and crashes
- Signal History: Unlimited growth per market
- Markets: Never removed from memory
- Monitoring: No visibility

### After
- Memory: ~150-180MB heap (within limits)
- Signal History: Max 50 signals per market
- Markets: Cleaned up every 5 minutes
- Monitoring: Regular memory logs

## Deployment Steps

1. **Build the Docker image**:
   ```bash
   docker build -t pomabot .
   ```

2. **Test locally** (optional):
   ```bash
   docker run -m 256m -e POLL_INTERVAL=10000 pomabot
   ```

3. **Deploy to Fly.io**:
   ```bash
   fly deploy
   ```

4. **Monitor logs**:
   ```bash
   fly logs
   ```
   
   Look for:
   - Memory usage logs after each cycle
   - Market cleanup logs every 5 minutes
   - No OOM crashes

## Monitoring Checklist

After deployment, verify:
- [ ] Application starts successfully
- [ ] Memory logs show ~150-180MB heap usage
- [ ] Market cleanup runs every 5 minutes
- [ ] No out-of-memory crashes
- [ ] API endpoints respond correctly
- [ ] Trading cycles complete successfully

## Rollback Plan

If issues occur:
1. Check Fly.io logs: `fly logs`
2. If crashes persist, temporarily increase memory:
   ```bash
   fly scale memory 512
   ```
3. Investigate specific cause
4. Roll back to previous version if needed:
   ```bash
   fly deploy --image <previous-image>
   ```

## Configuration

All settings can be adjusted via environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_OPTIONS` | `--max-old-space-size=200` | Node.js heap size (MB) |
| `POLL_INTERVAL` | `60000` | Polling interval (ms) |

Adjust in `fly.toml` or via `fly secrets set` as needed.

## Additional Resources

- `MEMORY_OPTIMIZATION.md` - Detailed technical documentation
- `apps/api/src/memory-optimization.test.ts` - Test coverage
- Fly.io metrics dashboard for real-time monitoring
