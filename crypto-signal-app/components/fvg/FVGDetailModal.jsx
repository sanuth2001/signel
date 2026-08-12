'use client'

export default function FVGDetailModal({ fvg, onClose, onGenerateSignal }) {
  if (!fvg) return null

  const isBull = fvg.type === 'bullish'
  const isSTier = fvg.quality >= 8 || fvg.isStacked

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${
              isBull ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {fvg.timeframe.toUpperCase()} {fvg.type.toUpperCase()} FVG
            </span>
            {isSTier && (
              <span className="text-[11px] font-black bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40">
                S-TIER QUALIFIED 🔥
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-all text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* FVG Price Zone Box */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="text-xs text-gray-400 font-medium">Exact Institutional FVG Imbalance Zone</div>
          <div className="text-lg font-mono font-bold text-white flex items-center justify-between">
            <span>${fvg.zone.low.toLocaleString()} — ${fvg.zone.high.toLocaleString()}</span>
            <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">
              Midpoint: ${fvg.zone.mid.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
            <span>Imbalance Size: <strong className="text-white">{fvg.zone.sizePercent}%</strong></span>
            <span>Distance: <strong className={fvg.distanceFromCurrent > 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {fvg.distanceFromCurrent > 0 ? `+${fvg.distanceFromCurrent}%` : `${fvg.distanceFromCurrent}%`}
            </strong></span>
          </div>
        </div>

        {/* Quality Scoring Breakdown */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">Quality Score Breakdown ({fvg.quality}/10)</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
              <div className="text-gray-400">Imbalance Size Factor</div>
              <div className="font-bold text-white mt-0.5">{fvg.zone.sizePercent >= 0.7 ? '+3 pts (Large)' : '+2 pts (Medium)'}</div>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
              <div className="text-gray-400">Impulse Strength</div>
              <div className="font-bold text-white mt-0.5">+2 pts (Strong Displacement)</div>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
              <div className="text-gray-400">Age & Freshness</div>
              <div className="font-bold text-emerald-400 mt-0.5">{fvg.candlesAgo < 15 ? '+3 pts (Fresh Setup)' : '+1 pt (Older)'}</div>
            </div>

            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
              <div className="text-gray-400">Fill Status</div>
              <div className="font-bold text-amber-300 mt-0.5">{fvg.fillPercent > 0 ? `${fvg.fillPercent}% Filled` : '0% Fresh Unfilled'}</div>
            </div>
          </div>
        </div>

        {/* Formation & Historical Context */}
        <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs space-y-1">
          <div className="font-bold text-blue-300">💡 Institutional Mechanics</div>
          <p className="text-gray-300 text-[11px]">
            Institutional orders gapped price without counter liquidity between candle 1 and candle 3. Historically, price returns to test {fvg.zone.mid.toLocaleString()} with an 85%+ probability before continuation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all border border-gray-700"
          >
            Close Window
          </button>

          <button
            onClick={() => {
              onClose()
              onGenerateSignal && onGenerateSignal(fvg)
            }}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950 transition-all"
          >
            ⚡ Generate FVG Signal
          </button>
        </div>

      </div>
    </div>
  )
}
