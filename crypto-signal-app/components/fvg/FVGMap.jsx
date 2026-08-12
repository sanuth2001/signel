'use client'
import { useState } from 'react'

export default function FVGMap({ fvgScan, currentPrice, onSelectFVG }) {
  const [filterTF, setFilterTF] = useState('ALL')

  if (!fvgScan || !fvgScan.allFVGs) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-gray-400 text-sm font-medium">Scanning institutional FVG zones across timeframes...</p>
      </div>
    )
  }

  const p = currentPrice || fvgScan.currentPrice || 68000

  // Filter FVGs by timeframe if selected
  const allFVGs = (fvgScan.allFVGs || []).filter(f => filterTF === 'ALL' || f.timeframe === filterTF.toLowerCase())

  // Bearish FVGs ABOVE current price (sorted highest to lowest)
  const bearishAbove = allFVGs
    .filter(f => f.type === 'bearish' && f.zone.low >= p)
    .sort((a, b) => b.zone.low - a.zone.low)

  // Bearish FVGs INSIDE or TOUCHING price
  const bearishActive = allFVGs
    .filter(f => f.type === 'bearish' && f.zone.low < p && f.zone.high >= p)

  // Bullish FVGs INSIDE or TOUCHING price
  const bullishActive = allFVGs
    .filter(f => f.type === 'bullish' && f.zone.low <= p && f.zone.high > p)

  // Bullish FVGs BELOW current price (sorted highest to lowest)
  const bullishBelow = allFVGs
    .filter(f => f.type === 'bullish' && f.zone.high <= p)
    .sort((a, b) => b.zone.high - a.zone.high)

  const getGradeBadge = (fvg) => {
    const q = fvg.quality || 5
    if (q >= 8 || fvg.isStacked) return { label: 'S-TIER 🔥', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-900/40 shadow-sm animate-pulse' }
    if (q >= 6) return { label: 'A-TIER ⭐', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' }
    if (q >= 4) return { label: 'B-TIER', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
    return { label: 'C-TIER', bg: 'bg-gray-700/30 text-gray-400 border-gray-700' }
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <h2 className="text-lg font-bold text-white tracking-wide">MARKET FVG MAP</h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
              Live Institutional Zones
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Imbalance zones where Smart Money left unexecuted liquidity
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1 bg-gray-900/90 p-1 rounded-xl border border-gray-800">
          {['ALL', '1D', '4H', '1H', '15M', '5M'].map(tf => (
            <button
              key={tf}
              onClick={() => setFilterTF(tf)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                filterTF === tf
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Price Ladder Container */}
      <div className="space-y-4">

        {/* BEARISH FVGs (ABOVE CURRENT PRICE - SELL ZONES) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-2 px-1">
            <span>ABOVE PRICE (Bearish FVGs — SELL / Supply Zones)</span>
            <span>{bearishAbove.length + bearishActive.length} zones detected</span>
          </div>

          <div className="space-y-2">
            {bearishAbove.length === 0 && bearishActive.length === 0 ? (
              <div className="text-center py-4 rounded-xl border border-dashed border-gray-800 text-xs text-gray-500">
                No active Bearish FVGs above current price for this timeframe
              </div>
            ) : (
              [...bearishActive, ...bearishAbove].map(fvg => {
                const badge = getGradeBadge(fvg)
                return (
                  <div
                    key={fvg.id}
                    onClick={() => onSelectFVG && onSelectFVG(fvg)}
                    className={`group relative overflow-hidden rounded-xl border p-3.5 transition-all cursor-pointer ${
                      fvg.priceInZone
                        ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50 ring-2 ring-rose-500/50'
                        : 'bg-gradient-to-r from-rose-950/20 via-gray-900/60 to-gray-900/40 border-rose-900/40 hover:border-rose-500/60 hover:bg-rose-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-500"></span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-white">
                              ${fvg.zone.low.toLocaleString()} — ${fvg.zone.high.toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {fvg.timeframe.toUpperCase()} Bearish FVG
                            </span>
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>Midpoint: <strong className="text-gray-200">${fvg.zone.mid.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Imbalance Size: <strong className="text-rose-300">{fvg.zone.sizePercent}%</strong></span>
                            <span>•</span>
                            <span>Quality: <strong className="text-amber-300">{fvg.quality}/10</strong></span>
                            {fvg.fillPercent > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400">Filled: {fvg.fillPercent}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-rose-400">
                          +{Math.abs(fvg.distanceFromCurrent)}%
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {fvg.priceInZone ? '🔥 INSIDE ZONE' : 'above price'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* CURRENT PRICE DIVIDER BAR */}
        <div className="my-6 relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-blue-500/50 border-dashed"></div>
          </div>
          <div className="relative flex justify-center">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-extrabold text-sm px-6 py-2 rounded-full shadow-lg shadow-blue-600/40 border border-blue-400/30 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              CURRENT MARKET PRICE: ${p.toLocaleString()}
            </div>
          </div>
        </div>

        {/* BULLISH FVGs (BELOW CURRENT PRICE - BUY ZONES) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2 px-1">
            <span>BELOW PRICE (Bullish FVGs — BUY / Demand Zones)</span>
            <span>{bullishBelow.length + bullishActive.length} zones detected</span>
          </div>

          <div className="space-y-2">
            {bullishBelow.length === 0 && bullishActive.length === 0 ? (
              <div className="text-center py-4 rounded-xl border border-dashed border-gray-800 text-xs text-gray-500">
                No active Bullish FVGs below current price for this timeframe
              </div>
            ) : (
              [...bullishActive, ...bullishBelow].map(fvg => {
                const badge = getGradeBadge(fvg)
                return (
                  <div
                    key={fvg.id}
                    onClick={() => onSelectFVG && onSelectFVG(fvg)}
                    className={`group relative overflow-hidden rounded-xl border p-3.5 transition-all cursor-pointer ${
                      fvg.priceInZone
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/50'
                        : 'bg-gradient-to-r from-emerald-950/20 via-gray-900/60 to-gray-900/40 border-emerald-900/40 hover:border-emerald-500/60 hover:bg-emerald-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"></span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-white">
                              ${fvg.zone.low.toLocaleString()} — ${fvg.zone.high.toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {fvg.timeframe.toUpperCase()} Bullish FVG
                            </span>
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>Midpoint: <strong className="text-gray-200">${fvg.zone.mid.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Imbalance Size: <strong className="text-emerald-300">{fvg.zone.sizePercent}%</strong></span>
                            <span>•</span>
                            <span>Quality: <strong className="text-amber-300">{fvg.quality}/10</strong></span>
                            {fvg.fillPercent > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400">Filled: {fvg.fillPercent}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          -{Math.abs(fvg.distanceFromCurrent)}%
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {fvg.priceInZone ? '🔥 INSIDE ZONE' : 'below price'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      <div className="mt-4 pt-3 border-t border-gray-800 text-center text-xs text-gray-500">
        💡 Click any FVG row to inspect detailed candle formation and quality metrics
      </div>
    </div>
  )
}
