'use client'

export default function PatternPanel({ pattern, visionAnalysis, patternComparison }) {
  const primary = pattern?.primaryPattern || (pattern?.pattern ? { name: pattern.pattern, direction: pattern.direction, confidence: pattern.confidence } : null)
  const confirmation = pattern?.confirmation
  const falseBreakout = pattern?.falseBreakout
  const throwback = pattern?.throwback
  const targets = pattern?.targets
  const pipeBottom = pattern?.pipeBottom
  const narrowRange = pattern?.narrowRange
  const gaps = pattern?.gaps
  const harami = pattern?.harami
  const islandReversal = pattern?.islandReversal

  const mathPattern = pattern?.pattern || primary?.name
  const mathConfidence = pattern?.confidence || primary?.confidence || 0
  const mathDirection = pattern?.direction || primary?.direction

  const visionPattern = visionAnalysis?.daily?.primaryPattern?.name
  const visionQuality = visionAnalysis?.daily?.primaryPattern?.quality
  const visionDirection = visionAnalysis?.daily?.primaryPattern?.direction
  const visionTarget = visionAnalysis?.daily?.patternLevels?.target
  const visionInvalidation = visionAnalysis?.daily?.patternLevels?.invalidation

  const agreementLevel = patternComparison?.agreementLevel || 'none'

  const getStatusBlock = () => {
    switch (agreementLevel) {
      case 'full':
        return (
          <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-extrabold text-xs text-center flex items-center justify-center gap-1.5 animate-pulse">
            ✅ BOTH AGREE — HIGH CONFIDENCE PATTERN
          </div>
        )
      case 'partial':
        return (
          <div className="p-2.5 rounded-xl bg-yellow-600/10 border border-yellow-600/30 text-yellow-300 font-bold text-xs text-center flex items-center justify-center gap-1.5">
            ✅ PARTIAL AGREEMENT — MODERATE CONFIDENCE
          </div>
        )
      case 'vision_only':
        return (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs text-center flex items-center justify-center gap-1.5">
            👁️ VISION ONLY — TRUSTED VISUAL SETUP
          </div>
        )
      case 'conflict':
        return (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs text-center flex items-center justify-center gap-1.5">
            ⚠️ PATTERN DISAGREEMENT / CONFLICT DETECTED
          </div>
        )
      default:
        if (mathPattern && !visionPattern) {
          return (
            <div className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 font-bold text-xs text-center flex items-center justify-center gap-1.5">
              ⚠️ MATH PATTERN UNCONFIRMED BY VISION
            </div>
          )
        }
        return null
    }
  }

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-5 backdrop-blur-sm shadow-xl space-y-4 text-xs">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="text-xs font-black text-gray-200 uppercase tracking-wider flex items-center gap-2">
          📊 PATTERN ANALYSIS <span className="text-[10px] text-yellow-400/90 font-mono font-normal lowercase">(Fidelity Method)</span>
        </span>
        {primary && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${confirmation?.confirmed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
            {confirmation?.confirmed ? 'Confirmed' : 'Pending'}
          </span>
        )}
      </div>

      {/* Primary Pattern Summary */}
      <div className="bg-gray-950/60 rounded-xl p-3 border border-gray-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400 font-bold uppercase text-[10px]">Primary Pattern</span>
          <span className="text-gray-400 font-mono text-[10px]">Quality: {mathConfidence ? `${(mathConfidence / 10).toFixed(1)}/10` : 'N/A'}</span>
        </div>
        <div className="text-sm font-black text-white flex items-center gap-2">
          <span>{mathDirection === 'bullish' ? '📈' : mathDirection === 'bearish' ? '📉' : '🔄'}</span>
          <span>{mathPattern || 'No primary pattern detected'}</span>
        </div>
      </div>

      {/* Confirmation Filters */}
      <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-xl border border-gray-800/60">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">
          <span>Confirmation Filters</span>
          {confirmation?.confidenceBoost > 0 && (
            <span className="text-green-400 font-mono">+{confirmation.confidenceBoost} pts</span>
          )}
        </div>
        <div className="space-y-1 text-gray-300 font-mono">
          <div className="flex items-center gap-1.5">
            <span>{confirmation?.filtersPassed?.includes('percentage') ? '✅' : '❌'}</span>
            <span>Price close 0.5%+ beyond level ({confirmation?.marginPercent || 0}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{confirmation?.filtersPassed?.includes('volume') ? '✅' : '❌'}</span>
            <span>Volume {confirmation?.volumeRatio || 1.0}x avg (&gt;=1.5x)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{confirmation?.filtersPassed?.includes('time') ? '✅' : '❌'}</span>
            <span>Held 3+ candles beyond level</span>
          </div>
        </div>
      </div>

      {/* False Breakout Check */}
      <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-xl border border-gray-800/60">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">False Breakout Check</div>
        {falseBreakout?.isFalseBreakout ? (
          <div className="text-red-400 font-bold space-y-1">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>False breakout detected (returned through level)</span>
            </div>
            {falseBreakout.isTrap && (
              <div className="text-yellow-400 font-mono text-[10px]">
                🚨 TRAP CONFIRMED — Activate REVERSE signal: <span className="font-extrabold underline">{falseBreakout.reverseSignal}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 text-gray-300 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span>✅</span>
              <span>No return through breakout level</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
              <span>✅</span>
              <span>Price advancing after breakout</span>
            </div>
          </div>
        )}
      </div>

      {/* Throwback Opportunity */}
      <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-xl border border-gray-800/60">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Throwback Opportunity</div>
        {throwback?.throwbackDetected ? (
          <div className="space-y-1 font-mono text-gray-200">
            <div className="flex items-center gap-1.5 text-green-400 font-bold">
              <span>✅</span>
              <span>Throwback to ${throwback.throwbackLevel?.toLocaleString()} completed</span>
            </div>
            {throwback.entryPrice && (
              <div className="text-gray-300">
                Better entry: <span className="text-yellow-400 font-bold">${throwback.entryPrice?.toLocaleString()}</span>
                {throwback.improvement > 0 && <span className="text-green-400 ml-1.5">({throwback.improvement}% better)</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 font-mono italic text-[10px]">No throwback detected yet</div>
        )}
      </div>

      {/* Additional Signals */}
      <div className="space-y-1.5 bg-gray-950/40 p-3 rounded-xl border border-gray-800/60">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Additional Signals</div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            NR4: {narrowRange?.detected ? <span className="text-green-400 font-bold">✅ Breakout Imminent</span> : <span className="text-gray-500">❌ None</span>}
          </div>
          <div>
            Gaps: {gaps?.activeSignal ? <span className="text-blue-400 font-bold">✅ Active Gap</span> : <span className="text-gray-500">❌ None</span>}
          </div>
          <div>
            Pipe: {pipeBottom?.detected ? <span className="text-green-400 font-bold">✅ Pipe Bottom</span> : <span className="text-gray-500">❌ None</span>}
          </div>
          <div>
            Island: {islandReversal?.detected ? <span className="text-red-400 font-bold">⚠️ {islandReversal.type}</span> : <span className="text-gray-500">❌ None</span>}
          </div>
        </div>
      </div>

      {/* Precise Targets (Measured Move) */}
      {targets && (
        <div className="space-y-1.5 bg-gray-950/80 p-3 rounded-xl border border-yellow-500/30">
          <div className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Precise Targets (Fidelity Measured Move)</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
            <div>Conservative: <span className="text-green-300">${targets.conservativeTarget?.toLocaleString()}</span></div>
            <div className="font-bold text-green-400">Primary: ${targets.primaryTarget?.toLocaleString()} 🎯</div>
            <div>Aggressive: <span className="text-green-500">${targets.aggressiveTarget?.toLocaleString()}</span></div>
            <div className="text-red-400">Invalidation: ${targets.invalidationLevel?.toLocaleString()} ❌</div>
          </div>
        </div>
      )}

      {getStatusBlock()}
    </div>
  )
}
