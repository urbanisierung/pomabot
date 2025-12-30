# Phase 5: Reddit Data Integration - Setup Guide

This guide explains how to set up and use the Reddit data integration feature in PomaBot.

## Overview

Phase 5 adds Reddit sentiment analysis to enhance prediction accuracy. The system monitors relevant subreddits for market-related discussions, extracts sentiment signals, and integrates them into the belief engine.

## Features

- **OAuth2 Authentication**: Secure authentication with Reddit API
- **Rate Limiting**: Respects Reddit's 60 requests/minute limit
- **Subreddit Credibility Scoring**: Weights signals based on subreddit reliability (0.5-0.9)
- **Sentiment Analysis**: Analyzes post titles and content for positive/negative sentiment
- **Volume Tracking**: Monitors post frequency and momentum
- **Signal Conversion**: Automatically converts Reddit signals to belief engine types:
  - **Quantitative**: High credibility (≥0.85) + high volume (≥20 posts)
  - **Interpretive**: Medium credibility (≥0.75) + medium volume (≥10 posts)
  - **Speculative**: Lower credibility or volume

## Setup Instructions

### 1. Create a Reddit App

1. Visit https://www.reddit.com/prefs/apps
2. Scroll to the bottom and click "create another app..."
3. Fill in the form:
   - **name**: `pomabot` (or your preferred name)
   - **App type**: Select "script"
   - **description**: Optional description
   - **about url**: Optional
   - **redirect uri**: `http://localhost:8080` (required but not used for script apps)
4. Click "create app"
5. Note down the **client ID** (displayed under "personal use script")
6. Note down the **client secret**

### 2. Configure Environment Variables

Add the following environment variables to your `.env` file or deployment configuration:

```bash
# Reddit Integration (optional)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT="pomabot/1.0 by /u/yourusername"

# Optional: For user-authenticated access (provides higher rate limits)
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
```

**Note**: If you don't provide Reddit credentials, the system will run without Reddit integration (no errors).

### 3. Run the Bot

Start the bot as usual:

```bash
# Development mode
pnpm --filter @pomabot/api dev

# Production mode
pnpm --filter @pomabot/api start
```

You should see:
```
📱 Reddit integration ENABLED
🔐 Authenticating with Reddit API...
✅ Reddit authentication successful
```

If Reddit credentials are not provided, you'll see:
```
📱 Reddit integration DISABLED (no credentials)
```

## Monitored Subreddits

The system monitors different subreddits based on market categories:

| Market Category | Subreddits |
|-----------------|------------|
| **Politics** | r/politics, r/PoliticalDiscussion, r/Conservative, r/neoliberal |
| **Crypto** | r/CryptoCurrency, r/Bitcoin, r/ethereum, r/CryptoMarkets |
| **Sports** | r/sportsbook, r/nba, r/nfl, r/soccer |
| **Economics** | r/wallstreetbets, r/investing, r/stocks, r/economy |
| **Entertainment** | r/movies, r/television, r/entertainment, r/Oscars |
| **Weather** | r/weather, r/TropicalWeather |
| **Technology** | r/technology, r/programming, r/technews |
| **World** | r/news, r/worldnews, r/geopolitics |

## Credibility Scoring

Subreddits are assigned credibility scores based on reliability:

| Credibility | Score | Subreddits |
|-------------|-------|------------|
| **High** | 0.85-0.9 | r/news, r/worldnews, r/PoliticalDiscussion, r/geopolitics, r/nba, r/nfl |
| **Medium** | 0.7-0.8 | r/politics, r/CryptoCurrency, r/investing, r/stocks, r/technology |
| **Low** | 0.5-0.6 | r/wallstreetbets, r/Conservative, r/neoliberal, r/Bitcoin |
| **Default** | 0.7 | Unknown subreddits |

## How It Works

1. **Market Keyword Extraction**: System extracts keywords from market questions (e.g., "Bitcoin", "election")
2. **Reddit Search**: Searches relevant subreddits for posts matching keywords
3. **Sentiment Analysis**: Analyzes post titles and content for positive/negative sentiment
4. **Signal Generation**: Converts Reddit data to belief engine signals
5. **Belief Update**: Integrates Reddit signals with news signals to update market beliefs

## Example Output

When Reddit signals are found, you'll see output like:

```
📱 Reddit signal for Will Bitcoin reach $100k by 2024?
   subreddit: CryptoCurrency
   sentiment: 0.65
   volume: 23
   type: quantitative
   direction: up
   strength: 4
```

## Monitoring & Debugging

### Enable Verbose Logging

To see detailed Reddit activity, enable verbose mode:

```bash
VERBOSE=true pnpm --filter @pomabot/api dev
```

### Check Audit Logs

Reddit signals are logged in the audit logs:

```bash
cat audit-logs/audit-YYYY-MM-DD.csv
```

### Rate Limiting

The connector automatically rate limits to 60 requests/minute. If you see delays, this is normal behavior to respect Reddit's API limits.

## Troubleshooting

### "Reddit integration DISABLED"

**Cause**: Missing or invalid Reddit credentials.

**Solution**: 
1. Verify `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` are set
2. Check credentials are correct (copy/paste from Reddit app page)
3. Ensure user agent is properly formatted

### "Failed to authenticate with Reddit"

**Cause**: Invalid credentials or Reddit API issues.

**Solution**:
1. Verify credentials are correct
2. Check if your Reddit app is still active at https://www.reddit.com/prefs/apps
3. Try regenerating the client secret
4. Check Reddit API status at https://www.redditstatus.com/

### No Reddit Signals Generated

**Cause**: No relevant posts found matching market keywords.

**Solution**:
1. Enable verbose logging to see search activity
2. Check if keywords are too specific
3. Verify market category matches available subreddits
4. Some markets may not have Reddit activity

### Rate Limit Errors

**Cause**: Exceeding 60 requests/minute.

**Solution**: The connector handles this automatically with rate limiting. If you see warnings, consider:
1. Increasing `POLL_INTERVAL` to reduce frequency
2. Monitoring fewer markets

## Best Practices

1. **User Agent**: Use a descriptive user agent with your Reddit username
2. **Rate Limits**: Don't disable rate limiting - respect Reddit's API terms
3. **Credentials**: Keep credentials secure, use environment variables
4. **Monitoring**: Check logs regularly to ensure Reddit integration is working
5. **Volume**: Higher volume signals (20+ posts) are more reliable

## API Reference

### RedditConnector

Main class for Reddit API integration.

```typescript
const reddit = new RedditConnector({
  clientId: string;
  clientSecret: string;
  userAgent: string;
  username?: string;      // Optional
  password?: string;      // Optional
});

// Authenticate
await reddit.authenticate();

// Fetch hot posts
const posts = await reddit.fetchHotPosts("CryptoCurrency", 25);

// Search for keywords
const results = await reddit.searchForMarket("crypto", ["bitcoin", "btc"]);

// Generate signal
const signal = reddit.generateSignal(posts, ["bitcoin"]);

// Convert to belief engine signal
const beliefSignal = reddit.convertToBeliefSignal(signal, "crypto");
```

### RedditSignal

```typescript
interface RedditSignal {
  subreddit: string;      // Subreddit name
  keyword: string;        // Primary keyword
  sentiment: number;      // -1 to 1 (negative to positive)
  volume: number;         // Posts in last 24h
  momentum: number;       // Volume change rate
  topPosts: Array<{
    title: string;
    score: number;
    url: string;
  }>;
}
```

## Future Enhancements

Potential improvements for Reddit integration:

- **Comment Analysis**: Analyze post comments for deeper sentiment
- **User Reputation**: Weight posts by author karma/age
- **Trend Detection**: Identify rapid sentiment changes
- **Subreddit Discovery**: Automatically find relevant subreddits
- **Cross-posting Detection**: Identify duplicate content across subreddits

## Support

For issues or questions:
1. Check the logs for error messages
2. Enable verbose mode for debugging
3. Review this guide for common solutions
4. Check Reddit API status
5. Open an issue on GitHub

---

*Last updated: December 2024*
