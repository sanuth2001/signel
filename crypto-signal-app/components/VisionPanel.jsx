'use client'

export default function VisionPanel({ visionAnalysis, patternComparison }) {
  if (!visionAnalysis) return null

  const { daily, h4, hourly, agreement, totalConfidenceBoost, multiTFSummary } = visionAnalysis
  const agreementLevel = patternComparison?.agreementLevel || 'none'

  const getAgreementBadge = () => {
    switch (agreementLevel) {
      case 'full':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black animate-pulse">
            🔥 DOUBLE CONFIRMED
          </span>
        )
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-600/10 border border-yellow-600/30 text-yellow-300 text-xs font-bold">
            🔥 PARTIAL CONFIRMED
          </span>
        )
      case 'vision_only':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
            👁️ VISION ONLY
          </span>
        )
      case 'conflict':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            ⚠️ PATTERN CONFLICT
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-semibold">
            ❔ UNCONFIRMED
          </span>
        )
    }
  }

  const getBorderColor = () => {
    if (agreement?.allBullish) return 'border-green-500/40 shadow-green-950/20'
    if (agreement?.allBearish) return 'border-red-500/40 shadow-red-950/20'
    return 'border-gray-700/50 shadow-black/40'
  }

  const getTraderActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'buy': return 'bg-green-500/10 border-green-500/20 text-green-400'
      case 'sell': return 'bg-red-500/10 border-red-500/20 text-red-400'
      default: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
    }
  }

  return (
    <div className={`rounded-2xl border bg-gray-900/80 p-5 backdrop-blur-sm shadow-xl transition-all duration-300 ${getBorderColor()}`}>
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">👁️</span>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Claude Vision Analysis</h3>
            <p className="text-[10px] text-gray-500">Multi-timeframe chart screenshot reading</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getAgreementBadge()}
          {totalConfidenceBoost !== 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${totalConfidenceBoost > 0 ? 'bg-green-950/60 text-green-400' : 'bg-red-950/60 text-red-400'}`}>
              {totalConfidenceBoost > 0 ? `+${totalConfidenceBoost}` : totalConfidenceBoost} Boost
            </span>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Daily Timeframe Panel */}
        <div className="md:col-span-2 bg-gray-950/30 rounded-xl p-3 border border-gray-800/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-900">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Daily Chart (1D)</span>
              {daily?.primaryPattern?.name ? (
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                  {daily.primaryPattern.name} <span className="text-[10px] text-gray-500 font-normal">({daily.primaryPattern.status})</span>
                </span>
              ) : (
                <span className="text-[10px] text-gray-600">No pattern detected</span>
              )}
            </div>

            {daily?.primaryPattern?.description && (
              <p className="text-xs text-gray-300 italic mb-3 leading-relaxed">
                "{daily.primaryPattern.description}"
              </p>
            )}

            {/* Support and resistance trendlines */}
            {daily?.trendlines && (
              <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                <div>
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider block mb-1">Visual Support</span>
                  <div className="space-y-1">
                    {daily.trendlines.supportLines && daily.trendlines.supportLines.length > 0 ? (
                      daily.trendlines.supportLines.map((line, i) => (
                        <div key={i} className="flex justify-between items-center bg-purple-950/20 border border-purple-900/30 px-2 py-1 rounded font-mono">
                          <span className="text-purple-200 font-bold">${parseFloat(line.price).toLocaleString()}</span>
                          <span className="text-[9px] text-purple-400">{line.touches}T ({line.strength})</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-600 text-[10px]">None detected</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-orange-400 font-bold uppercase tracking-wider block mb-1">Visual Resistance</span>
                  <div className="space-y-1">
                    {daily.trendlines.resistanceLines && daily.trendlines.resistanceLines.length > 0 ? (
                      daily.trendlines.resistanceLines.map((line, i) => (
                        <div key={i} className="flex justify-between items-center bg-orange-950/20 border border-orange-900/30 px-2 py-1 rounded font-mono">
                          <span className="text-orange-200 font-bold">${parseFloat(line.price).toLocaleString()}</span>
                          <span className="text-[9px] text-orange-400">{line.touches}T ({line.strength})</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-600 text-[10px]">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-gray-900/60 flex justify-between text-[10px] text-gray-500">
            <span>Bias: <span className={`font-bold capitalize ${daily?.visualBias?.direction === 'bullish' ? 'text-green-400' : daily?.visualBias?.direction === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>{daily?.visualBias?.direction || 'Neutral'}</span></span>
            <span>Confidence: <span className="font-mono font-bold text-gray-300">{daily?.visualBias?.confidence || 0}%</span></span>
            <span>Clarity: <span className="font-bold text-gray-400 capitalize">{daily?.chartClarity || 'moderate'}</span></span>
          </div>
        </div>

        {/* Multi Timeframe & Action Sidebar */}
        <div className="space-y-3">
          {/* Agreement Panel */}
          <div className="bg-gray-950/30 rounded-xl p-3 border border-gray-800/40 text-xs">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-2 border-b border-gray-900 pb-1">Timeframe Alignment</span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span>1D Bias:</span>
                <span className={`font-bold ${daily?.visualBias?.direction === 'bullish' ? 'text-green-400' : daily?.visualBias?.direction === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>{daily?.visualBias?.direction?.toUpperCase() || 'NEUTRAL'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>4H Bias:</span>
                <span className={`font-bold ${h4?.visualBias?.direction === 'bullish' ? 'text-green-400' : h4?.visualBias?.direction === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>{h4?.visualBias?.direction?.toUpperCase() || 'NEUTRAL'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>1H Bias:</span>
                <span className={`font-bold ${hourly?.visualBias?.direction === 'bullish' ? 'text-green-400' : hourly?.visualBias?.direction === 'bearish' ? 'text-red-400' : 'text-yellow-400'}`}>{hourly?.visualBias?.direction?.toUpperCase() || 'NEUTRAL'}</span>
              </div>
              <div className="border-t border-gray-900 mt-2 pt-2 flex justify-between items-center font-bold text-[10px]">
                <span>Agreement:</span>
                <span className={`px-2 py-0.5 rounded text-[9px] capitalize ${agreement?.dominantBias === 'bullish' ? 'bg-green-950/50 text-green-400' : agreement?.dominantBias === 'bearish' ? 'bg-red-950/50 text-red-400' : 'bg-yellow-950/50 text-yellow-400'}`}>
                  {agreement?.dominantBias?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Trader Action Panel */}
          {daily?.traderAction && (
            <div className={`rounded-xl p-3 border ${getTraderActionColor(daily.traderAction.action)} text-xs`}>
              <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 text-gray-400">Trader Action</span>
              <div className="font-extrabold text-sm mb-1 uppercase tracking-wide">
                {daily.traderAction.action === 'wait' ? '🟡 WAIT' : daily.traderAction.action === 'buy' ? '🟢 BUY' : '🔴 SELL'}
              </div>
              <p className="text-[11px] leading-relaxed mb-2 opacity-90 font-medium">
                {daily.traderAction.reasoning}
              </p>
              {daily.traderAction.waitingFor && (
                <div className="mt-1 pt-1.5 border-t border-current/10 text-[10px]">
                  <span className="font-bold uppercase text-[8px] tracking-wider block text-gray-400 mb-0.5">Watching For:</span>
                  <span className="opacity-95">{daily.traderAction.waitingFor}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {multiTFSummary && (
        <div className="bg-gray-950/40 rounded-xl p-3 border border-gray-800 text-xs">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Visual Synthesis Summary</span>
          <p className="text-gray-300 leading-relaxed font-medium">
            {multiTFSummary}
          </p>
        </div>
      )}
    </div>
  )
}
