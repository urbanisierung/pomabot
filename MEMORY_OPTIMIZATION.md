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

### After Optimization (v3 - January 2026)
- Bounded memory growth (~80-120MB heap target)
- Multi-tier cleanup: regular, aggressive, and emergency
- Market limit of 300 highest-liquidity markets (reduced from 400)
- Signal history limited to 15 per market (reduced from 20)
- More frequent cleanup (every 1 minute vs 2 minutes)
- More aggressive cleanup thresholds (120MB/140MB vs 150MB/180MB)
- Optimized array operations (splice vs slice+push)
- Predictable memory footprint
- Clear visibility into memory usage

## Memory Budget (256MB Container)

| Component | Allocation | Usage |
|-----------|-----------|-------|
| Node.js Heap | 160 MB | Application data, market states, signals (reduced from 180MB) |
| V8 Internals | ~50 MB | Code, JIT compilation, native objects |
| OS/System | ~46 MB | Operating system overhead |
| **Total** | **256 MB** | **Container limit** |

## Configuration

All settings are configurable via environment variables:

```bash
# Dockerfile / fly.toml defaults (v3)
MAX_MARKETS=300                    # Maximum markets to track (reduced from 400)
MIN_LIQUIDITY=15000                # Minimum liquidity filter ($)
MAX_SIGNAL_HISTORY=15              # Signals to keep per market (reduced from 20)
NODE_OPTIONS="--max-old-space-size=160 --expose-gc"  # 160MB heap (reduced from 180)
```

### Memory Thresholds

```typescript
MEMORY_CRITICAL_THRESHOLD = 120 MB  // Triggers aggressive cleanup (reduced from 150MB)
MEMORY_EMERGENCY_THRESHOLD = 140 MB // Triggers emergency cleanup (reduced from 180MB)
```

## Cleanup Tiers

### 1. Regular Cleanup (every 1 minute)
- Remove expired/closed markets
- Clean up news aggregator fetch timestamps older than 24h
- More frequent than v2 (1 min vs 2 min)

### 2. Aggressive Cleanup (when heap > 120MB)
- Reduce signal history to 5 per market (more aggressive)
- Trim belief unknowns to 2 max (more aggressive)
- Remove paper trading positions older than 1 day (more aggressive)
- Drop markets exceeding 80% of MAX_MARKETS limit
- Clear missed opportunities

### 3. Emergency Cleanup (when heap > 140MB)
- Clear ALL signal histories
- Keep only top 40% markets by liquidity (more aggressive)
- Clear all belief unknowns
- Remove all resolved paper trading positions
- Clear trade history records
- Clear missed opportunities
- Force garbage collection (2x)

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

### v3 (January 2026) - Aggressive Memory Reduction
- **Further reduced MAX_SIGNAL_HISTORY** from 20 to 15 per market
- **Reduced MAX_MARKETS** from 400 to 300 
- **Reduced heap limit** from 180MB to 160MB for better headroom
- **More aggressive cleanup thresholds**: 120MB (critical) and 140MB (emergency), down from 150MB/180MB
- **More frequent cleanup**: Every 1 minute (was 2 minutes)
- **Optimized array operations**: Use splice() instead of slice()+push() to reduce allocations
- **More aggressive cleanup actions**:
  - Aggressive: Reduce signals to 5 (was 10), unknowns to 2 (was 3), keep 80% of markets
  - Emergency: Keep only 40% of markets (was 50%), double GC pass, clear trade history
- **Target memory usage**: 80-120MB heap (was 100-150MB)

### v2 (January 2026)
- Reduced MAX_SIGNAL_HISTORY from 50 to 20-25
- Added MAX_MARKETS limit (400-500)
- Added MIN_LIQUIDITY filter ($15,000)
- Reduced heap limit from 200MB to 180MB
- Added emergency cleanup tier
- Added belief unknowns limit
- Added news aggregator fetch time cleanup
- More frequent cleanup intervals (2 min vs 5 min)
- Added --expose-gc Node flag
- Trade history limited to 100 records from last 7 days

### v1 (Original)
- Signal history limit of 50
- Market cleanup every 5 minutes
- Basic memory pressure detection at 180MB
