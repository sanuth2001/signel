'use client'
// Prompt 33 — Backtesting Page
import React, { useState } from 'react'
import { COINS } from '../../../lib/utils/constants'

const REGIME_COLORS = {
  trending_up: '#22c55e',
  trending_down: '#ef4444',
  ranging: '#eab308',
  high_volatility: '#f97316',
  low_liquidity: '#6b7280',
}

export default function BacktestPage() {
  const [coin, setCoin] = useState('BTC')
  const [days, setDays] = useState(90)
  const [confidence, setConfidence] = useState(70)
  const [risk, setRisk] = useState(2)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const runBacktest = async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch(`/api/backtest?coin=${coin}&days=${days}&confidence=${confidence}&risk=${risk}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Backtest failed')
      setResults(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">📈 Backtesting Engine</h1>
            <p className="text-gray-500 text-sm mt-1">Rule-based simulation — no API credits used</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <a href="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">← Dashboard</a>
            <span className="text-gray-600">•</span>
            <a href="/dashboard/smc" className="text-amber-400 hover:text-amber-300 transition-colors">🏦 SMC Supreme</a>
            <span className="text-gray-600">•</span>
            <a href="/dashboard/fvg" className="text-amber-400 hover:text-amber-300 transition-colors">⚡ FVG Signals</a>
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-2xl bg-gray-900/80 border border-gray-700/30 p-6 grid grid-cols-2 md:grid-cols-4 gap-5">
          {/* Coin */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Coin</label>
            <select
              value={coin}
              onChange={e => setCoin(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700/50 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              id="backtest-coin"
            >
              {Object.keys(COINS).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Days */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Period: {days} days</label>
            <input
              type="range" min="7" max="365" step="7"
              value={days} onChange={e => setDays(parseInt(e.target.value))}
              className="w-full accent-blue-500 mt-2"
              id="backtest-days"
            />
          </div>

          {/* Confidence */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Min Confidence: {confidence}%</label>
            <input
              type="range" min="50" max="95" step="5"
              value={confidence} onChange={e => setConfidence(parseInt(e.target.value))}
              className="w-full accent-purple-500 mt-2"
              id="backtest-confidence"
            />
          </div>

          {/* Risk */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Risk/Trade: {risk}%</label>
            <input
              type="range" min="0.5" max="10" step="0.5"
              value={risk} onChange={e => setRisk(parseFloat(e.target.value))}
              className="w-full accent-orange-500 mt-2"
              id="backtest-risk"
            />
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runBacktest}
          disabled={loading}
          id="backtest-run-btn"
          className="w-full py-3 rounded-xl font-bold text-white transition-all"
          style={{ background: loading ? '#374151' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running backtest on {days} days of {coin} data…
            </span>
          ) : `▶ Run Backtest — ${coin} / ${days}d`}
        </button>

        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-700/30 p-4 text-red-400 text-sm">⚠️ {error}</div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Win Rate', value: `${results.winRate}%`, color: results.winRate >= 60 ? '#22c55e' : results.winRate >= 45 ? '#eab308' : '#ef4444' },
                { label: 'Profit Factor', value: results.profitFactor?.toFixed(2), color: results.profitFactor >= 1.5 ? '#22c55e' : results.profitFactor >= 1 ? '#eab308' : '#ef4444' },
                { label: 'Max Drawdown', value: `${results.maxDrawdown}%`, color: '#ef4444' },
                { label: 'Total Return', value: `${results.totalReturn >= 0 ? '+' : ''}${results.totalReturn}%`, color: results.totalReturn >= 0 ? '#22c55e' : '#ef4444' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl bg-gray-900/80 border border-gray-700/30 p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="rounded-xl bg-gray-900/60 border border-gray-700/20 p-3">
                <div className="text-gray-400">Signals Executed</div>
                <div className="text-white font-bold text-lg">{results.executed}</div>
              </div>
              <div className="rounded-xl bg-green-900/20 border border-green-700/20 p-3">
                <div className="text-green-400">Wins</div>
                <div className="text-green-400 font-bold text-lg">{results.wins}</div>
              </div>
              <div className="rounded-xl bg-red-900/20 border border-red-700/20 p-3">
                <div className="text-red-400">Losses</div>
                <div className="text-red-400 font-bold text-lg">{results.losses}</div>
              </div>
            </div>

            {/* By Regime */}
            {results.byRegime && Object.keys(results.byRegime).length > 0 && (
              <div className="rounded-2xl bg-gray-900/80 border border-gray-700/30 p-5">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Performance by Regime</h3>
                <div className="space-y-3">
                  {Object.entries(results.byRegime).map(([regime, data]) => (
                    <div key={regime} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-28 capitalize">{regime.replace('_', ' ')}</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${data.winRate}%`, backgroundColor: REGIME_COLORS[regime] || '#6b7280' }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-12 text-right" style={{ color: REGIME_COLORS[regime] || '#6b7280' }}>
                        {data.winRate}%
                      </span>
                      <span className="text-xs text-gray-600 w-16">({data.signals} signals)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signal Log (last 10) */}
            {results.signalLog?.length > 0 && (
              <div className="rounded-2xl bg-gray-900/80 border border-gray-700/30 p-5">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Last Signal Log (sample)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700/30">
                        <th className="text-left p-2 text-gray-500">Date</th>
                        <th className="text-left p-2 text-gray-500">Signal</th>
                        <th className="text-left p-2 text-gray-500">Conf</th>
                        <th className="text-left p-2 text-gray-500">Outcome</th>
                        <th className="text-left p-2 text-gray-500">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.signalLog.slice(-10).map((s, i) => (
                        <tr key={i} className="border-b border-gray-800/30">
                          <td className="p-2 text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</td>
                          <td className="p-2 font-bold" style={{ color: s.signal === 'BUY' ? '#22c55e' : '#ef4444' }}>{s.signal}</td>
                          <td className="p-2 text-gray-300">{s.confidence?.toFixed(0)}%</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${s.outcome === 'win' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{s.outcome}</span>
                          </td>
                          <td className="p-2" style={{ color: s.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{s.pnl >= 0 ? '+' : ''}{s.pnl?.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
