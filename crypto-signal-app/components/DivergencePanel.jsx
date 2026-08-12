'use client'
// DivergencePanel — shown only when RSI or MACD divergence is detected

const TYPE_META = {
  regular_bullish:  { label: 'Regular Bullish',  color: '#22c55e', bg: '#14532d20', border: '#16a34a40', emoji: '📈', direction: 'BUY' },
  hidden_bullish:   { label: 'Hidden Bullish',   color: '#86efac', bg: '#14532d15', border: '#16a34a30', emoji: '🔍', direction: 'BUY' },
  regular_bearish:  { label: 'Regular Bearish',  color: '#ef4444', bg: '#450a0a20', border: '#b91c1c40', emoji: '📉', direction: 'SELL' },
  hidden_bearish:   { label: 'Hidden Bearish',   color: '#fca5a5', bg: '#450a0a15', border: '#b91c1c30', emoji: '🔍', direction: 'SELL' },
}

const STRENGTH_META = {
  'very strong': { label: 'Very Strong ⚡⚡', color: '#f59e0b' },
  strong:        { label: 'Strong ⚡',       color: '#eab308' },
  medium:        { label: 'Medium',          color: '#94a3b8' },
  weak:          { label: 'Weak',            color: '#64748b' },
}

export default function DivergencePanel({ divergences }) {
  if (!divergences) return null

  const daily  = divergences.daily
  const hourly = divergences.hourly

  // Only render when at least one divergence is present
  const hasDaily  = daily?.finalSignal  !== null && daily?.finalSignal  !== undefined
  const hasHourly = hourly?.finalSignal !== null && hourly?.finalSignal !== undefined

  if (!hasDaily && !hasHourly) return null

  const primary    = hasDaily ? daily : hourly
  const meta       = TYPE_META[primary.rsiDivergence?.type] || TYPE_META[primary.macdDivergence?.type]
  const strengthM  = STRENGTH_META[primary.finalStrength] || STRENGTH_META.medium
  const isConfirmed = primary.confirmed
  const rsiType     = primary.rsiDivergence?.type
  const macdType    = primary.macdDivergence?.type
  const description = primary.rsiDivergence?.description || primary.macdDivergence?.description || primary.summary

  if (!meta) return null

  return (
    <div
      className="rounded-2xl border p-4 backdrop-blur-sm"
      style={{
        background: meta.bg,
        borderColor: meta.border,
        boxShadow: `0 0 20px ${meta.color}18`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: meta.color }}>
            📊 Divergence Detected
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
        >
          {meta.direction}
        </span>
      </div>

      {/* Grid: Type / Strength / RSI / MACD */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Type</div>
          <div className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Strength</div>
          <div className="text-xs font-bold" style={{ color: strengthM.color }}>{strengthM.label}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">RSI</div>
          <div className="text-xs font-bold" style={{ color: rsiType ? meta.color : '#6b7280' }}>
            {rsiType ? '✅ Confirmed' : '❌ Not detected'}
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">MACD</div>
          <div className="text-xs font-bold" style={{ color: macdType ? meta.color : '#6b7280' }}>
            {macdType ? '✅ Confirmed' : '❌ Not detected'}
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="text-xs text-gray-300 leading-relaxed mb-3 px-1">
          {description}
        </div>
      )}

      {/* Confidence Boost Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConfirmed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-700/30">
              ✦ CONFIRMED — RSI + MACD agree
            </span>
          )}
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-black"
          style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          +{primary.finalBoost} confidence
        </span>
      </div>

      {/* Hourly alert if different from daily */}
      {hasHourly && hasDaily && hourly.finalSignal === daily.finalSignal && (
        <div className="mt-2 text-[10px] text-gray-400 text-center px-2">
          Hourly timeframe also showing {hourly.rsiDivergence?.type?.replace(/_/g, ' ') || hourly.macdDivergence?.type?.replace(/_/g, ' ')} — multi-timeframe confirmation
        </div>
      )}
    </div>
  )
}
