'use client'
import { useState } from 'react'

export default function FVGSignalCard({ signal, onTrack, onRefresh, watchingStatus }) {
  const [copied, setCopied] = useState(false)

  if (!signal || (signal.signal !== 'BUY' && signal.signal !== 'SELL')) {
    const nearest = watchingStatus?.nearestFVG
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between min-h-[380px]">
        <div>
          <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="font-bold text-white tracking-wide">ACTIVE FVG SIGNAL</h3>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 animate-pulse">
              ● WATCHING MARKET
            </span>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-blue-500/10">
              🎯
            </div>
            <h4 className="text-base font-bold text-gray-200 mb-1">Waiting for Price to Enter FVG Zone</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
              The FVG system does not guess or chase price. It specifically waits for price to tap into institutional imbalance levels before executing.
            </p>

            {nearest && (
              <div className="max-w-xs mx-auto p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-left text-xs space-y-1">
                <div className="text-gray-400 font-medium">Nearest Institutional Target:</div>
                <div className="font-bold text-white flex justify-between">
                  <span>{nearest.type?.toUpperCase()} FVG ({nearest.timeframe})</span>
                  <span className="text-blue-400">${nearest.zone?.mid?.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  Distance: {Math.abs(nearest.distanceFromCurrent)}% away
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="w-full py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs font-bold transition-all shadow-md"
        >
          🔄 Re-Scan FVG Entry Signals Now
        </button>
      </div>
    )
  }

  const isBuy = signal.signal === 'BUY'
  const grade = signal.fvg?.grade || 'S-TIER'
  const conf = signal.confidence || 88
  const entry = signal.entry || {}
  const stopLoss = signal.stopLoss || {}
  const targets = signal.targets || []
  const primaryTarget = signal.primaryTarget || (targets[1]?.price)

  const copySignalToClipboard = () => {
    const text = `⚡ FVG ${signal.signal} SIGNAL — ${signal.coin}
Grade: ${grade} | Confidence: ${conf}%
Entry Zone: $${entry.zone?.low} - $${entry.zone?.high} (Optimal: $${entry.optimal})
Stop Loss: $${stopLoss.price} (-${stopLoss.distancePercent}%)
TP1: $${targets[0]?.price} | TP2: $${targets[1]?.price} 🎯 | TP3: $${targets[2]?.price}
Risk/Reward: ${signal.riskReward}:1`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 shadow-2xl transition-all relative overflow-hidden ${
      isBuy
        ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/40 via-gray-950/90 to-gray-950 shadow-emerald-950/40'
        : 'border-rose-500/60 bg-gradient-to-b from-rose-950/40 via-gray-950/90 to-gray-950 shadow-rose-950/40'
    }`}>
      {/* Background Accent Glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
        isBuy ? 'bg-emerald-400' : 'bg-rose-400'
      }`}></div>

      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-4">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg ${
            isBuy
              ? 'bg-emerald-500 text-gray-950 shadow-emerald-500/30'
              : 'bg-rose-500 text-white shadow-rose-500/30'
          }`}>
            🟢 {signal.signal} — {signal.coin}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            FVG Grade: {grade} 🔥
          </span>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-400">Confidence Score</div>
          <div className="text-lg font-black font-mono text-emerald-400">{conf}%</div>
        </div>
      </div>

      {/* FVG Entry Zone Box */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Institutional FVG Entry Zone ({signal.fvg?.timeframe?.toUpperCase()})</span>
          <span className="text-blue-400 font-bold">Type {signal.fvg?.entryType || 2} Mitigation</span>
        </div>
        <div className="text-base font-mono font-bold text-white flex items-center justify-between">
          <span>${entry.zone?.low?.toLocaleString()} — ${entry.zone?.high?.toLocaleString()}</span>
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            Optimal: ${entry.optimal?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stop Loss & R/R Bar */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-3">
          <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">STOP LOSS</div>
          <div className="text-base font-mono font-bold text-rose-200 mt-0.5">
            ${stopLoss.price?.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">
            -{stopLoss.distancePercent}% ({stopLoss.placement?.replace('_', ' ')})
          </div>
        </div>

        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">RISK / REWARD</div>
          <div className="text-base font-mono font-bold text-blue-200 mt-0.5">
            {signal.riskReward}:1 Ratio
          </div>
          <div className="text-[10px] text-blue-400/80 mt-0.5">
            {signal.riskReward >= 3 ? '⭐ Excellent Risk/Reward' : '✅ Valid Risk/Reward'}
          </div>
        </div>
      </div>

      {/* Take Profit Targets */}
      <div className="mb-4">
        <div className="text-xs font-bold text-gray-300 mb-2 flex items-center justify-between">
          <span>TAKE PROFIT TARGETS</span>
          <span className="text-[11px] text-emerald-400 font-mono">Primary TP2: ${primaryTarget?.toLocaleString()}</span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {targets.map((tp, idx) => (
            <div
              key={tp.level}
              className={`flex items-center justify-between p-2 rounded-lg border ${
                idx === 1
                  ? 'bg-emerald-950/50 border-emerald-500/60 font-bold text-white shadow-sm shadow-emerald-950'
                  : 'bg-gray-900/60 border-gray-800/70 text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${idx === 1 ? 'bg-emerald-400 animate-ping' : 'bg-gray-600'}`}></span>
                <span className="font-bold">{tp.level}:</span>
                <span>${tp.price?.toLocaleString()}</span>
                {idx === 1 && <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-sans">MAIN TARGET 🎯</span>}
              </div>
              <div className="text-right text-[11px] text-gray-400">
                <span>R:R {tp.rr}:1</span>
                <span className="ml-2 text-gray-500">({tp.positionPercent}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmations & Claude Rationale */}
      <div className="p-3 bg-gray-900/80 rounded-xl border border-gray-800 text-xs mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-gray-300">Confirmation Score:</span>
          <span className="font-bold text-emerald-400">{signal.confirmations?.score}/10 ✅</span>
        </div>
        <p className="text-gray-400 text-[11px] italic line-clamp-2 mt-1">
          "{signal.claudeRationale}"
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={copySignalToClipboard}
          className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 transition-all"
        >
          {copied ? '✅ Copied Signal' : '📋 Copy Signal'}
        </button>

        <button
          onClick={() => onTrack && onTrack(signal)}
          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/50 transition-all"
        >
          🎯 Track Live Trade
        </button>
      </div>
    </div>
  )
}
