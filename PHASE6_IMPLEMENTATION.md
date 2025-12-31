# Phase 6: News Data Integration

## Overview

Phase 6 implements comprehensive news integration through RSS feeds, providing the belief engine with real-time news signals from authoritative sources across multiple market categories.

## Features

### RSS Feed Integration

The NewsAggregator fetches news from curated RSS feeds organized by market category:

| Category | Sources |
|----------|---------|
| **Politics** | SEC press releases |
| **Crypto** | SEC, CoinTelegraph, CoinDesk |
| **Sports** | ESPN |
| **Economics** | Federal Reserve, Reuters Business |
| **Entertainment** | Variety, Hollywood Reporter, Deadline |
| **Technology** | TechCrunch, The Verge |
| **World** | Reuters World, UN |
| **Weather** | NOAA |

### Signal Generation

News items are automatically converted to signals for the belief engine:

1. **Relevance Scoring**: Keyword matching determines how relevant each news item is to a specific market
   - Title matches: +0.3 relevance
   - Content matches: +0.15 relevance
   - Minimum threshold: 0.3 to generate a signal

2. **Signal Classification**: Each news item is classified into one of five signal types:
   - **Authoritative** (±20%): Official statements, SEC rulings, court decisions
   - **Procedural** (±15%): Filing submissions, deadlines, process updates
   - **Quantitative** (±10%): Data, statistics, polling results
   - **Interpretive** (±7%): Expert analysis, predictions, opinions
   - **Speculative** (±3%): Rumors, unconfirmed reports

3. **Sentiment Analysis**: Determines signal direction (up/down/neutral):
   - Positive indicators: "approved", "passed", "won", "victory", "gains"
   - Negative indicators: "denied", "rejected", "lost", "defeat", "decline"

4. **Strength Calculation**: Signal strength (1-5 scale) based on:
   - Source credibility (official sources get higher scores)
   - Relevance score
   - Content quality

### Rate Limiting & Optimization

- **Fetch Interval**: Minimum 5 minutes between fetches per source
- **Items per Feed**: Maximum 10 most recent items per fetch
- **Deduplication**: Automatic removal of similar headlines
- **Error Handling**: Graceful failure with detailed error logging

## Integration with Trading Service

The news integration is **automatically enabled** in the TradingService. No additional configuration is required.

### How It Works

```typescript
// apps/api/src/services/trading.ts

// 1. News aggregator is initialized on startup
this.news = new NewsAggregator();

// 2. During market evaluation, news is fetched
const news = await this.news.fetchNews();

// 3. Signals are generated from relevant news
const newsSignals = await this.news.generateSignals(news, keywords);

// 4. Signals are combined with Reddit signals
const signals = [...newsSignals, ...redditSignals];

// 5. Belief engine processes all signals
const updatedBelief = performBeliefUpdate(currentBelief, signals);
```

## Testing

### Running Tests

```bash
# Test news integration
npx tsx apps/api/src/test-news.ts

# Run full system with simulation data
SIMULATION_DATA=true pnpm --filter @pomabot/api dev
```

### Test Coverage

The test script validates:
1. ✅ RSS feed fetching from multiple sources
2. ✅ Category-specific news filtering
3. ✅ Signal generation with keyword matching
4. ✅ Simulation data fallback (for offline testing)

## Configuration

### No Configuration Required

The news integration works out of the box with no environment variables needed. RSS feeds are pre-configured for optimal coverage.

### Optional: Simulation Mode

For testing without internet access:

```bash
export SIMULATION_DATA=true
```

This enables mock news items for each category, allowing you to test signal generation and belief updates offline.

## RSS Feed Sources

### Current Feeds

All feeds are free, publicly available, and require no API keys:

- **SEC Press Releases**: `https://www.sec.gov/news/pressreleases.rss`
- **CoinTelegraph**: `https://cointelegraph.com/rss`
- **CoinDesk**: `https://www.coindesk.com/arc/outboundfeeds/rss/`
- **ESPN**: `https://www.espn.com/espn/rss/news`
- **Federal Reserve**: `https://www.federalreserve.gov/feeds/press_all.xml`
- **Reuters Business**: `https://www.reuters.com/rssFeed/businessNews`
- **Reuters World**: `https://www.reuters.com/rssFeed/worldNews`
- **Variety**: `https://variety.com/feed/`
- **Hollywood Reporter**: `https://www.hollywoodreporter.com/feed/`
- **Deadline**: `https://deadline.com/feed/`
- **TechCrunch**: `https://techcrunch.com/feed/`
- **The Verge**: `https://www.theverge.com/rss/index.xml`
- **UN**: `https://www.un.org/en/rss.xml`
- **NOAA**: `https://www.noaa.gov/rss`

### Adding New Feeds

To add additional RSS feeds, edit `apps/api/src/connectors/news.ts`:

```typescript
private readonly RSS_SOURCES: Record<MarketCategory, string[]> = {
  politics: [
    "https://www.sec.gov/news/pressreleases.rss",
    "https://your-new-feed-url.com/rss",  // Add here
  ],
  // ... other categories
};
```

## Architecture

### NewsAggregator Class

```typescript
class NewsAggregator {
  // Fetch news from RSS feeds
  async fetchNews(category?: MarketCategory): Promise<NewsItem[]>
  
  // Generate signals from news items
  async generateSignals(news: NewsItem[], keywords: string[]): Promise<Signal[]>
  
  // Internal: Parse RSS feed
  private async fetchRSSFeed(url: string, category: MarketCategory): Promise<NewsItem[]>
  
  // Internal: Calculate relevance
  private calculateRelevanceScore(item: NewsItem, keywords: string[]): number
  
  // Internal: Analyze and classify news
  private analyzeNewsItem(item: NewsItem, keywords: string[]): Signal | undefined
}
```

### NewsItem Interface

```typescript
interface NewsItem {
  source: string;           // Feed hostname (e.g., "sec.gov")
  title: string;            // Article headline
  content: string;          // Article content/summary
  url: string;              // Link to full article
  published_at: Date;       // Publication date
  relevance_score: number;  // 0-1, calculated by keyword matching
  category?: MarketCategory; // Market category
}
```

## Performance Considerations

### Memory Usage

- Maximum 10 items per feed
- Deduplication reduces redundancy
- Old items are automatically pruned

### Network Usage

- Rate limiting prevents excessive requests
- Failed requests are logged but don't block execution
- Timeout: 10 seconds per feed

### CPU Usage

- Signal generation is lightweight (simple text analysis)
- No heavy NLP or ML processing
- Scales to hundreds of news items per evaluation

## Future Enhancements

### Planned Improvements

1. **NewsAPI.org Integration**: Broader headline coverage with search/filtering
2. **Prediction Markets**: Cross-reference with Metaculus, Manifold, Kalshi
3. **Social Media**: Twitter/X API integration (when accessible)
4. **Government APIs**: Economic indicators, official statistics
5. **Advanced NLP**: Better sentiment analysis using ML models
6. **Caching Layer**: Reduce redundant fetches with intelligent caching

### Adding NewsAPI.org (Future)

```typescript
// Example future implementation
import NewsAPI from 'newsapi';

const newsapi = new NewsAPI(process.env.NEWSAPI_KEY);

async fetchFromNewsAPI(query: string) {
  const response = await newsapi.v2.everything({
    q: query,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: 10
  });
  return response.articles;
}
```

## Troubleshooting

### Common Issues

**Q: Why am I getting ENOTFOUND errors?**

A: This is expected in sandboxed environments without internet access. The system will use simulation data as a fallback.

**Q: How do I test without internet?**

A: Set `SIMULATION_DATA=true` to use mock news items.

**Q: Can I disable news integration?**

A: News integration is always enabled, but if all RSS feeds fail, the system continues with Reddit signals only.

**Q: How do I add more news sources?**

A: Edit the `RSS_SOURCES` object in `apps/api/src/connectors/news.ts` and add your feed URLs.

## Monitoring

### Log Messages

```
✅ Success: "Fetching RSS feed: https://..."
❌ Error: "Failed to fetch https://... : [error message]"
📊 Status: "Fetched X news items"
🎯 Status: "Generated X signals"
```

### Integration with Slack Notifications

News signals are included in trade opportunity notifications:

```
📈 Trade Opportunity Detected

Market: "Will Bitcoin ETF be approved?"
Signals: 3 news signals, 2 Reddit signals
- [Authoritative] SEC Approves Bitcoin ETF Applications
- [Quantitative] Reddit sentiment positive (score: 0.8)
...
```

## Summary

Phase 6 successfully implements a robust news integration system that:

✅ Fetches news from 10+ RSS feeds across multiple categories  
✅ Generates high-quality signals with intelligent classification  
✅ Integrates seamlessly with existing belief engine  
✅ Requires zero configuration to use  
✅ Includes comprehensive testing  
✅ Handles errors gracefully with fallback data  

The news integration enhances the bot's decision-making by providing timely, relevant information from authoritative sources, reducing dependency on any single data source and improving overall prediction accuracy.
