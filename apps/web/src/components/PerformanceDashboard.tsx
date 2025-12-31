/**
 * Performance Dashboard Component
 * 
 * Displays historical performance metrics, P&L tracking, and trade journal
 */

import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  averagePnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  averageHoldingPeriod: number;
  edgeAccuracy: number;
}

interface PatternAnalysis {
  bestCategories: Array<{ category: string; winRate: number; avgPnL: number; trades: number }>;
  worstCategories: Array<{ category: string; winRate: number; avgPnL: number; trades: number }>;
  optimalEdgeRange: { min: number; max: number; winRate: number };
  optimalBeliefWidth: { min: number; max: number; winRate: number };
  timeOfDayPatterns: Array<{ hour: number; winRate: number; trades: number }>;
}

interface TradeRecord {
  timestamp: string;
  marketQuestion: string;
  action: 'BUY_YES' | 'BUY_NO';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  pnl?: number;
  outcome: 'OPEN' | 'WIN' | 'LOSS' | 'BREAK_EVEN';
  edge: number;
}

interface PerformanceData {
  metrics: PerformanceMetrics;
  patterns: PatternAnalysis;
  recentTrades: TradeRecord[];
}

interface PortfolioStatus {
  totalValue: number;
  availableCapital: number;
  allocatedCapital: number;
  openPositions: number;
  unrealizedPnl: number;
  drawdown: number;
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
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
  },
  metricBox: {
    padding: '1rem',
    borderRadius: '0.5rem',
    background: '#f9fafb',
  },
  metricLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6b7280',
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.875rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  statusWin: {
    background: '#dcfce7',
    color: '#166534',
  },
  statusLoss: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  statusOpen: {
    background: '#e0e7ff',
    color: '#3730a3',
  },
};

export default function PerformanceDashboard() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [perfRes, portfolioRes] = await Promise.all([
          fetch(`${API_BASE}/api/performance`),
          fetch(`${API_BASE}/api/portfolio`),
        ]);

        if (perfRes.ok) {
          const perfData = await perfRes.json();
          setPerformance(perfData);
        }

        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          setPortfolio(portfolioData);
        }

        setLoading(false);
        setError(undefined);
      } catch (err) {
        setError('Failed to load performance data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ ...styles.container, padding: '2rem', textAlign: 'center' as const }}>
        <div style={{ fontSize: '1.5rem' }}>Loading performance data...</div>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div style={{ ...styles.container, padding: '2rem' }}>
        <div style={{ ...styles.card, background: '#fef2f2' }}>
          <h2 style={{ ...styles.heading, color: '#dc2626' }}>⚠️ Error</h2>
          <p>{error || 'No performance data available'}</p>
        </div>
      </div>
    );
  }

  const { metrics, patterns, recentTrades } = performance;

  return (
    <div style={styles.container}>
      {/* Portfolio Status */}
      {portfolio && (
        <div style={styles.card}>
          <h2 style={styles.heading}>💼 Portfolio Status</h2>
          <div style={styles.grid3}>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Total Value</div>
              <div style={styles.metricValue}>${portfolio.totalValue.toFixed(2)}</div>
            </div>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Available Capital</div>
              <div style={styles.metricValue}>${portfolio.availableCapital.toFixed(2)}</div>
            </div>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Open Positions</div>
              <div style={styles.metricValue}>{portfolio.openPositions}</div>
            </div>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Unrealized P&L</div>
              <div style={{ ...styles.metricValue, color: portfolio.unrealizedPnl >= 0 ? '#16a34a' : '#dc2626' }}>
                ${portfolio.unrealizedPnl.toFixed(2)}
              </div>
            </div>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Drawdown</div>
              <div style={{ ...styles.metricValue, color: portfolio.drawdown > 5 ? '#dc2626' : '#6b7280' }}>
                {portfolio.drawdown.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div style={styles.card}>
        <h2 style={styles.heading}>📊 Performance Metrics</h2>
        <div style={styles.grid3}>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Total Trades</div>
            <div style={styles.metricValue}>{metrics.totalTrades}</div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Win Rate</div>
            <div style={styles.metricValue}>{(metrics.winRate * 100).toFixed(1)}%</div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Total P&L</div>
            <div style={{ ...styles.metricValue, color: metrics.totalPnL >= 0 ? '#16a34a' : '#dc2626' }}>
              ${metrics.totalPnL.toFixed(2)}
            </div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Average P&L</div>
            <div style={{ ...styles.metricValue, color: metrics.averagePnL >= 0 ? '#16a34a' : '#dc2626' }}>
              ${metrics.averagePnL.toFixed(2)}
            </div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Profit Factor</div>
            <div style={styles.metricValue}>
              {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
            </div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Max Drawdown</div>
            <div style={styles.metricValue}>${metrics.maxDrawdown.toFixed(2)}</div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Edge Accuracy</div>
            <div style={styles.metricValue}>{(metrics.edgeAccuracy * 100).toFixed(1)}%</div>
          </div>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Avg Holding (hrs)</div>
            <div style={styles.metricValue}>{metrics.averageHoldingPeriod.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Pattern Analysis */}
      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            🎯 Best Categories
          </h3>
          {patterns.bestCategories.length > 0 ? (
            <div>
              {patterns.bestCategories.map((cat) => (
                <div key={cat.category} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{cat.category}</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {(cat.winRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {cat.trades} trades • ${cat.avgPnL.toFixed(2)} avg P&L
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No trade data available yet</p>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            ⚡ Optimal Edge Range
          </h3>
          <div style={styles.metricBox}>
            <div style={styles.metricLabel}>Edge Range</div>
            <div style={styles.metricValue}>
              {patterns.optimalEdgeRange.min.toFixed(0)}-{patterns.optimalEdgeRange.max.toFixed(0)}%
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Win Rate: {(patterns.optimalEdgeRange.winRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div style={styles.card}>
        <h2 style={styles.heading}>📖 Recent Trades (Last 30 days)</h2>
        {recentTrades.length > 0 ? (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Market</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Entry</th>
                  <th style={styles.th}>Exit</th>
                  <th style={styles.th}>Edge</th>
                  <th style={styles.th}>P&L</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.slice(0, 20).map((trade, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      {trade.marketQuestion.length > 50
                        ? trade.marketQuestion.substring(0, 50) + '...'
                        : trade.marketQuestion}
                    </td>
                    <td style={styles.td}>{trade.action}</td>
                    <td style={styles.td}>${trade.entryPrice.toFixed(2)}</td>
                    <td style={styles.td}>
                      {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                    </td>
                    <td style={styles.td}>{(trade.edge * 100).toFixed(1)}%</td>
                    <td style={{ ...styles.td, color: (trade.pnl ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                      {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(trade.outcome === 'WIN'
                            ? styles.statusWin
                            : trade.outcome === 'LOSS'
                            ? styles.statusLoss
                            : styles.statusOpen),
                        }}
                      >
                        {trade.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>No recent trades to display</p>
        )}
      </div>
    </div>
  );
}
