'use client'
import { REGIME_LABELS, REGIME_COLORS } from '../lib/utils/constants'

export default function RegimeIndicator({ regime, accuracy, description, tradeable }) {
  const label = REGIME_LABELS[regime] || regime || 'Unknown'
  const color = REGIME_COLORS[regime] || '#6b7280'

  const icons = {
    trending_up: '📈',
    trending_down: '📉',
    ranging: '↔️',
    high_volatility: '⚡',
    low_liquidity: '🔒',
  }

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-5 backdrop-blur-sm">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Market Regime</div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icons[regime] || '🔍'}</span>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <span className="font-bold text-white text-lg">{label}</span>
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
