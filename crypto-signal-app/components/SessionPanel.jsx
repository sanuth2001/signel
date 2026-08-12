'use client'
import React from 'react'

export default function SessionPanel({ session }) {
  if (!session) return null

  const { current, transition, adjustment, history, upcomingWindows } = session

  // Color and branding configuration based on the active session
  const colors = {
    "London-NY Overlap": {
      border: 'border-amber-500/40 shadow-amber-500/5',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      stars: '⭐⭐⭐⭐⭐',
      quality: 'EXCELLENT',
      qualityColor: 'text-amber-400'
    },
    "New York Session": {
      border: 'border-green-500/30 shadow-green-500/5',
      badge: 'bg-green-500/10 text-green-400 border-green-500/20',
      stars: '⭐⭐⭐⭐',
      quality: 'VERY GOOD',
      qualityColor: 'text-green-400'
    },
    "London Session": {
      border: 'border-blue-500/30 shadow-blue-500/5',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      stars: '⭐⭐⭐',
      quality: 'GOOD',
      qualityColor: 'text-blue-400'
    },
    "Asia Session": {
      border: 'border-purple-500/30 shadow-purple-500/5',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      stars: '⭐⭐',
      quality: 'FAIR',
      qualityColor: 'text-purple-400'
    },
    "Dead Zone": {
      border: 'border-red-500/40 shadow-red-500/5',
      badge: 'bg-red-500/10 text-red-400 border-red-500/30',
      stars: '❌',
      quality: 'SUSPENDED',
      qualityColor: 'text-red-400'
    }
  }

  const sCfg = colors[current.name] || colors["Asia Session"]

  // Active markets open/closed status bar rendering
  const hour = current.currentHourUTC
  const londonOpen = hour >= 8 && hour < 16
  const nyOpen = hour >= 13 && hour < 21
  const tokyoOpen = hour >= 0 && hour < 8

  const drawProgressBar = (open) => {
    if (open) {
      return (
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] text-green-400 font-bold w-10">OPEN</span>
          <div className="h-2 rounded-full bg-green-500/20 flex-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 w-full animate-pulse" />
          </div>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] text-gray-500 font-medium w-10">CLOSED</span>
          <div className="h-2 rounded-full bg-gray-800/80 flex-1" />
        </div>
      )
    }
  }

  // Session history listing data mapping
  const historyList = [
    { key: 'overlap', label: 'Overlap', stats: history.overlap, badge: '🏆' },
    { key: 'new_york', label: 'New York', stats: history.new_york, badge: '✅' },
    { key: 'london', label: 'London', stats: history.london, badge: '✅' },
    { key: 'asia', label: 'Asia', stats: history.asia, badge: '⚠️' },
    { key: 'dead_zone', label: 'Dead Zone', stats: history.dead_zone, badge: '❌' },
  ]

  const bestSessionKey = history.bestSession || 'overlap'

  return (
    <div className={`rounded-2xl border bg-gray-900/60 p-4 backdrop-blur-sm shadow-xl transition-all ${sCfg.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <span className="text-base">🌍</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Trading Session</h3>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${sCfg.badge}`}>
          {current.name.toUpperCase()}
        </span>
      </div>

      {/* Current Time and Description */}
      <div className="space-y-1 mb-4 bg-black/10 rounded-xl p-3">
        <div className="text-sm font-bold text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {current.currentTime}
          <span className="text-xs text-gray-500 font-normal">({current.description})</span>
        </div>
        <div className="text-xs text-gray-400">
          Ends in <span className="font-mono font-semibold text-gray-200">
            {Math.floor(current.minutesRemaining / 60)}h {current.minutesRemaining % 60}m
          </span>
        </div>
        {transition?.isTransition && transition.warning && (
          <div className="mt-2.5 text-[11px] text-amber-400 font-semibold flex items-start gap-1">
            <span>⚠️</span>
            <div>
              <div>{transition.warning}</div>
              <div className="text-[10px] text-amber-500/80 font-normal mt-0.5">{transition.recommendation}</div>
            </div>
          </div>
        )}
      </div>

      {/* Active Markets open/closed bars */}
      <div className="mb-4">
        <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Active Markets</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-400 w-16">🇬🇧 London</span>
            {drawProgressBar(londonOpen)}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-400 w-16">🇺🇸 New York</span>
            {drawProgressBar(nyOpen)}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-400 w-16">🇯🇵 Tokyo</span>
            {drawProgressBar(tokyoOpen)}
          </div>
        </div>
      </div>

      {/* Session Quality Badge */}
      <div className="mb-4 bg-black/20 border border-gray-800/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Session Quality</div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{sCfg.stars}</span>
          <span className={`text-xs font-black tracking-wide ${sCfg.qualityColor}`}>{sCfg.quality}</span>
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          {adjustment.block ? (
            <span className="text-red-400 font-semibold">{adjustment.reason}</span>
          ) : (
            <>
              Confidence boost: <span className={`font-mono font-bold ${adjustment.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {adjustment.points >= 0 ? `+${adjustment.points}` : adjustment.points} points
              </span>
            </>
          )}
        </div>
      </div>

      {/* Session History Win Rates */}
      <div className="mb-4 pt-3 border-t border-gray-800/40">
        <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Session History (Win Rates)</h4>
        <div className="bg-black/10 border border-gray-800/60 rounded-xl p-2.5 space-y-1.5 text-xs">
          {historyList.map(item => {
            const isBest = item.key === bestSessionKey
            return (
              <div key={item.key} className="flex justify-between items-center text-gray-400 hover:text-white transition-colors">
                <span className="flex items-center gap-1.5">
                  <span>{item.badge}</span>
                  <span className={isBest ? 'text-white font-bold' : ''}>{item.label}</span>
                </span>
                <span className="font-mono text-gray-300">
                  {item.stats?.winRate?.toFixed(1)}% <span className="text-gray-600">({item.stats?.signals} txn)</span>
                  {isBest && <span className="text-green-400 ml-1.5 font-bold text-[9px] uppercase tracking-wide">Best ✅</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming event countdowns */}
      {upcomingWindows?.length > 0 && (
        <div className="pt-3 border-t border-gray-800/40">
          <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Upcoming Transitions</h4>
          <div className="space-y-1.5 text-xs">
            {upcomingWindows.slice(0, 3).map((w, i) => (
              <div key={i} className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-gray-300 font-medium">{w.session}</span>
                  <span className="text-[9px] text-gray-500 block leading-tight">{w.warning}</span>
                </div>
                <span className="font-mono text-[10px] text-gray-500 flex-shrink-0">{w.startsIn}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
