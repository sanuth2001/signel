'use client'
import { useEffect, useState } from 'react'
import { getSignalColor, getConfidenceColor, getConfidenceLabel, formatPrice } from '../lib/utils/formatters'

export default function SignalCard({ signal, confidence, reasoning, risk, stopLoss, target, riskReward, timeHorizon, keyRisk, entryPrice }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [signal])

  const signalColor = getSignalColor(signal)
  const confColor = getConfidenceColor(confidence)

  const riskColors = { low: '#22c55e', medium: '#eab308', high: '#ef4444' }
  const riskColor = riskColors[risk] || '#6b7280'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm p-6 shadow-2xl">
      {/* Glow effect behind signal */}
      <div className="absolute inset-0 opacity-5 rounded-2xl" style={{ background: `radial-gradient(circle at 50% 50%, ${signalColor}, transparent 70%)` }} />

      <div className="relative z-10">
        {/* Signal Direction */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-400 mb-1 uppercase tracking-widest font-medium">Signal</div>
            <div
              className="text-7xl font-black tracking-tight transition-all duration-500"
              style={{ color: signalColor, textShadow: `0 0 40px ${signalColor}40` }}
            >
              {signal || 'HOLD'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1 uppercase tracking-widest">Confidence</div>
            <div className="text-4xl font-bold" style={{ color: confColor }}>{confidence || 0}%</div>
            <div className="text-sm mt-1" style={{ color: confColor }}>{getConfidenceLabel(confidence)}</div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mb-5">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: animated ? `${confidence || 0}%` : '0%',
                background: `linear-gradient(90deg, ${confColor}80, ${confColor})`,
                boxShadow: `0 0 10px ${confColor}60`,
              }}
            />
          </div>
        </div>

        {/* Price Targets Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/30">
            <div className="text-xs text-gray-500 mb-1">Entry</div>
            <div className="text-sm font-semibold text-gray-200">{formatPrice(entryPrice)}</div>
          </div>
          <div className="bg-red-900/20 rounded-xl p-3 border border-red-800/30">
            <div className="text-xs text-red-400 mb-1">Stop Loss</div>
            <div className="text-sm font-semibold text-red-300">{formatPrice(stopLoss)}</div>
          </div>
          <div className="bg-green-900/20 rounded-xl p-3 border border-green-800/30">
            <div className="text-xs text-green-400 mb-1">Target</div>
            <div className="text-sm font-semibold text-green-300">{formatPrice(target)}</div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {riskReward && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/30 border border-blue-700/30 text-blue-300">
              R:R {riskReward}
            </span>
          )}
          {timeHorizon && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/30 border border-purple-700/30 text-purple-300">
              ⏱ {timeHorizon}
            </span>
          )}
          {risk && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: `${riskColor}40`, color: riskColor, background: `${riskColor}10` }}>
              {risk?.toUpperCase()} RISK
            </span>
          )}
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div className="bg-gray-800/40 rounded-xl p-4 mb-3 border border-gray-700/20">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">AI Reasoning</div>
            <p className="text-sm text-gray-300 italic leading-relaxed">{reasoning}</p>
          </div>
        )}

        {/* Key Risk */}
        {keyRisk && (
          <div className="flex items-start gap-2 bg-yellow-900/10 border border-yellow-700/20 rounded-xl p-3">
            <span className="text-yellow-400 text-sm mt-0.5">⚠</span>
            <p className="text-sm text-yellow-300/80 leading-relaxed">{keyRisk}</p>
          </div>
        )}
      </div>
    </div>
  )
}
