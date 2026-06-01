'use client'
import { useState, useEffect } from 'react'

export default function InsightsPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/memory')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInsights() }, [])

  const insights = data?.insights

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-700/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">← Dashboard</a>
            <span className="text-gray-600">/</span>
            <h1 className="font-black text-white">🧠 AI Strategy Insights</h1>
          </div>
          <button onClick={fetchInsights} disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm">{error}</div>}

        {loading && !data && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-gray-800/50 animate-pulse" />)}
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-gray-500">No signal history yet. Generate signals to get AI insights.</div>
        )}

        {insights && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-6 backdrop-blur-sm">
              <h2 className="font-bold text-white text-lg mb-4">Overview</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center bg-gray-800/40 rounded-xl p-4">
                  <div className="text-3xl font-black text-white">{insights.totalTrades || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Trades</div>
                </div>
                <div className="text-center bg-green-900/20 rounded-xl p-4 border border-green-800/20">
                  <div className="text-3xl font-black text-green-400">{insights.winRate || 0}%</div>
                  <div className="text-xs text-gray-400 mt-1">Win Rate</div>
                </div>
                <div className="text-center bg-blue-900/20 rounded-xl p-4 border border-blue-800/20">
                  <div className="text-3xl font-black text-blue-400">{data?.totalSignals || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Signals</div>
                </div>
              </div>
              {insights.summary && (
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/20">
                  <p className="text-gray-300 italic text-sm leading-relaxed">{insights.summary}</p>
                </div>
              )}
            </div>

            {/* Best / Worst Setups */}
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-2xl border border-green-700/30 bg-green-900/10 p-5">
                <h3 className="font-bold text-green-300 mb-3">✅ Best Setups</h3>
                {insights.bestSetups?.length > 0 ? insights.bestSetups.map((s, i) => (
                  <div key={i} className="bg-green-900/20 rounded-xl p-3 mb-2">
                    <div className="text-sm text-white font-medium">{s.condition}</div>
                    <div className="text-xs text-green-400 mt-1">{s.winRate}% win rate · {s.count} trades</div>
                  </div>
                )) : <p className="text-gray-500 text-sm">Not enough data</p>}
              </div>
              <div className="rounded-2xl border border-red-700/30 bg-red-900/10 p-5">
                <h3 className="font-bold text-red-300 mb-3">❌ Worst Setups</h3>
                {insights.worstSetups?.length > 0 ? insights.worstSetups.map((s, i) => (
                  <div key={i} className="bg-red-900/20 rounded-xl p-3 mb-2">
                    <div className="text-sm text-white font-medium">{s.condition}</div>
                    <div className="text-xs text-red-400 mt-1">{s.winRate}% win rate · {s.count} trades</div>
                  </div>
                )) : <p className="text-gray-500 text-sm">Not enough data</p>}
              </div>
            </div>

            {/* Recommendations */}
            {insights.recommendations?.length > 0 && (
              <div className="rounded-2xl border border-blue-700/30 bg-blue-900/10 p-6">
                <h3 className="font-bold text-blue-300 mb-4">💡 AI Recommendations</h3>
                <div className="space-y-3">
                  {insights.recommendations.map((r, i) => (
                    <div key={i} className="flex gap-3 bg-blue-900/20 rounded-xl p-4">
                      <span className="text-blue-400 font-black text-sm mt-0.5">{i + 1}</span>
                      <div>
                        <div className="text-sm text-white font-medium">{r.change}</div>
                        <div className="text-xs text-blue-300/70 mt-1">{r.expectedImprovement}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Condition Breakdown */}
            {insights.marketConditionBreakdown && (
              <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-6">
                <h3 className="font-bold text-white mb-4">📊 Win Rate by Market Condition</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(insights.marketConditionBreakdown).map(([condition, stats]) => (
                    <div key={condition} className="bg-gray-800/40 rounded-xl p-4">
                      <div className="text-sm font-medium text-white capitalize mb-2">{condition}</div>
                      <div className="text-2xl font-black text-white">{stats.winRate || 0}%</div>
                      <div className="text-xs text-gray-400">{stats.count || 0} trades</div>
                      <div className="mt-2 h-1.5 bg-gray-700 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.winRate || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
