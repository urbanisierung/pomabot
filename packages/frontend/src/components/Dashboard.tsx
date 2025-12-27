/**
 * Dashboard Component
 * 
 * Main dashboard showing:
 * - Active markets
 * - Belief ranges vs prices
 * - Confidence levels
 * - System state
 * - Unknowns ledger
 */

import { useState } from 'react';
import type { BeliefState, SystemState } from '@pomabot/shared';

// Mock data for demonstration
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

export default function Dashboard() {
  const [systemState] = useState<SystemState>('OBSERVE');

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
              State
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {systemState}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              Active Markets
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {mockBeliefs.length}
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Total Unknowns
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              {mockBeliefs.reduce((acc, m) => acc + m.belief.unknowns.length, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockBeliefs.map((market) => (
          <div
            key={market.marketId}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {market.question}
            </h3>

            {/* Belief Range Visualization */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Belief Range</span>
                <span>
                  {market.belief.belief_low.toFixed(0)}% - {market.belief.belief_high.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                {/* Belief Range */}
                <div
                  className="absolute h-full bg-blue-400 dark:bg-blue-600 opacity-50"
                  style={{
                    left: `${market.belief.belief_low}%`,
                    width: `${market.belief.belief_high - market.belief.belief_low}%`,
                  }}
                />
                {/* Market Price */}
                <div
                  className="absolute top-0 w-1 h-full bg-red-500"
                  style={{ left: `${market.currentPrice}%` }}
                  title={`Market Price: ${market.currentPrice}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
                <span>0%</span>
                <span className="text-red-500">Market: {market.currentPrice}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {market.belief.confidence.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Edge</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
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
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unknowns ({market.belief.unknowns.length})
                </div>
                <ul className="space-y-1">
                  {market.belief.unknowns.map((unknown) => (
                    <li
                      key={unknown.id}
                      className="text-sm text-gray-600 dark:text-gray-400"
                    >
                      • {unknown.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trade Recommendation */}
            <div className="mt-4">
              {market.currentPrice < market.belief.belief_low ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200">
                    💡 Potential BUY YES
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Market underpriced relative to belief
                  </div>
                </div>
              ) : market.currentPrice > market.belief.belief_high ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200">
                    💡 Potential BUY NO
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Market overpriced relative to belief
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ⏸️ No Trade
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Market price within belief range
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Philosophy */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Core Philosophy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              Truthfulness First
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Truthful probability statements matter more than profits
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              Inaction is Success
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              "Do nothing" is the most common and valid outcome
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              Survival Beats Cleverness
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Conservative beliefs ensure long-term viability
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
