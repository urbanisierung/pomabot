/**
 * Dashboard Component - Connected to live API data
 */

import { useState, useEffect } from 'react';
import type { SystemState } from '@pomabot/shared';

// API response types
interface MarketData {
  marketId: string;
  question: string;
  category: string;
  currentPrice: number;
  liquidity: number;
  closesAt: string;
  belief: {
    belief_low: number;
    belief_high: number;
    confidence: number;
    unknowns: Array<{ id: string; description: string; added_at: string }>;
    last_updated: string;
  };
  signalCount: number;
  lastChecked: string;
}

interface StatusData {
  state: string;
  markets: number;
  halted: boolean;
  haltReason?: string;
}

const API_BASE = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  statBox: {
    padding: '1rem',
    borderRadius: '0.5rem',
    background: '#eff6ff',
  },
  statLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#2563eb',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  marketCard: {
    background: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
  },
  marketTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  rangeContainer: {
    marginBottom: '1rem',
  },
  rangeLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
  },
  rangeBar: {
    position: 'relative' as const,
    height: '2rem',
    background: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  beliefRange: {
    position: 'absolute' as const,
    height: '100%',
    background: '#93c5fd',
    opacity: 0.5,
  },
  marketPrice: {
    position: 'absolute' as const,
    top: 0,
    width: '2px',
    height: '100%',
    background: '#ef4444',
  },
  rangeFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '0.25rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  metricBox: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  metricLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  metricValue: {
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  unknownsSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  unknownsTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '0.5rem',
  },
  unknownsList: {
    listStyle: 'none',
    padding: 0,
  },
  unknownItem: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
  },
  tradeRecommendation: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid',
  },
  tradeRecommendationBuy: {
    background: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  tradeRecommendationNone: {
    background: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  tradeTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  tradeSubtitle: {
    fontSize: '0.75rem',
    marginTop: '0.25rem',
  },
  philosophyCard: {
    background: 'linear-gradient(to right, #eff6ff, #f5f3ff)',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '1.5rem',
  },
  philosophyTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
  },
  philosophyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    fontSize: '0.875rem',
  },
  philosophyItem: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  philosophyHeading: {
    fontWeight: 600,
    marginBottom: '0.25rem',
  },
  philosophyText: {
    color: '#6b7280',
  },
};

// Market Card Component
function MarketCard({ market }: { market: MarketData }) {
  const edge = market.currentPrice < market.belief.belief_low
    ? market.belief.belief_low - market.currentPrice
    : market.currentPrice > market.belief.belief_high
    ? market.currentPrice - market.belief.belief_high
    : 0;

  return (
    <div style={styles.marketCard}>
      <h3 style={styles.marketTitle}>{market.question}</h3>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
        {market.category.toUpperCase()} • Closes: {new Date(market.closesAt).toLocaleDateString()}
      </div>

      {/* Belief Range Visualization */}
      <div style={styles.rangeContainer}>
        <div style={styles.rangeLabel}>
          <span>Belief Range</span>
          <span>
            {market.belief.belief_low.toFixed(0)}% - {market.belief.belief_high.toFixed(0)}%
          </span>
        </div>
        <div style={styles.rangeBar}>
          <div
            style={{
              ...styles.beliefRange,
              left: `${market.belief.belief_low}%`,
              width: `${market.belief.belief_high - market.belief.belief_low}%`,
            }}
          />
          <div
            style={{
              ...styles.marketPrice,
              left: `${Math.min(100, Math.max(0, market.currentPrice))}%`,
            }}
            title={`Market Price: ${market.currentPrice.toFixed(1)}%`}
          />
        </div>
        <div style={styles.rangeFooter}>
          <span>0%</span>
          <span style={{ color: '#ef4444' }}>Market: {market.currentPrice.toFixed(1)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Metrics */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricBox}>
          <div style={styles.metricLabel}>Confidence</div>
          <div style={styles.metricValue}>{market.belief.confidence.toFixed(0)}</div>
        </div>
        <div style={styles.metricBox}>
          <div style={styles.metricLabel}>Edge</div>
          <div style={{ ...styles.metricValue, color: edge > 0 ? '#16a34a' : '#6b7280' }}>
            {edge > 0 ? `+${edge.toFixed(1)}%` : '0%'}
          </div>
        </div>
        <div style={styles.metricBox}>
          <div style={styles.metricLabel}>Liquidity</div>
          <div style={styles.metricValue}>${(market.liquidity / 1000).toFixed(0)}k</div>
        </div>
        <div style={styles.metricBox}>
          <div style={styles.metricLabel}>Signals</div>
          <div style={styles.metricValue}>{market.signalCount}</div>
        </div>
      </div>

      {/* Trade Recommendation */}
      <div
        style={{
          ...styles.tradeRecommendation,
          ...(edge > 0 ? styles.tradeRecommendationBuy : styles.tradeRecommendationNone),
        }}
      >
        <div style={styles.tradeTitle}>
          {market.currentPrice < market.belief.belief_low
            ? '💡 Potential BUY YES'
            : market.currentPrice > market.belief.belief_high
            ? '💡 Potential BUY NO'
            : '⏸️ No Trade'}
        </div>
        <div style={styles.tradeSubtitle}>
          {market.currentPrice < market.belief.belief_low
            ? 'Market underpriced relative to belief'
            : market.currentPrice > market.belief.belief_high
            ? 'Market overpriced relative to belief'
            : 'Market price within belief range'}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [systemState, setSystemState] = useState<SystemState>('OBSERVE');
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [totalMarkets, setTotalMarkets] = useState(0);
  const [halted, setHalted] = useState(false);
  const [haltReason, setHaltReason] = useState<string | undefined>(undefined);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch status
        const statusRes = await fetch(`${API_BASE}/api/status`);
        if (statusRes.ok) {
          const status: StatusData = await statusRes.json();
          setSystemState(status.state as SystemState);
          setTotalMarkets(status.markets);
          setHalted(status.halted);
          setHaltReason(status.haltReason);
        }

        // Fetch markets
        const marketsRes = await fetch(`${API_BASE}/api/markets`);
        if (marketsRes.ok) {
          const data = await marketsRes.json();
          setMarkets(data.markets);
        }
        
        setLoading(false);
        setError(undefined);
      } catch (err) {
        setError('Failed to connect to API. Make sure the trading bot is running on port 4000.');
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter markets with trade opportunities (price outside belief range)
  const tradeOpportunities = markets.filter(
    m => m.currentPrice < m.belief.belief_low || m.currentPrice > m.belief.belief_high
  );

  if (loading) {
    return (
      <div style={{ ...styles.container, padding: '2rem', textAlign: 'center' as const }}>
        <div style={{ fontSize: '1.5rem' }}>Loading...</div>
        <div style={{ color: '#6b7280', marginTop: '0.5rem' }}>Connecting to trading bot API...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...styles.container, padding: '2rem' }}>
        <div style={{ ...styles.card, background: '#fef2f2', borderColor: '#fecaca' }}>
          <h2 style={{ ...styles.heading, color: '#dc2626' }}>⚠️ Connection Error</h2>
          <p style={{ color: '#7f1d1d' }}>{error}</p>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            <p>Start the trading bot with:</p>
            <code style={{ background: '#f3f4f6', padding: '0.5rem', display: 'block', marginTop: '0.5rem' }}>
              POLL_INTERVAL=10000 pnpm --filter @pomabot/api dev
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* System Status */}
      <div style={styles.card}>
        <h2 style={styles.heading}>System Status</h2>
        <div style={styles.grid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>State</div>
            <div style={styles.statValue}>{systemState}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Active Markets</div>
            <div style={styles.statValue}>{totalMarkets}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Trade Opportunities</div>
            <div style={styles.statValue}>{tradeOpportunities.length}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Unknowns</div>
            <div style={styles.statValue}>
              {markets.reduce((acc, m) => acc + m.belief.unknowns.length, 0)}
            </div>
          </div>
        </div>
        {halted && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '0.5rem', color: '#dc2626' }}>
            ⚠️ System HALTED: {haltReason}
          </div>
        )}
      </div>

      {/* Trade Opportunities Section */}
      {tradeOpportunities.length > 0 && (
        <div style={styles.card}>
          <h2 style={{ ...styles.heading, color: '#16a34a' }}>💡 Trade Opportunities ({tradeOpportunities.length})</h2>
          <div style={styles.grid}>
            {tradeOpportunities.slice(0, 10).map((market) => (
              <MarketCard key={market.marketId} market={market} />
            ))}
          </div>
        </div>
      )}

      {/* All Markets Grid */}
      <div style={styles.card}>
        <h2 style={styles.heading}>All Markets ({markets.length})</h2>
        <div style={styles.grid}>
          {markets.slice(0, 20).map((market) => (
            <MarketCard key={market.marketId} market={market} />
          ))}
        </div>
        {markets.length > 20 && (
          <div style={{ marginTop: '1rem', textAlign: 'center' as const, color: '#6b7280' }}>
            Showing 20 of {markets.length} markets
          </div>
        )}
      </div>

      {/* Philosophy */}
      <div style={styles.philosophyCard}>
        <h2 style={styles.philosophyTitle}>Core Philosophy</h2>
        <div style={styles.philosophyGrid}>
          <div style={styles.philosophyItem}>
            <div style={styles.philosophyHeading}>Truthfulness First</div>
            <div style={styles.philosophyText}>
              Truthful probability statements matter more than profits
            </div>
          </div>
          <div style={styles.philosophyItem}>
            <div style={styles.philosophyHeading}>Inaction is Success</div>
            <div style={styles.philosophyText}>
              "Do nothing" is the most common and valid outcome
            </div>
          </div>
          <div style={styles.philosophyItem}>
            <div style={styles.philosophyHeading}>Survival Beats Cleverness</div>
            <div style={styles.philosophyText}>
              Conservative beliefs ensure long-term viability
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
