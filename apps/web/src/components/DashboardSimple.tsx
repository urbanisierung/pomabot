/**
 * Dashboard Component - Simple version without Tailwind
 */

import { useState } from 'react';
import type { BeliefState, SystemState } from '@pomabot/shared';

// Mock data
const mockBeliefs: Array<{ marketId: string; question: string; belief: BeliefState; currentPrice: number }> = [
  {
    marketId: 'market1',
    question: 'Will Bitcoin ETF be approved by SEC in 2024?',
    belief: {
      belief_low: 65,
      belief_high: 80,
      confidence: 75,
      unknowns: [
        { id: '1', description: 'SEC commissioner voting patterns', added_at: new Date() }
      ],
      last_updated: new Date(),
    },
    currentPrice: 52,
  },
  {
    marketId: 'market2',
    question: 'Will Trump win 2024 election?',
    belief: {
      belief_low: 45,
      belief_high: 60,
      confidence: 68,
      unknowns: [],
      last_updated: new Date(),
    },
    currentPrice: 72,
  },
];

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

export default function Dashboard() {
  const [systemState] = useState<SystemState>('OBSERVE');

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
            <div style={styles.statValue}>{mockBeliefs.length}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Unknowns</div>
            <div style={styles.statValue}>
              {mockBeliefs.reduce((acc, m) => acc + m.belief.unknowns.length, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <div style={styles.grid}>
        {mockBeliefs.map((market) => (
          <div key={market.marketId} style={styles.marketCard}>
            <h3 style={styles.marketTitle}>{market.question}</h3>

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
                    left: `${market.currentPrice}%`,
                  }}
                  title={`Market Price: ${market.currentPrice}%`}
                />
              </div>
              <div style={styles.rangeFooter}>
                <span>0%</span>
                <span style={{ color: '#ef4444' }}>Market: {market.currentPrice}%</span>
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
                <div style={styles.metricValue}>
                  {market.currentPrice < market.belief.belief_low
                    ? `+${(market.belief.belief_low - market.currentPrice).toFixed(1)}%`
                    : market.currentPrice > market.belief.belief_high
                    ? `+${(market.currentPrice - market.belief.belief_high).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* Unknowns */}
            {market.belief.unknowns.length > 0 && (
              <div style={styles.unknownsSection}>
                <div style={styles.unknownsTitle}>
                  Unknowns ({market.belief.unknowns.length})
                </div>
                <ul style={styles.unknownsList}>
                  {market.belief.unknowns.map((unknown) => (
                    <li key={unknown.id} style={styles.unknownItem}>
                      • {unknown.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trade Recommendation */}
            <div
              style={{
                ...styles.tradeRecommendation,
                ...(market.currentPrice < market.belief.belief_low ||
                market.currentPrice > market.belief.belief_high
                  ? styles.tradeRecommendationBuy
                  : styles.tradeRecommendationNone),
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
        ))}
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
