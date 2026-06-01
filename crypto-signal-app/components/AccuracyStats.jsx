'use client'
import { useState } from 'react'
import { getConfidenceColor } from '../lib/utils/formatters'

export default function AccuracyStats({ stats, insights, onRefresh }) {
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    if (onRefresh) await onRefresh()
    setLoading(false)
  }

  const winRate = stats?.winRate || 0
  const wins = stats?.wins || 0
  const losses = stats?.losses || 0
  const pending = stats?.pending || 0

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Accuracy Stats</h3>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-blue-900/30 border border-blue-700/30 text-blue-300 hover:bg-blue-900/50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : '🧠 AI Insights'}
        </button>
      </div>

      {/* Win Rate Donut */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1f2937" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9155" fill="none"
              stroke={getConfidenceColor(winRate)}
              strokeWidth="3"
              strokeDasharray={`${winRate} ${100 - winRate}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{winRate}%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          <div className="text-center bg-green-900/20 rounded-lg p-2 border border-green-800/20">
            <div className="text-green-400 font-bold text-xl">{wins}</div>
            <div className="text-green-400/60 text-xs">Wins</div>
          </div>
          <div className="text-center bg-red-900/20 rounded-lg p-2 border border-red-800/20">
            <div className="text-red-400 font-bold text-xl">{losses}</div>
            <div className="text-red-400/60 text-xs">Losses</div>
          </div>
          <div className="text-center bg-gray-800/40 rounded-lg p-2 border border-gray-700/20">
            <div className="text-gray-400 font-bold text-xl">{pending}</div>
            <div className="text-gray-400/60 text-xs">Pending</div>
          </div>
        </div>
      </div>

      {/* Best Regime */}
      {stats?.bestRegime && (
        <div className="bg-green-900/10 border border-green-700/20 rounded-xl p-3 mb-3">
          <div className="text-xs text-green-400 mb-1">Best Regime</div>
          <div className="text-sm text-green-200 capitalize font-medium">{stats.bestRegime?.replace('_', ' ')}</div>
        </div>
      )}

      {/* AI Insights */}
      {insights?.summary && (
        <div className="bg-blue-900/10 border border-blue-700/20 rounded-xl p-3 mb-3">
          <div className="text-xs text-blue-400 mb-1">AI Assessment</div>
          <p className="text-xs text-blue-200 leading-relaxed">{insights.summary}</p>
        </div>
      )}

      {/* Recommendations */}
      {insights?.recommendations?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Recommendations</div>
          {insights.recommendations.slice(0, 3).map((r, i) => (
            <div key={i} className="flex gap-2 bg-gray-800/30 rounded-lg p-2 border border-gray-700/20">
              <span className="text-yellow-400 text-xs mt-0.5">→</span>
              <div>
                <div className="text-xs text-gray-200">{r.change}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.expectedImprovement}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
