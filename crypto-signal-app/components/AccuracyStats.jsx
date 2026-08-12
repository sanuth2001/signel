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
  const streak = stats?.streak || { count: 0, type: null }
  const wowChange = stats?.wowChange || 0

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
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-base font-bold text-white">{winRate}%</span>
            {wowChange !== 0 && (
              <span className={`text-[8px] font-semibold mt-0.5 ${wowChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {wowChange >= 0 ? `+${wowChange}%` : `${wowChange}%`} WoW
              </span>
            )}
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

      {/* Streak Badge */}
      {streak.count > 0 && (
        <div className={`mb-4 rounded-xl p-2.5 flex items-center justify-between border ${
          streak.type === 'win'
            ? 'bg-green-950/20 border-green-800/30 text-green-300'
            : 'bg-red-950/20 border-red-800/30 text-red-300'
        }`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Current Streak</span>
          <span className="text-xs font-bold flex items-center gap-1">
            {streak.count} {streak.type === 'win' ? 'Wins' : 'Losses'} in a row {streak.type === 'win' ? '🔥' : '❄️'}
          </span>
        </div>
      )}

      {/* Session Performance Breakdown */}
      {stats?.bySession && (
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/20 mb-3 text-xs space-y-2">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Session Performance</div>
          
          <div className="border-t border-gray-800/60 pt-2 space-y-1.5">
            <div className="grid grid-cols-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider pb-1">
              <span>Session</span>
              <span className="text-center">Signals</span>
              <span className="text-center">Wins</span>
              <span className="text-right">Win Rate</span>
            </div>
            
            {(() => {
              const sessionsList = [
                { key: 'overlap', label: 'Overlap', stats: stats.bySession.overlap, icon: '🏆' },
                { key: 'new_york', label: 'New York', stats: stats.bySession.new_york, icon: '✅' },
                { key: 'london', label: 'London', stats: stats.bySession.london, icon: '✅' },
                { key: 'asia', label: 'Asia', stats: stats.bySession.asia, icon: '⚠️' },
                { key: 'dead_zone', label: 'Dead Zone', stats: stats.bySession.dead_zone, icon: '❌' },
              ]

              return sessionsList.map(item => {
                const s = item.stats || { signals: 0, wins: 0, winRate: 0 }
                return (
                  <div key={item.key} className="grid grid-cols-4 items-center text-gray-300">
                    <span className="font-semibold text-white">{item.label}</span>
                    <span className="text-center font-mono">{s.signals}</span>
                    <span className="text-center font-mono">{s.wins}</span>
                    <span className="text-right font-mono font-bold flex justify-end items-center gap-1">
                      {s.winRate.toFixed(1)}%
                      <span className="text-xs">{item.icon}</span>
                    </span>
                  </div>
                )
              })
            })()}
          </div>

          <div className="border-t border-gray-800/60 pt-2 mt-2 text-[10px] text-gray-400 leading-normal space-y-1">
            <div>
              💡 <span className="font-bold text-green-400">Best Window:</span> Overlap (13:00-16:00 UTC)
            </div>
            <div>
              ⚠️ <span className="font-bold text-red-400">Avoid:</span> Dead Zone + Asia for best results
            </div>
          </div>
        </div>
      )}

      {/* Vision Performance Breakdown */}
      {stats?.visionStats && (
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/20 mb-3 text-xs space-y-2">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Vision Accuracy</div>
          
          <div className="border-t border-gray-800/60 pt-2 space-y-1.5">
            <div className="grid grid-cols-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider pb-1">
              <span>Category</span>
              <span className="text-center">Signals</span>
              <span className="text-right">Win Rate</span>
            </div>
            
            <div className="grid grid-cols-3 items-center text-gray-300">
              <span className="font-semibold text-white">Vision Confirmed</span>
              <span className="text-center font-mono">{stats.visionStats.confirmed?.total || 0}</span>
              <span className="text-right font-mono font-bold text-yellow-400">
                {stats.visionStats.confirmed?.winRate}%
              </span>
            </div>
            <div className="grid grid-cols-3 items-center text-gray-300">
              <span className="font-semibold text-white">Vision Only</span>
              <span className="text-center font-mono">{stats.visionStats.visionOnly?.total || 0}</span>
              <span className="text-right font-mono font-bold text-blue-400">
                {stats.visionStats.visionOnly?.winRate}%
              </span>
            </div>
            <div className="grid grid-cols-3 items-center text-gray-300">
              <span className="font-semibold text-white">Math Only</span>
              <span className="text-center font-mono">{stats.visionStats.mathOnly?.total || 0}</span>
              <span className="text-right font-mono font-bold text-gray-400">
                {stats.visionStats.mathOnly?.winRate}%
              </span>
            </div>
          </div>
        </div>
      )}

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
