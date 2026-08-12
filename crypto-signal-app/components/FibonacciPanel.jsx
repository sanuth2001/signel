'use client'
// FibonacciPanel — shows only when fibonacci data is available

const LEVEL_COLORS = {
  '61.8%': { color: '#eab308', bg: '#78350f20', label: '★★ golden ratio', star: true },
  '50.0%': { color: '#f97316', bg: '#7c2d1220', label: '★ watch level',   star: true },
  '38.2%': { color: '#facc15', bg: '#71350020', label: '★ watch level',   star: true },
  '78.6%': { color: '#ef4444', bg: '#450a0a15', label: '',                star: false },
  '23.6%': { color: '#3b82f6', bg: '#1e3a5f15', label: '',                star: false },
  '0%':    { color: '#6b7280', bg: '#11111120', label: '',                star: false },
  '100%':  { color: '#6b7280', bg: '#11111120', label: '',                star: false },
}

const LEVEL_KEYS = [
  { key: 'level_236', label: '23.6%' },
  { key: 'level_382', label: '38.2%' },
  { key: 'level_500', label: '50.0%' },
  { key: 'level_618', label: '61.8%' },
  { key: 'level_786', label: '78.6%' },
]

function formatPriceShort(p) {
  if (!p) return 'N/A'
  if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function FibonacciPanel({ fibonacci, currentPrice }) {
  if (!fibonacci) return null

  const { swingPoints, retracements, extensions, currentPosition, summary, keyLevelsNearby } = fibonacci
  const trend   = swingPoints?.trend
  const isUp    = trend === 'uptrend'
  const levels  = retracements?.levels || {}

  const trendColor  = isUp ? '#22c55e' : '#ef4444'
  const trendLabel  = isUp ? 'Uptrend ↑' : 'Downtrend ↓'

  const nearestLabel = currentPosition?.nearestLevel?.level
  const atKey        = currentPosition?.atKeyLevel

  return (
    <div
      className="rounded-2xl border p-4 backdrop-blur-sm"
      style={{ background: '#0f1629', borderColor: '#1e2d4a', boxShadow: '0 0 24px rgba(234,179,8,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📐</span>
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">Fibonacci Levels</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${trendColor}18`, color: trendColor, border: `1px solid ${trendColor}30` }}
        >
          {trendLabel}
        </span>
      </div>

      {/* Swing Points */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Swing High</div>
          <div className="text-xs font-bold text-white">{formatPriceShort(swingPoints?.swingHigh?.price)}</div>
          <div className="text-[10px] text-gray-600">{swingPoints?.swingHigh?.candlesAgo} candles ago</div>
        </div>
        <div className="bg-black/20 rounded-xl p-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Swing Low</div>
          <div className="text-xs font-bold text-white">{formatPriceShort(swingPoints?.swingLow?.price)}</div>
          <div className="text-[10px] text-gray-600">{swingPoints?.swingLow?.candlesAgo} candles ago</div>
        </div>
      </div>

      {/* Retracement Levels */}
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Retracement Levels</div>
      <div className="space-y-1 mb-4">
        {LEVEL_KEYS.map(({ key, label }) => {
          const price    = levels[key]
          const meta     = LEVEL_COLORS[label] || {}
          const isCurrent = nearestLabel === label && atKey
          const isNear    = nearestLabel === label && !atKey

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all"
              style={{
                background: isCurrent ? `${meta.color}18` : 'transparent',
                border: isCurrent ? `1px solid ${meta.color}30` : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold w-12" style={{ color: meta.color }}>{label}</span>
                {meta.star && <span className="text-[10px] text-gray-600">{meta.label}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-300">{formatPriceShort(price)}</span>
                {isCurrent && (
                  <span className="text-[10px] text-white bg-white/10 rounded px-1">← price here</span>
                )}
                {isNear && (
                  <span className="text-[10px] text-gray-500">~{currentPosition?.nearestLevel?.distance?.toFixed(2)}%</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Extension Targets */}
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Extension Targets</div>
      <div className="space-y-1 mb-4">
        {extensions?.targets?.filter(t => ['127.2%', '161.8%'].includes(t.level)).map(t => (
          <div key={t.level} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: '#14532d15', border: '1px solid #16a34a20' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-green-400">{t.level}</span>
              {t.level === '161.8%' && <span className="text-[10px] text-green-700">← primary target 🎯</span>}
              {t.level === '127.2%' && <span className="text-[10px] text-green-800">conservative</span>}
            </div>
            <span className="text-xs font-mono text-green-300">{formatPriceShort(t.price)}</span>
          </div>
        ))}
      </div>

      {/* Current Position Note */}
      {currentPosition?.description && (
        <div
          className="text-xs leading-relaxed px-3 py-2 rounded-xl"
          style={{ background: '#1e2d4a50', color: atKey ? '#e2e8f0' : '#94a3b8', borderLeft: `3px solid ${atKey ? '#eab308' : '#334155'}` }}
        >
          📍 {currentPosition.description}
        </div>
      )}

      {/* Confidence Boost Badge */}
      {atKey && currentPosition?.confidenceBoost > 0 && (
        <div className="mt-3 flex justify-end">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-black"
            style={{ background: '#78350f20', color: '#eab308', border: '1px solid #78350f40' }}
          >
            +{currentPosition.confidenceBoost} confidence
          </span>
        </div>
      )}
    </div>
  )
}
