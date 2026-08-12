'use client'
import { REGIME_LABELS, REGIME_COLORS, REGIME_ICONS } from '../lib/utils/constants'

export default function RegimeIndicator({ regime, accuracy, description, tradeable, startTime }) {
  const label = REGIME_LABELS[regime] || regime || 'Unknown'
  const color = REGIME_COLORS[regime] || '#6b7280'
  const icon = REGIME_ICONS[regime] || '🔍'

  const durationText = startTime ? (() => {
    const diffMs = Date.now() - new Date(startTime).getTime()
    const diffHours = Math.max(0, Math.floor(diffMs / 3600000))
    if (diffHours === 0) {
      const diffMins = Math.max(0, Math.floor(diffMs / 60000))
      return `Active for ${diffMins}m`
    }
    return `Active for ${diffHours}h`
  })() : null

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-5 backdrop-blur-sm">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Market Regime</div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <span className="font-bold text-white text-lg">{label}</span>
            {durationText && (
              <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-gray-400 font-semibold border border-gray-700/50">
                {durationText}
              </span>
            )}
          </div>
          {accuracy && (
            <div className="text-sm mt-0.5" style={{ color }}>
              ~{accuracy}% accuracy in this regime
            </div>
          )}
        </div>
      </div>

      {!tradeable && (
        <div className="flex items-center gap-2 bg-gray-800/60 rounded-xl p-3 border border-gray-700/30">
          <span className="text-yellow-400">⚠</span>
          <span className="text-xs text-gray-300">Signals blocked in this regime</span>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{description}</p>
      )}
    </div>
  )
}

