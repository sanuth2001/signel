'use client'

export default function AMDStatusPanel({ amd }) {
  const data = amd || {
    phase: 'distribution',
    accumulation: { detected: true, range: { high: 67800, low: 67100 } },
    judasSwing: { detected: true, type: 'below', sweptLevel: 67050 },
    distribution: { direction: 'bullish', started: true }
  }

  const phaseNames = {
    accumulation: 'Phase 1: Accumulation (Asian Range)',
    manipulation: 'Phase 2: Manipulation (Judas Trap)',
    distribution: 'Phase 3: Distribution (True Institutional Move 🔥)'
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <div>
            <h3 className="font-bold text-white tracking-wide">POWER OF 3 (ICT AMD MODEL)</h3>
            <p className="text-xs text-gray-400">Accumulation → Manipulation → Distribution Cycle</p>
          </div>
        </div>

        <span className="px-3 py-1 text-xs font-black bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 uppercase">
          {phaseNames[data.phase] || 'DISTRIBUTION PHASE'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">

        {/* ACCUMULATION */}
        <div className={`p-4 rounded-xl border transition-all ${
          data.phase === 'accumulation' ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950' : 'bg-gray-900/50 border-gray-800 opacity-80'
        }`}>
          <div className="font-bold text-blue-400 mb-1">1. ACCUMULATION</div>
          <div className="text-gray-300 text-[11px]">
            Asian session consolidation building liquidity above & below range.
          </div>
          <div className="mt-2 text-white font-bold text-[11px]">
            {data.accumulation?.detected ? 'Range Identified ✅' : 'Consolidating'}
          </div>
        </div>

        {/* MANIPULATION */}
        <div className={`p-4 rounded-xl border transition-all ${
          data.phase === 'manipulation' ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950' : 'bg-gray-900/50 border-gray-800 opacity-80'
        }`}>
          <div className="font-bold text-amber-400 mb-1">2. MANIPULATION (JUDAS TRAP)</div>
          <div className="text-gray-300 text-[11px]">
            Fake breakout sweeping retail stops before reversing.
          </div>
          <div className="mt-2 text-amber-300 font-bold text-[11px]">
            {data.judasSwing?.detected ? `Swept ${data.judasSwing.type?.toUpperCase()} ✅` : 'Pending Sweep'}
          </div>
        </div>

        {/* DISTRIBUTION */}
        <div className={`p-4 rounded-xl border transition-all ${
          data.phase === 'distribution' ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950 ring-1 ring-emerald-400/50 animate-pulse' : 'bg-gray-900/50 border-gray-800 opacity-80'
        }`}>
          <div className="font-bold text-emerald-400 mb-1">3. DISTRIBUTION (REAL MOVE 🔥)</div>
          <div className="text-gray-300 text-[11px]">
            True institutional directional execution post-manipulation.
          </div>
          <div className="mt-2 text-emerald-300 font-bold text-[11px]">
            {data.distribution?.started ? 'Distribution Active 🟢' : 'Awaiting Trigger'}
          </div>
        </div>

      </div>
    </div>
  )
}
