'use client'
import { useState, useMemo } from 'react'

export default function SupremeSMCChart({ analysis, currentPrice }) {
  const [activeTF, setActiveTF] = useState('4H')
  const [toggles, setToggles] = useState({
    fvg: true,
    ob: true,
    breakers: true,
    ifvg: true,
    liquidity: true,
    ote: true,
    amd: true,
    structure: true,
    sweeps: true,
    openingGaps: true
  })

  const p = currentPrice || analysis?.currentPrice || 68260

  const toggleLayer = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Mock candlesticks around current price for visual chart
  const candles = useMemo(() => {
    const list = []
    let price = p * 0.95
    for (let i = 0; i < 30; i++) {
      const isUp = i % 2 === 0
      const open = price
      const close = isUp ? price * 1.007 : price * 0.994
      const high = Math.max(open, close) * 1.003
      const low = Math.min(open, close) * 0.997
      list.push({ index: i, open, high, low, close, isUp })
      price = close
    }
    list[29].close = p
    return list
  }, [p])

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="font-bold text-white tracking-wide flex items-center gap-2">
            <span>📈</span> SUPREME SMC CHART & CONCEPT OVERLAYS
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Multi-layer SMC visual chart with concept layer toggles</p>
        </div>

        {/* Timeframe selector */}
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

      {/* Layer Toggles */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold bg-gray-900/60 p-3 rounded-xl border border-gray-800">
        <span className="text-gray-400 mr-1 text-[11px] uppercase">Layers:</span>
        {Object.keys(toggles).map(key => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] uppercase transition-all border ${
              toggles[key]
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/40 shadow-sm'
                : 'bg-gray-800/40 text-gray-500 border-gray-800'
            }`}
          >
            {toggles[key] ? `✓ ${key}` : key}
          </button>
        ))}
      </div>

      {/* Chart Canvas Box */}
      <div className="relative h-[380px] w-full bg-gray-950 rounded-xl border border-gray-800/80 p-4 flex flex-col justify-between overflow-hidden">

        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-4 opacity-20">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="border-b border-gray-700 w-full"></div>
          ))}
        </div>

        {/* Current Price Line */}
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-blue-400 z-20 pointer-events-none flex items-center justify-end pr-4">
          <span className="bg-blue-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-md border border-blue-400">
            CURRENT: ${p.toLocaleString()}
          </span>
        </div>

        {/* Concept Overlays */}
        {toggles.fvg && (
          <div className="absolute left-10 right-20 top-[60%] h-12 bg-emerald-500/20 border border-emerald-500/60 rounded p-2 z-10 flex items-center justify-between animate-pulse">
            <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
              4H BULLISH FVG
            </span>
            <span className="text-[11px] font-mono text-white">$67,200 — $67,600</span>
          </div>
        )}

        {toggles.ob && (
          <div className="absolute left-10 right-20 top-[75%] h-10 bg-blue-500/20 border border-blue-500/60 rounded p-2 z-10 flex items-center justify-between">
            <span className="text-[10px] font-bold bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">
              BULLISH ORDER BLOCK
            </span>
            <span className="text-[11px] font-mono text-white">$66,900 — $67,100</span>
          </div>
        )}

        {toggles.liquidity && (
          <div className="absolute left-0 right-0 top-[20%] border-t border-dashed border-amber-400/80 z-10 flex items-center justify-between px-4">
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
              BSL TARGET (EQUAL HIGHS)
            </span>
            <span className="text-[11px] font-mono text-amber-300">$70,100</span>
          </div>
        )}

        {/* Candlesticks Layout */}
        <div className="relative w-full h-full flex items-end justify-between px-10 pt-6 pb-2">
          {candles.map(c => (
            <div key={c.index} className="relative w-2 h-full flex items-center justify-center">
              <div className={`absolute w-[1.5px] top-1/4 bottom-1/4 ${c.isUp ? 'bg-emerald-500/70' : 'bg-rose-500/70'}`}></div>
              <div className={`absolute w-2.5 h-12 rounded-sm ${c.isUp ? 'bg-emerald-400 border border-emerald-300' : 'bg-rose-500 border border-rose-400'}`}></div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
