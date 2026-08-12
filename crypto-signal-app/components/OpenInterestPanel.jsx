'use client'

import React from 'react'

function formatUSD(val) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`
  return `$${val.toLocaleString()}`
}

function formatOI(val) {
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function OpenInterestPanel({ openInterest }) {
  if (!openInterest) return null

  const { current, longShort, takerVolume, pattern, summary } = openInterest
  const trend = current?.trend || 'flat'
  const isRising = trend === 'rising'
  const isFalling = trend === 'falling'
  const trendColor = isRising ? '#22c55e' : isFalling ? '#ef4444' : '#94a3b8'
  const trendArrow = isRising ? '↑' : isFalling ? '↓' : '→'

  const longPercent = longShort?.longPercent ?? 50
  const shortPercent = longShort?.shortPercent ?? 50
  const extremeLong = longShort?.extremeLong ?? false
  const extremeShort = longShort?.extremeShort ?? false

  const isTakerBullish = (takerVolume?.ratio ?? 1.0) > 1.3
  const isTakerBearish = (takerVolume?.ratio ?? 1.0) < 0.77
  const takerColor = isTakerBullish ? '#22c55e' : isTakerBearish ? '#ef4444' : '#94a3b8'

  const patternUrgencyHigh = pattern?.urgency === 'high'
  const patternColor = pattern?.signal === 'BUY' ? '#22c55e' : pattern?.signal === 'SELL' ? '#ef4444' : '#eab308'

  return (
    <div
      className="rounded-2xl border p-4 backdrop-blur-sm"
      style={{
        background: '#0f1629',
        borderColor: '#1e2d4a',
        boxShadow: '0 0 24px rgba(59,130,246,0.05)',
      }}
    >
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <span className="text-xs font-black uppercase tracking-widest text-blue-400">Open Interest</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${trendColor}18`,
            color: trendColor,
            border: `1px solid ${trendColor}30`,
          }}
        >
          {trendArrow} {(trend || 'flat').charAt(0).toUpperCase() + (trend || 'flat').slice(1)}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Current OI</div>
          <div className="text-xs font-bold text-white">{formatOI(current?.openInterest || 0)} <span className="text-[10px] text-gray-500">units</span></div>
          <div className="text-[10px] text-gray-600">USD: {formatUSD(current?.openInterestUSD || 0)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">24h Change</div>
          <div className="text-xs font-bold" style={{ color: trendColor }}>
            {current?.change24h >= 0 ? '+' : ''}{(current?.change24h || 0).toFixed(2)}%
          </div>
          <div className="text-[10px] text-gray-600">Microstructure trend</div>
        </div>
      </div>

      {/* Positioning Segment */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest mb-2">
          <span>Positioning (Long/Short)</span>
          <span className="font-mono text-gray-300">
            {longPercent}% L / {shortPercent}% S
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden flex mb-2">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${longPercent}%`, backgroundColor: '#3b82f6' }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${shortPercent}%`, backgroundColor: '#ef4444' }}
          />
        </div>

        {/* Extreme Crowding warning banners */}
        {extremeLong && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/20 border border-red-700/30 text-red-300 mb-2">
            <span className="text-xs">⚠️</span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">Extreme Long Crowding</div>
              <div className="text-[10px]">Liquidation cascade risk below support levels.</div>
            </div>
          </div>
        )}

        {extremeShort && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-900/20 border border-green-700/30 text-green-300 mb-2">
            <span className="text-xs">🟢</span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider">Extreme Short Crowding</div>
              <div className="text-[10px]">Potential short squeeze scenario risk.</div>
            </div>
          </div>
        )}
      </div>

      {/* Taker Volume Aggression */}
      <div className="border-t border-gray-800 pt-3 mb-4">
        <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest mb-2">
          <span>Taker Volume Dominance</span>
          <span className="font-bold text-xs" style={{ color: takerColor }}>
            Ratio: {takerVolume?.ratio || '1.0'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Aggression:</span>
          <span className="font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${takerColor}15`, color: takerColor }}>
            {(takerVolume?.trend || 'balanced').replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Pattern Detection */}
      <div className="border-t border-gray-800 pt-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">OI Pattern Detected</div>
        {pattern?.pattern && pattern.pattern !== 'neutral' ? (
          <div
            className="rounded-xl p-3 border leading-relaxed text-xs"
            style={{
              backgroundColor: `${patternColor}08`,
              borderColor: `${patternColor}20`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold" style={{ color: patternColor }}>
                {pattern.pattern.toUpperCase().replace('_', ' ')}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-black uppercase"
                style={{
                  backgroundColor: patternUrgencyHigh ? '#78350f30' : '#1e2d4a50',
                  color: patternUrgencyHigh ? '#fbbf24' : '#94a3b8',
                }}
              >
                {pattern.urgency || 'low'} urgency
              </span>
            </div>
            <p className="text-gray-300 text-[11px] mb-2">{pattern.description}</p>
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 pt-1.5 border-t border-gray-800/40">
              <span>Confidence Adjustment:</span>
              <span className={(pattern.confidenceAdjustment || 0) >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                {(pattern.confidenceAdjustment || 0) >= 0 ? '+' : ''}
                {pattern.confidenceAdjustment || 0}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic bg-black/10 rounded-xl p-3 border border-gray-800/40 text-center">
            {summary}
          </div>
        )}
      </div>
    </div>
  )
}
