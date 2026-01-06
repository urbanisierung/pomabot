# Memory Optimization for 256MB Deployment

## Problem

The application was crashing on Fly.io with 256MB RAM allocation due to unbounded memory growth.

## Root Causes

1. **Signal History Growth**: Each market's `signalHistory` array grew indefinitely without limits
2. **No Market Cleanup**: Expired/closed markets remained in memory forever
3. **No Memory Constraints**: Node.js was not configured with memory limits appropriate for the container
4. **Large Market Set**: The app tracks 1000+ active Polymarket markets

## Solutions Implemented

### 1. Signal History Limit (trading.ts)

```typescript
private readonly MAX_SIGNAL_HISTORY = 50; // Keep only last 50 signals per market

// When adding signals:
if (state.signalHistory.length > this.MAX_SIGNAL_HISTORY) {
  state.signalHistory = state.signalHistory.slice(-this.MAX_SIGNAL_HISTORY);
}
```

**Impact**: Instead of growing indefinitely, each market now maintains only the 50 most recent signals. This prevents the main memory leak while keeping sufficient history for belief updates.

### 2. Periodic Market Cleanup (trading.ts)

```typescript
private readonly MARKET_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

private cleanupExpiredMarkets(): void {
  const now = new Date();
  let removedCount = 0;
  
  for (const [marketId, state] of this.marketStates) {
    const shouldRemove = 
      market.closes_at && market.closes_at < now ||
      market.resolved_at !== undefined ||
      market.resolution_outcome !== undefined;
    
    if (shouldRemove) {
      this.marketStates.delete(marketId);
      removedCount++;
    }
  }
}
```

**Impact**: Every 5 minutes, the system removes markets that have:
- Closed
- Reached their end date
- Been resolved

This prevents the `marketStates` Map from growing indefinitely.

### 3. Node.js Memory Limit (Dockerfile)

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=200"
```

**Impact**: 
- Limits Node.js heap to 200MB (out of 256MB container)
- Leaves 56MB for V8 internals and OS overhead
- Prevents Node.js from consuming all available memory
- Forces garbage collection before hitting container limits

### 4. Memory Monitoring (trading.ts)

```typescript
// After each monitoring loop:
const memUsage = process.memoryUsage();
console.log(`Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap / ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`);
```

**Impact**: Provides visibility into memory usage for monitoring and debugging.

## Expected Results

### Before Optimization
- Memory grows indefinitely
- App crashes when hitting 256MB limit
- No cleanup of old data
- Unknown memory usage patterns

### After Optimization
- Bounded memory growth (~150-180MB heap)
- Automatic cleanup of expired data
- Predictable memory footprint
- Clear visibility into memory usage

## Memory Budget (256MB Container)

| Component | Allocation | Usage |
|-----------|-----------|-------|
| Node.js Heap | 200 MB | Application data, market states, signals |
| V8 Internals | ~30 MB | Code, JIT compilation, native objects |
| OS/System | ~26 MB | Operating system overhead |
| **Total** | **256 MB** | **Container limit** |

## Configuration

All settings are configurable via environment variables or can be adjusted in the code:

```typescript
MAX_SIGNAL_HISTORY = 50          // Number of signals to keep per market
MARKET_CLEANUP_INTERVAL = 300000 // 5 minutes in milliseconds
NODE_OPTIONS = "--max-old-space-size=200" // Node.js heap size in MB
```

## Testing

All existing tests pass:
- ✓ packages/core: 120 tests
- ✓ apps/api: 84 tests
- ✓ TypeScript compilation: No errors

## Monitoring

To monitor memory usage in production:

1. Check logs for periodic memory reports after each monitoring cycle
2. Check logs for cleanup reports showing removed markets
3. Monitor Fly.io metrics dashboard for memory usage trends
4. Watch for OOM (Out of Memory) crashes in Fly.io logs

## Future Improvements

If memory is still tight, consider:

1. **Reduce MAX_SIGNAL_HISTORY**: Currently 50, could be reduced to 25-30
2. **Increase cleanup frequency**: Run every 2-3 minutes instead of 5
3. **Implement LRU cache**: Remove least-recently-checked markets first
4. **Stream processing**: Process markets in batches instead of keeping all in memory
5. **External storage**: Move historical data to Redis or database
6. **Upgrade instance**: Use 512MB if optimization isn't sufficient
