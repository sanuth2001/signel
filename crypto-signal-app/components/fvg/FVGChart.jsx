'use client'
import { useState, useMemo } from 'react'

export default function FVGChart({ fvgScan, currentPrice, selectedFVG }) {
  const [activeTF, setActiveTF] = useState('4H')

  const price = currentPrice || fvgScan?.currentPrice || 68260

  const fvgs = useMemo(() => {
    if (!fvgScan || !fvgScan.allFVGs) return []
    return fvgScan.allFVGs.filter(f => f.timeframe === activeTF.toLowerCase() || activeTF === 'ALL')
  }, [fvgScan, activeTF])

  // Mock candlesticks around current price for rendering chart visual
  const candles = useMemo(() => {
    const list = []
    let p = price * 0.96
    const count = 30
    for (let i = 0; i < count; i++) {
      const isUp = i % 2 === 0
      const open = p
      const close = isUp ? p * (1 + 0.006) : p * (1 - 0.005)
      const high = Math.max(open, close) * 1.003
      const low = Math.min(open, close) * 0.997
      list.push({ index: i, open, high, low, close, isUp })
      p = close
    }
    // Make last candle close at exact current price
    list[count - 1].close = price
    list[count - 1].high = Math.max(list[count - 1].open, price) * 1.002
    list[count - 1].low = Math.min(list[count - 1].open, price) * 0.998
    return list
  }, [price])

  const minPrice = price * 0.93
  const maxPrice = price * 1.07
  const range = maxPrice - minPrice || 1

  const getTopPercent = (pVal) => {
    return Math.max(5, Math.min(92, ((maxPrice - pVal) / range) * 100))
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Header & TF Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <h3 className="font-bold text-white tracking-wide">FAIR VALUE GAP (FVG) CHART</h3>
            <p className="text-xs text-gray-400">Visual imbalance zone overlays & institutional entry points</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-gray-900/90 p-1 rounded-xl border border-gray-800">
          {['1D', '4H', '1H', '15M', '5M'].map(tf => (
            <button
              key={tf}
              onClick={() => setActiveTF(tf)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTF === tf
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative h-[360px] w-full bg-gray-950 rounded-xl border border-gray-800/80 p-4 flex flex-col justify-between overflow-hidden">

        {/* Horizontal Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-4 opacity-20">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="border-b border-gray-700 w-full"></div>
          ))}
        </div>

        {/* Current Price Line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 z-20 pointer-events-none transition-all flex items-center justify-end pr-4"
          style={{ top: `${getTopPercent(price)}%` }}
        >
          <span className="bg-blue-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-md border border-blue-400">
            CURRENT: ${price.toLocaleString()}
          </span>
        </div>

        {/* FVG Overlay Rectangles */}
        {fvgs.map(fvg => {
          const topPct = getTopPercent(fvg.zone.high)
          const bottomPct = getTopPercent(fvg.zone.low)
          const heightPct = Math.max(3, bottomPct - topPct)
          const isBull = fvg.type === 'bullish'
          const isSTier = fvg.quality >= 8 || fvg.isStacked

          return (
            <div
              key={fvg.id}
              className={`absolute left-8 right-16 rounded border transition-all z-10 p-2 flex items-center justify-between ${
                isBull
                  ? isSTier
                    ? 'bg-emerald-500/25 border-emerald-400/90 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400 animate-pulse'
                    : 'bg-emerald-500/15 border-emerald-500/50'
                  : isSTier
                    ? 'bg-rose-500/25 border-rose-400/90 shadow-lg shadow-rose-950/60 ring-1 ring-rose-400 animate-pulse'
                    : 'bg-rose-500/15 border-rose-500/50'
              }`}
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`
              }}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  isBull ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                }`}>
                  {fvg.timeframe.toUpperCase()} {fvg.type.toUpperCase()} FVG
                </span>
                {isSTier && (
                  <span className="text-[10px] font-black bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                    S-TIER ENTRY ZONE 🔥
                  </span>
                )}
              </div>

              <span className="text-[11px] font-mono font-bold text-white">
                ${fvg.zone.low.toLocaleString()} — ${fvg.zone.high.toLocaleString()}
              </span>
            </div>
          )
        })}

        {/* Candlesticks visual layout */}
        <div className="relative w-full h-full flex items-end justify-between px-10 pt-6 pb-2">
          {candles.map(c => {
            const openPct = getTopPercent(c.open)
            const closePct = getTopPercent(c.close)
            const highPct = getTopPercent(c.high)
            const lowPct = getTopPercent(c.low)

            const bodyTop = Math.min(openPct, closePct)
            const bodyHeight = Math.max(2, Math.abs(closePct - openPct))

            return (
              <div key={c.index} className="relative w-2 h-full flex items-center justify-center">
                {/* Wick */}
                <div
                  className={`absolute w-[1.5px] ${c.isUp ? 'bg-emerald-500/70' : 'bg-rose-500/70'}`}
                  style={{
                    top: `${highPct}%`,
                    bottom: `${100 - lowPct}%`
                  }}
                ></div>

                {/* Candle Body */}
                <div
                  className={`absolute w-2.5 rounded-sm ${
                    c.isUp ? 'bg-emerald-400 border border-emerald-300' : 'bg-rose-500 border border-rose-400'
                  }`}
                  style={{
                    top: `${bodyTop}%`,
                    height: `${bodyHeight}%`
                  }}
                ></div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Legend Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400"></span>
            <span>Bullish FVG (BUY Zone)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-400"></span>
            <span>Bearish FVG (SELL Zone)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-400 animate-pulse"></span>
            <span>S-TIER High Priority Zone</span>
          </div>
        </div>

        <div className="text-gray-500">
          Showing {fvgs.length} active FVG zones on {activeTF}
        </div>
      </div>
    </div>
  )
}
