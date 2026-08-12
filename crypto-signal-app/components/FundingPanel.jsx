'use client'

import React from 'react'

function formatRate(rate) {
  if (rate == null) return 'N/A'
  return `${(rate * 100).toFixed(4)}%`
}

function formatRatePercent(ratePct) {
  if (ratePct == null) return 'N/A'
  return `${ratePct.toFixed(4)}%`
}

export default function FundingPanel({ funding }) {
  if (!funding) return null

  const { current, history, analysis, cost, chartData } = funding
  const rateVal = current.ratePercent

  // Badge configuration based on current rate values
  let badgeLabel = 'NEUTRAL'
  let badgeColor = '#22c55e'
  let badgeBg = '#22c55e15'

  if (rateVal > 0.10) {
    badgeLabel = '⚠️ EXTREME'
    badgeColor = '#ef4444'
    badgeBg = '#ef444415'
  } else if (rateVal > 0.05) {
    badgeLabel = '⚠️ HIGH'
    badgeColor = '#f97316'
    badgeBg = '#f9731615'
  } else if (rateVal > 0.01) {
    badgeLabel = '⚠️ ELEVATED'
    badgeColor = '#eab308'
    badgeBg = '#eab30815'
  } else if (rateVal < -0.01) {
    badgeLabel = '🔵 NEGATIVE'
    badgeColor = '#3b82f6'
    badgeBg = '#3b82f615'
  } else {
    badgeLabel = '🟢 NEUTRAL'
    badgeColor = '#22c55e'
    badgeBg = '#22c55e15'
  }

  // Trend mapping
  const trendArrow = {
    rising: '↑ Rising',
    falling: '↓ Falling',
    oscillating: '⇅ Oscillating',
    neutral: '→ Neutral'
  }[history.trend || 'neutral']

  const trendColor = {
    rising: '#ef4444',
    falling: '#22c55e',
    oscillating: '#eab308',
    neutral: '#94a3b8'
  }[history.trend || 'neutral']

  // Reversal indicator colors
  const signalColor = analysis.signal === 'BUY' ? '#22c55e' : analysis.signal === 'SELL' ? '#ef4444' : '#eab308'

  // Build SVG mini chart heights
  const chartHeight = 35
  const chartWidth = 220
  const padding = 2
  const barsCount = chartData?.length || 24
  const barWidth = Math.floor((chartWidth - (barsCount - 1) * padding) / barsCount)

  // Max absolute rate for chart scaling
  const maxAbsRate = Math.max(...(chartData?.map(d => Math.abs(d.ratePercent)) || [0.01])) || 0.01

  return (
    <div
      className="rounded-2xl border p-4 backdrop-blur-sm"
      style={{
        background: '#0f1629',
        borderColor: '#1e2d4a',
        boxShadow: '0 0 24px rgba(234,179,8,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">Funding Analysis</span>
        </div>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ backgroundColor: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}30` }}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Current Rate</div>
          <div className="text-xs font-bold text-white">{formatRatePercent(rateVal)}</div>
          <div className="text-[10px] text-gray-600">Annualized: {current.annualized.toFixed(2)}%</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Funding Trend</div>
          <div className="text-xs font-bold" style={{ color: trendColor }}>
            {trendArrow}
          </div>
          <div className="text-[10px] text-gray-600">Dynamic 48h slope</div>
        </div>
      </div>

      {/* History Table */}
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Averages & Extremes</div>
      <div className="bg-black/10 border border-gray-800/60 rounded-xl p-2.5 space-y-1.5 mb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">24h Average:</span>
          <span className="font-mono text-gray-300">{formatRate(history.averages.last24h)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">7d Average:</span>
          <span className="font-mono text-gray-300">{formatRate(history.averages.last7d)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">30d Average:</span>
          <span className="font-mono text-gray-300">{formatRate(history.averages.last30d)}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-gray-800/50">
          <span className="text-gray-500">30d Range:</span>
          <span className="font-mono text-[10px] text-gray-400">
            High: <span className="text-red-400">{formatRate(history.extremes.max30d)}</span> | Low: <span className="text-blue-400">{formatRate(history.extremes.min30d)}</span>
          </span>
        </div>
      </div>

      {/* Mini SVG Chart */}
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Mini Chart (Last 24 Periods)</div>
      <div className="flex justify-center bg-black/30 border border-gray-800/40 rounded-xl p-2.5 mb-4">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {chartData?.map((d, i) => {
            const isNegative = d.ratePercent < 0
            const absVal = Math.abs(d.ratePercent)
            const height = Math.max(2, (absVal / maxAbsRate) * (chartHeight / 2))
            const x = i * (barWidth + padding)
            
            // Negative funding -> green bars extending down from center
            // Positive funding -> red bars extending up from center
            const y = isNegative ? (chartHeight / 2) : (chartHeight / 2) - height
            const fill = isNegative ? '#22c55e' : '#ef4444'

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={height}
                fill={fill}
                rx="1"
                className="transition-all hover:opacity-80"
              />
            )
          })}
          {/* Baseline */}
          <line
            x1="0"
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="2 2"
          />
        </svg>
      </div>

      {/* Consecutive Periods */}
      {history.consecutive.positive > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-950/20 border border-orange-500/20 text-orange-400 mb-4 text-xs">
          <span>⚠️</span>
          <div>
            <div className="font-bold">CONSECUTIVE: {history.consecutive.positive} positive periods</div>
            <div className="text-[10px] text-orange-500/80">Longs have been paying for {history.consecutive.positive * 8} hours straight.</div>
          </div>
        </div>
      )}

      {history.consecutive.negative > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-400 mb-4 text-xs">
          <span>🟢</span>
          <div>
            <div className="font-bold">CONSECUTIVE: {history.consecutive.negative} negative periods</div>
            <div className="text-[10px] text-blue-500/80">Shorts have been paying for {history.consecutive.negative * 8} hours straight.</div>
          </div>
        </div>
      )}

      {/* Signal Section */}
      <div className="border-t border-gray-800/80 pt-3 mb-4">
        <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest mb-2.5">
          <span>Funding Reversal Signal</span>
          <span className="font-bold text-xs" style={{ color: signalColor }}>
            {analysis.signal}
          </span>
        </div>
        <div
          className="rounded-xl p-3 border text-xs"
          style={{ backgroundColor: `${signalColor}08`, borderColor: `${signalColor}20` }}
        >
          <p className="text-gray-300 mb-2 leading-relaxed text-[11px]">{analysis.description}</p>
          <div className="flex justify-between text-[10px] font-mono text-gray-400 border-t border-gray-800/40 pt-1.5">
            <span>Reversal Probability:</span>
            <span className="text-white font-bold">{analysis.reversalProbability}%</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-gray-400 pt-1">
            <span>Confidence Impact:</span>
            <span className={analysis.confidenceAdjustment >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {analysis.confidenceAdjustment >= 0 ? '+' : ''}{analysis.confidenceAdjustment} points
            </span>
          </div>
        </div>
      </div>

      {/* Position Cost */}
      <div className="border-t border-gray-800/80 pt-3 text-xs">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Estimated Position Cost (24h)</div>
        <div className="bg-black/10 rounded-xl p-2.5 space-y-1 text-gray-400">
          <div className="flex justify-between">
            <span>Funding fee on $10k position:</span>
            <span className="text-white font-semibold">${Math.abs(cost.costUSD).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Break-even move needed:</span>
            <span className="text-white">{cost.breakEvenMove.toFixed(4)}%</span>
          </div>
          {cost.warning && (
            <div className="text-[9px] text-red-400 mt-1 font-semibold">
              ⚠️ {cost.warning}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
