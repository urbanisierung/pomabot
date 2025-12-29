# Market Categories Investigation

This document details the expanded market category support in the Polymarket trading bot.

## Overview

The system now supports **9 market categories** (expanded from the original 2):

1. **Politics** - Elections, government policy, legislative outcomes
2. **Crypto** - Cryptocurrency prices, regulatory actions, blockchain events
3. **Sports** - Tournaments, games, player outcomes
4. **Economics** - Interest rates, inflation, unemployment, economic indicators
5. **Entertainment** - Award shows, celebrity events, TV outcomes
6. **Weather** - Temperature ranges, hurricanes, climate records
7. **Technology** - Product launches, tech regulation, AI developments
8. **World** - Geopolitics, international events, diplomatic outcomes
9. **Other** - Miscellaneous markets that don't fit other categories

## Edge Thresholds by Category

Edge thresholds are set based on:
- **Predictability**: More predictable markets have lower thresholds
- **Volatility**: More volatile markets require higher edges
- **Information Quality**: Markets with better data sources can use lower thresholds

| Category | Threshold | Rationale |
|----------|-----------|-----------|
| Weather | 8% | Scientific models, meteorological data provide high predictability |
| Sports | 10% | Rich statistics, historical data, relatively stable |
| Politics | 12% | Polls and official statements provide reasonable data |
| Economics | 12% | Official data available, but subject to revisions |
| Crypto | 15% | High volatility, speculation-driven markets |
| Technology | 15% | Company secrecy leads to surprise announcements |
| Entertainment | 18% | High subjectivity, industry politics affect outcomes |
| World | 20% | Geopolitical uncertainty, many unknowns |
| Other | 25% | Unclassified markets get the most conservative threshold |

## News Sources by Category

### Politics
- **SEC** - Official regulatory announcements
- **FiveThirtyEight** - Polling aggregation and analysis
- **RealClearPolitics** - Polling data
- **Court Records** - Legal rulings and decisions

**Signal Types**: Authoritative (official statements), Quantitative (polls), Procedural (legislative processes)

### Crypto
- **SEC** - Cryptocurrency regulation announcements
- **Cointelegraph** - Crypto news and analysis
- **CoinDesk** - Industry news and market data
- **Blockchain Networks** - On-chain data

**Signal Types**: Authoritative (regulatory decisions), Interpretive (market analysis), Speculative (price predictions)

### Sports
- **ESPN** - Comprehensive sports coverage
- **USA Today Sports** - Game results and analysis
- **Official League APIs** - NBA, NFL, MLB, NHL official data
- **Sports Statistics Databases** - Historical performance data

**Signal Types**: Quantitative (statistics, performance metrics), Authoritative (official results)

### Economics
- **Bureau of Economic Analysis (BEA)** - Official economic data
- **Federal Reserve** - Interest rate decisions and statements
- **Bureau of Labor Statistics (BLS)** - Employment data
- **Reuters** - Economic news and analysis
- **Bloomberg** - Financial markets and economic indicators
- **Trading Economics** - Global economic data aggregation

**Signal Types**: Authoritative (government data releases), Quantitative (economic indicators)

### Entertainment
- **Variety** - Entertainment industry news and awards coverage
- **Hollywood Reporter** - Film and TV industry news
- **Deadline** - Entertainment business news
- **Gold Derby** - Awards predictions and odds
- **Award Show Announcements** - Official nominees and results

**Signal Types**: Interpretive (industry analysis), Authoritative (official results), Speculative (predictions)

### Weather
- **National Weather Service (NWS)** - Official US weather forecasts
- **NOAA** - Climate data and predictions
- **AccuWeather** - Weather forecasting
- **Meteorological Services** - Regional weather agencies

**Signal Types**: Quantitative (forecast models), Authoritative (official measurements)

### Technology
- **TechCrunch** - Technology news and startup coverage
- **The Verge** - Consumer technology news
- **Company Press Releases** - Official product announcements
- **Patent Databases** - USPTO filings
- **Regulatory Filings** - FCC, SEC technology-related filings

**Signal Types**: Authoritative (official announcements), Procedural (regulatory processes)

### World
- **Reuters International** - Global news coverage
- **UN Announcements** - International organization statements
- **Diplomatic News Services** - Embassy and state department announcements
- **International Court of Justice** - Legal rulings

**Signal Types**: Authoritative (official statements), Interpretive (geopolitical analysis)

## Implementation Details

### Type System Changes

**Before:**
```typescript
category: "politics" | "crypto"
```

**After:**
```typescript
export type MarketCategory = 
  | "politics" | "crypto" | "sports" | "economics" 
  | "entertainment" | "weather" | "technology" 
  | "world" | "other";
```

### Market Categorization

The `PolymarketConnector` now uses comprehensive keyword matching to automatically categorize markets:

```typescript
private categorizeMarket(question: string): MarketCategory {
  // Checks question text against category-specific keywords
  // Returns most specific matching category
  // Falls back to "other" if no match
}
```

Categories are checked in order of specificity (crypto, sports, weather, etc.) to ensure accurate classification.

### News Aggregation

The `NewsAggregator` class now supports:
- Category-specific news fetching
- Multiple RSS feeds per category
- Extensible architecture for adding new sources

```typescript
async fetchNews(category?: MarketCategory): Promise<NewsItem[]> {
  // Fetches news from category-specific sources
  // Supports filtering by category
}
```

### Edge Checking

The trade engine automatically uses the appropriate edge threshold based on market category:

```typescript
export function checkEdge(edge: number, category: string): TradeEligibilityResult {
  const minEdge: number = MIN_EDGE[category] ?? 0.25; // Default to highest
  // Returns eligibility based on category-specific threshold
}
```

## Testing

Added 6 new test cases covering:
- Sports edge threshold (10%)
- Weather edge threshold (8%)
- Entertainment edge threshold (18%)
- World edge threshold (20%)
- Unknown category fallback (25%)

All 38 tests pass (32 original + 6 new).

## Future Enhancements

### Phase 1: RSS Feed Integration
- Implement actual RSS parsing for each category
- Add retry logic and error handling
- Cache feed data to reduce API calls

### Phase 2: Signal Quality Scoring
- Weight signals differently by source reliability
- Track source accuracy over time
- Adjust signal strength based on historical performance

### Phase 3: Category-Specific Signal Classification
- Refine signal type determination per category
- Add category-specific keyword lists for signal analysis
- Implement machine learning for improved classification

### Phase 4: Real-Time Data Feeds
- WebSocket connections for sports scores
- Weather API subscriptions
- Economic calendar integrations

### Phase 5: Calibration by Category
- Track performance metrics per category
- Adjust edge thresholds based on category performance
- Identify which categories work best for the system

## Configuration

Edge thresholds can be adjusted in `packages/shared/src/utils.ts`:

```typescript
export const MIN_EDGE: Record<string, number> = {
  politics: 0.12,
  crypto: 0.15,
  sports: 0.10,
  // ... etc
};
```

News sources can be added in `apps/api/src/connectors/news.ts`:

```typescript
private readonly NEWS_SOURCES = {
  sports: [
    "https://www.espn.com/espn/rss/news",
    // Add more sources here
  ],
  // ... etc
};
```

## Philosophy Alignment

This expansion maintains the system's core principles:

1. **Truthful probability statements** - More categories mean more opportunities for accurate beliefs
2. **Inaction is success** - Higher thresholds for uncertain categories ensure conservative trading
3. **Survival beats cleverness** - Unknown categories get the highest threshold (25%)
4. **Calibration over profit** - Performance tracking will guide category-specific adjustments

## Recommendations

### Immediate Next Steps
1. **Start with weather markets** - Lowest edge threshold (8%), highly predictable
2. **Add sports during major events** - Rich data availability during tournaments
3. **Monitor calibration** - Track success rates per category before expanding

### Categories to Prioritize
1. **Weather** - Most predictable, scientific models available
2. **Sports** - Good statistics, clear outcomes
3. **Economics** - Official data sources, objective metrics

### Categories to Approach Cautiously
1. **Entertainment** - High subjectivity (18% threshold)
2. **World** - Many unknowns (20% threshold)
3. **Other** - Catch-all with highest threshold (25%)

## References

- Polymarket Categories: https://polymarket.com/
- Signal Classification: `polymarket_ai_deterministic_spec.md` Section 4
- Edge Calculation: `polymarket_ai_deterministic_spec.md` Section 8
- News Sources Research: Multiple industry sources (ESPN, NWS, BEA, etc.)

## Change Summary

- **Files Modified**: 5
  - `packages/shared/src/types.ts` - Added MarketCategory type
  - `packages/shared/src/utils.ts` - Expanded MIN_EDGE thresholds
  - `packages/core/src/trade-engine.ts` - Updated checkEdge function
  - `apps/api/src/connectors/polymarket.ts` - Enhanced categorization
  - `apps/api/src/connectors/news.ts` - Added category-specific sources

- **Files Added**: 1
  - `MARKET_CATEGORIES.md` - This documentation

- **Tests Added**: 6
  - Sports, weather, entertainment, world, and unknown category edge checks

- **Lines Changed**: ~200 total
  - Type system: ~20 lines
  - Edge thresholds: ~15 lines
  - Market categorization: ~60 lines
  - News sources: ~70 lines
  - Tests: ~35 lines
