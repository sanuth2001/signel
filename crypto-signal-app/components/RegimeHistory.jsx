'use client'
// Prompt 35 — Regime History Timeline Component
import React from 'react'
import { timeAgo } from '../lib/utils/formatters'

const REGIME_CONFIG = {
  trending_up: { icon: '📈', label: 'Trending Up', color: '#22c55e', bg: '#22c55e18' },
  trending_down: { icon: '📉', label: 'Trending Down', color: '#ef4444', bg: '#ef444418' },
  ranging: { icon: '↔️', label: 'Ranging', color: '#eab308', bg: '#eab30818' },
  high_volatility: { icon: '⚡', label: 'High Volatility', color: '#f97316', bg: '#f9731618' },
  low_liquidity: { icon: '💧', label: 'Low Liquidity', color: '#6b7280', bg: '#6b728018' },
}

function formatDuration(startTime, endTime) {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  const diffMs = end - start
  const diffHours = diffMs / 3600000
  if (diffHours < 1) return `${Math.round(diffMs / 60000)}m`
  if (diffHours < 24) return `${diffHours.toFixed(1)}h`
  return `${(diffHours / 24).toFixed(1)}d`
}

export default function RegimeHistory({ history = [], currentRegime }) {
  if (!history || history.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-gray-700/30">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Regime History</h3>
      </div>

      <div className="p-4">
        {/* Current regime */}
        {currentRegime && (
          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg border" style={{ borderColor: REGIME_CONFIG[currentRegime]?.color + '40', backgroundColor: REGIME_CONFIG[currentRegime]?.bg }}>
            <span className="text-lg">{REGIME_CONFIG[currentRegime]?.icon}</span>
            <div>
              <div className="text-xs text-gray-400">Current</div>
              <div className="text-sm font-semibold" style={{ color: REGIME_CONFIG[currentRegime]?.color }}>{REGIME_CONFIG[currentRegime]?.label}</div>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: REGIME_CONFIG[currentRegime]?.color }} />
                <span className="text-xs text-gray-400">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-700/50" />
          <div className="space-y-3">
            {history.map((entry, i) => {
              const config = REGIME_CONFIG[entry.regime] || REGIME_CONFIG.ranging
              const duration = formatDuration(entry.startTime, entry.endTime)
              const isFirst = i === 0

              return (
                <div key={entry.id || i} className="flex items-start gap-3 ml-1">
                  <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border" style={{ backgroundColor: config.bg, borderColor: config.color + '60' }}>
                    <span className="text-sm">{config.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: config.color }}>{config.label}</span>
                      <span className="text-xs text-gray-500">{duration}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">{timeAgo(entry.startTime)}</span>
                      {entry.signalsGenerated > 0 && (
                        <span className="text-xs text-gray-600">{entry.signalsGenerated} signals</span>
                      )}
                      {entry.winRate > 0 && (
                        <span className={`text-xs font-medium ${entry.winRate >= 60 ? 'text-green-400' : entry.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {entry.winRate.toFixed(0)}% WR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
