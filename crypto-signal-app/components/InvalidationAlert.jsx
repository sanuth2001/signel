'use client'
// InvalidationAlert — modal popup when signal is invalidating
import { useState, useEffect } from 'react'
import { formatPrice } from '../lib/utils/formatters'

export default function InvalidationAlert({
  signal, currentPrice, invalidation,
  onExitNow, onHold, onTrustStop,
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const entry    = signal?.entryPrice || 0
  const stop     = signal?.stopLoss   || 0
  const isLong   = signal?.signal === 'BUY'
  const current  = currentPrice || entry

  const currentPnl  = entry > 0 ? ((current - entry) / entry) * 100 * (isLong ? 1 : -1) : 0
  const stopPnl     = entry > 0 ? ((stop - entry) / entry) * 100 * (isLong ? 1 : -1) : 0
  const saved       = Math.abs(currentPnl - stopPnl)

  const isCritical  = invalidation?.confidence >= 80

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        backgroundColor: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.98), rgba(31,41,55,0.98))',
          border: isCritical ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(234,179,8,0.4)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
          boxShadow: isCritical
            ? '0 0 60px rgba(239,68,68,0.15), 0 25px 50px rgba(0,0,0,0.5)'
            : '0 0 60px rgba(234,179,8,0.10), 0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Alert header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{
            background: isCritical
              ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08))'
              : 'linear-gradient(135deg, rgba(234,179,8,0.10), rgba(245,158,11,0.06))',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)' }}
          >
            {isCritical ? '🔴' : '⚠️'}
          </div>
          <div>
            <div className="text-sm font-black text-white uppercase tracking-wider">
              {isCritical ? 'Signal Invalidation Detected' : 'Signal Warning'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {signal?.coin} {signal?.signal} — Entry {formatPrice(entry)}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Current state */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Entry',   value: formatPrice(entry),   color: '#60a5fa' },
              { label: 'Current', value: formatPrice(current), color: currentPnl >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'P&L',     value: `${currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}%`, color: currentPnl >= 0 ? '#22c55e' : '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800/60 rounded-xl p-3 text-center">
                <div className="text-[10px] text-gray-500 mb-1">{label}</div>
                <div className="text-sm font-bold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Why This Alert</div>
            <div
              className="px-4 py-3 rounded-xl border text-sm text-red-200 leading-relaxed"
              style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}
            >
              {invalidation?.reason || 'CHoCH detected — market structure turning against your signal.'}
            </div>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">Invalidation confidence:</div>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${invalidation?.confidence || 70}%`,
                  background: 'linear-gradient(90deg, #eab308, #ef4444)',
                }}
              />
            </div>
            <div className="text-xs font-bold text-red-400">{invalidation?.confidence || 70}%</div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Your Options</div>

            {/* Exit Now */}
            <button
              onClick={onExitNow}
              className="w-full text-left rounded-xl p-4 border transition-all duration-200 hover:scale-[1.01] group"
              style={{
                background: 'rgba(239,68,68,0.08)',
                borderColor: 'rgba(239,68,68,0.3)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-red-400 flex items-center gap-2">
                    🔴 EXIT NOW
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Close at {formatPrice(current)} = <span className="text-red-300">{currentPnl.toFixed(2)}%</span>
                  </div>
                </div>
                {saved > 0.01 && (
                  <div className="text-right">
                    <div className="text-[10px] text-green-500">Save</div>
                    <div className="text-sm font-bold text-green-400">~{saved.toFixed(2)}%</div>
                    <div className="text-[10px] text-gray-600">vs full stop</div>
                  </div>
                )}
              </div>
            </button>

            {/* Hold */}
            <button
              onClick={onHold}
              className="w-full text-left rounded-xl p-4 border transition-all duration-200 hover:scale-[1.01]"
              style={{ background: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.25)' }}
            >
              <div className="text-sm font-bold text-yellow-400">⏳ HOLD — Wait for SMC Recovery</div>
              <div className="text-xs text-gray-400 mt-1">
                Signal MAY recover if price finds support. Continue monitoring.
              </div>
            </button>

            {/* Trust Stop */}
            <button
              onClick={onTrustStop}
              className="w-full text-left rounded-xl p-4 border transition-all duration-200 hover:scale-[1.01]"
              style={{ background: 'rgba(107,114,128,0.08)', borderColor: 'rgba(107,114,128,0.2)' }}
            >
              <div className="text-sm font-bold text-gray-300">🛡️ TRUST ORIGINAL STOP LOSS</div>
              <div className="text-xs text-gray-500 mt-1">
                Let price hit {formatPrice(stop)} if it does. Stop tracking alerts.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
