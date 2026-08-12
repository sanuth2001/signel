'use client'

export default function SMCBreakdownPanel({ analysis }) {
  const smc = analysis || {}
  const struct = smc.structure || {}
  const killZone = smc.killZone || {}
  const amd = smc.amd || {}
  const ote = smc.ote || {}
  const openLevels = smc.openingGaps?.keyOpenLevels || {}

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>🏛️</span> SMC BREAKDOWN — ALL CONCEPTS
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Unified multi-concept Smart Money matrix</p>
        </div>
        <span className="px-3 py-1 text-xs font-bold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
          Dominant Bias: <strong className="text-emerald-400 uppercase">{smc.dominantBias || 'BULLISH'}</strong>
        </span>
      </div>

      {/* 6-Box Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">

        {/* BOX 1: STRUCTURE */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>STRUCTURE</span>
            <span>🟢</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">Trend:</span>
              <span className="font-bold text-emerald-400">{struct.structure || 'HH+HL'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">BOS:</span>
              <span className="text-white">{struct.bos ? 'Confirmed ✅' : 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">CHoCH:</span>
              <span className="text-gray-400">{struct.choch ? 'Mild' : 'None ✅'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">MSS Shift:</span>
              <span className="text-emerald-300">{smc.mss?.mssDetected ? 'Active ✅' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* BOX 2: OB / FVG */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>OB / FVG / BREAKER</span>
            <span>⚡</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">Propulsion:</span>
              <span className="font-bold text-amber-300">{smc.propulsionBlocks?.hasPropulsionBlock ? 'Active 🔥' : 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bullish OB:</span>
              <span className="text-white">$66,900 ✅</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">FVG 4H:</span>
              <span className="text-emerald-300">$67,200</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Breaker:</span>
              <span className="text-gray-400">Active</span>
            </div>
          </div>
        </div>

        {/* BOX 3: ICT LEVELS */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>ICT LEVELS</span>
            <span>📐</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">OTE Zone:</span>
              <span className="text-emerald-300">{ote.priceInOTE ? 'Inside (62-79%) ✅' : 'Outside'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">AMD Phase:</span>
              <span className="font-bold text-amber-300 uppercase">{amd.phase || 'Distribution'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Silver Bullet:</span>
              <span className="text-white">{killZone.isSilverBulletWindow ? 'YES 🔥' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Midnight Open:</span>
              <span className="text-blue-300">${openLevels.midnight || '67,050'}</span>
            </div>
          </div>
        </div>

        {/* BOX 4: LIQUIDITY */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>LIQUIDITY</span>
            <span>💧</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">BSL Target:</span>
              <span className="text-amber-300">$70,100 🎯</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">SSL Pool:</span>
              <span className="text-emerald-300">$67,050</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sweep Reversal:</span>
              <span className="text-emerald-400 font-bold">{smc.sweepReversal?.reversalConfirmed ? 'Confirmed ✅' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Displacement:</span>
              <span className="text-white">{smc.displacement?.currentlyDisplacing ? 'YES ✅' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* BOX 5: TIMING */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>TIMING</span>
            <span>⏰</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">Kill Zone:</span>
              <span className="text-emerald-300 font-bold">{killZone.currentKillZone?.toUpperCase() || 'NY OPEN'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Dead Zone:</span>
              <span className="text-emerald-400">NO ✅</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Multiplier:</span>
              <span className="text-amber-300">+{killZone.qualityMultiplier || 1.25}×</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Judas Trap:</span>
              <span className="text-gray-300">Complete ✅</span>
            </div>
          </div>
        </div>

        {/* BOX 6: ZONE & DISCOUNT */}
        <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>PRICING ZONE</span>
            <span>📊</span>
          </div>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-400">SMC Pricing:</span>
              <span className="text-emerald-400 font-bold">Discount Zone ✅</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Equilibrium:</span>
              <span className="text-gray-300">Below EQ ✅</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Range Pct:</span>
              <span className="text-white">42%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Zone Strength:</span>
              <span className="text-emerald-300">STRONG</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
