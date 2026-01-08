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
      (market.closes_at && market.closes_at < now) ||
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

### Before Optimization (Original)
- Memory grows indefinitely
- App crashes when hitting 256MB limit (OOM killed by Fly.io)
- No cleanup of old data
- Unknown memory usage patterns
- All 1000+ markets tracked regardless of liquidity

### After Optimization (v2 - January 2026)
- Bounded memory growth (~100-150MB heap target)
- Multi-tier cleanup: regular, aggressive, and emergency
- Market limit of 400-500 highest-liquidity markets
- Signal history limited to 20-25 per market
- Predictable memory footprint
- Clear visibility into memory usage

## Memory Budget (256MB Container)

| Component | Allocation | Usage |
|-----------|-----------|-------|
| Node.js Heap | 180 MB | Application data, market states, signals |
| V8 Internals | ~40 MB | Code, JIT compilation, native objects |
| OS/System | ~36 MB | Operating system overhead |
| **Total** | **256 MB** | **Container limit** |

## Configuration

All settings are configurable via environment variables:

```bash
# Dockerfile / fly.toml defaults
MAX_MARKETS=400                    # Maximum markets to track
MIN_LIQUIDITY=15000                # Minimum liquidity filter ($)
MAX_SIGNAL_HISTORY=20              # Signals to keep per market
NODE_OPTIONS="--max-old-space-size=180 --expose-gc --optimize-for-size"
```

### Memory Thresholds

```typescript
MEMORY_CRITICAL_THRESHOLD = 150 MB  // Triggers aggressive cleanup
MEMORY_EMERGENCY_THRESHOLD = 180 MB // Triggers emergency cleanup
```

## Cleanup Tiers

### 1. Regular Cleanup (every 2 minutes)
- Remove expired/closed markets
- Clean up news aggregator fetch timestamps older than 24h

### 2. Aggressive Cleanup (when heap > 150MB)
- Reduce signal history to 10 per market
- Trim belief unknowns to 3 max
- Remove paper trading positions older than 3 days
- Drop markets exceeding MAX_MARKETS limit

### 3. Emergency Cleanup (when heap > 180MB)
- Clear ALL signal histories
- Keep only top 50% markets by liquidity
- Clear all belief unknowns
- Remove all resolved paper trading positions
- Force garbage collection

## Testing

Memory simulation tests in `apps/api/src/memory-simulation.test.ts`:
- Market state memory growth measurement
- Signal history accumulation patterns
- Full monitoring loop simulation
- 256MB container limit scenario
- Realistic production load simulation

## Monitoring

To monitor memory usage in production:

1. Check logs for periodic memory reports after each monitoring cycle:
   ```
   ✓ Processed 400 markets (8000 signals in memory)
      Memory: 120MB heap / 180MB RSS
   ```

2. Check logs for cleanup reports:
   ```
   🧹 Cleaned up 15 expired markets (385 remaining)
   ⚠️ Memory pressure detected (155MB > 150MB threshold)
   🧹 Performing aggressive memory cleanup...
   ```

3. Monitor Fly.io metrics dashboard for memory usage trends

4. Watch for emergency cleanup triggers in logs

## Changelog

### v2 (January 2026)
- Reduced MAX_SIGNAL_HISTORY from 50 to 20-25
- Added MAX_MARKETS limit (400-500)
- Added MIN_LIQUIDITY filter ($15,000)
- Reduced heap limit from 200MB to 180MB
- Added emergency cleanup tier
- Added belief unknowns limit
- Added news aggregator fetch time cleanup
- More frequent cleanup intervals (2 min vs 5 min)
- Added --expose-gc and --optimize-for-size Node flags
- Trade history limited to 100 records from last 7 days

### v1 (Original)
- Signal history limit of 50
- Market cleanup every 5 minutes
- Basic memory pressure detection at 180MB
