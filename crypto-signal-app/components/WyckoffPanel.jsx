'use client'
import { useState } from 'react'

// ─── Phase dot indicator ───────────────────────────────────────────────────────
function PhaseDot({ label, active, done }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
        active ? 'bg-yellow-400 border-yellow-300 text-black shadow-[0_0_10px_rgba(234,179,8,0.6)]'
        : done ? 'bg-emerald-500 border-emerald-400 text-white'
        : 'bg-gray-700 border-gray-600 text-gray-400'
      }`}>{label}</div>
    </div>
  )
}

// ─── Event row ────────────────────────────────────────────────────────────────
function EventRow({ icon, label, detected, detail }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${detected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-gray-800/50 border border-gray-700/30'}`}>
      <span className="text-base">{detected ? '✅' : '⏳'}</span>
      <span className={`text-sm font-medium ${detected ? 'text-emerald-300' : 'text-gray-400'}`}>{label}</span>
      {detail && <span className={`ml-auto text-xs ${detected ? 'text-emerald-400' : 'text-gray-500'}`}>{detail}</span>}
    </div>
  )
}

export default function WyckoffPanel({ wyckoff }) {
  const [expanded, setExpanded] = useState(true)

  if (!wyckoff || !wyckoff.wyckoffDetected) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-gray-300">Wyckoff Analysis</h3>
        </div>
        <div className="text-center py-6">
          <div className="text-3xl mb-2">〰️</div>
          <p className="text-gray-500 text-sm">No Wyckoff structure detected in current price data</p>
          <p className="text-gray-600 text-xs mt-1">Requires a trading range of 8–45% with ≥2 touches on each bound</p>
        </div>
      </div>
    )
  }

  const { type, tradingRange, currentPhase, events, signal } = wyckoff
  const isAccum = type === 'accumulation'
  const phase = currentPhase?.phase

  const isSpring = events?.spring?.detected
  const isLPS = events?.lps?.detected
  const isUTAD = events?.utad?.detected
  const isSOS = events?.sos?.detected
  const isSOW = events?.sow?.detected
  const isSC = events?.sc?.detected
  const isAR = events?.ar?.detected
  const isBC = events?.bc?.detected

  const borderClass = isSpring || isLPS || isUTAD
    ? 'border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
    : isAccum ? 'border-emerald-500/40' : 'border-red-500/40'

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden ${borderClass}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${isAccum ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-bold text-white">Wyckoff Analysis</h3>
          {wyckoff.wyckoffDetected && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isAccum ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {isAccum ? '⬆️ ACCUMULATION' : '⬇️ DISTRIBUTION'}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Spring/LPS/UTAD Banner */}
      {(isSpring || isLPS || isUTAD) && (
        <div className={`px-4 py-2.5 text-center text-sm font-bold ${
          isSpring ? 'bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30'
          : isLPS ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
          : 'bg-orange-500/20 text-orange-300 border-b border-orange-500/30'
        }`}>
          {isSpring && `🔥 WYCKOFF SPRING CONFIRMED — Type ${events.spring.springType} | ${events.spring.accuracy || '84%'} Historical Win Rate`}
          {!isSpring && isLPS && '⭐ LAST POINT OF SUPPORT — Optimal Entry Zone Active'}
          {!isSpring && !isLPS && isUTAD && '⚠️ UTAD DETECTED — Distribution Phase C Sell Signal'}
        </div>
      )}

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Trading Range */}
          <div className="bg-gray-800/60 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Trading Range</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Resistance (top)</div>
                <div className="text-sm font-mono text-red-300">${tradingRange?.high?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Support (bottom)</div>
                <div className="text-sm font-mono text-green-300">${tradingRange?.low?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Range Size</div>
                <div className="text-sm font-semibold text-white">{tradingRange?.size}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Quality</div>
                <div className={`text-sm font-semibold capitalize ${
                  tradingRange?.quality === 'strong' ? 'text-emerald-400'
                  : tradingRange?.quality === 'moderate' ? 'text-yellow-400'
                  : 'text-gray-400'
                }`}>{tradingRange?.quality}</div>
              </div>
            </div>
          </div>

          {/* Phase Progress */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Phase Progress</div>
            <div className="flex items-center justify-between gap-1 mb-2">
              {['A', 'B', 'C', 'D', 'E'].map((p) => (
                <div key={p} className="flex items-center flex-1">
                  <PhaseDot
                    label={p}
                    active={phase === p}
                    done={phase && phase > p}
                  />
                  {p !== 'E' && (
                    <div className={`flex-1 h-0.5 mx-1 ${
                      phase && phase > p ? 'bg-emerald-500' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-white">{currentPhase?.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{currentPhase?.description}</div>
            </div>
          </div>

          {/* Key Events */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Key Events</div>
            <div className="space-y-1.5">
              {isAccum ? (
                <>
                  <EventRow label="Selling Climax (SC)" detected={isSC} detail={isSC ? `${events.sc.candlesAgo} candles ago` : null} />
                  <EventRow label="Automatic Rally (AR)" detected={isAR} detail={isAR ? `High: $${events.ar.arHigh?.toLocaleString()}` : null} />
                  <EventRow label="Spring (Phase C)" detected={isSpring} detail={isSpring ? `Type ${events.spring.springType} • ${events.spring.candlesAgo} bars ago` : null} />
                  <EventRow label="Sign of Strength (SOS)" detected={isSOS} detail={isSOS ? `${isSOS && events.sos.volumeRatio?.toFixed(1)}x volume` : null} />
                  <EventRow label="Last Point of Support (LPS)" detected={isLPS} detail={isLPS ? `$${events.lps.lpsPrice?.toLocaleString()}` : null} />
                </>
              ) : (
                <>
                  <EventRow label="Buying Climax (BC)" detected={isBC} detail={isBC ? `${events.bc.candlesAgo} candles ago` : null} />
                  <EventRow label="UTAD (Phase C)" detected={isUTAD} detail={isUTAD ? `${events.utad.candlesAgo} bars ago` : null} />
                  <EventRow label="Sign of Weakness (SOW)" detected={isSOW} detail={isSOW ? `${events.sow.volumeRatio?.toFixed(1)}x volume` : null} />
                </>
              )}
            </div>
          </div>

          {/* Signal Card */}
          {signal && (
            <div className={`rounded-xl p-3 border ${
              signal.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${signal.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {signal.type === 'BUY' ? '🟢' : '🔴'} {signal.type} — {signal.event}
                </span>
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                  Historical: {signal.accuracy}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">Entry</div>
                  <div className="font-mono text-white">${signal.entry?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Stop Loss</div>
                  <div className="font-mono text-red-300">${signal.stopLoss?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Target</div>
                  <div className="font-mono text-emerald-300">${signal.target?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Risk/Reward</div>
                  <div className="font-mono text-yellow-300">{signal.riskReward}:1</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className={`text-xs px-2 py-0.5 rounded font-semibold ${
                  signal.urgency === 'immediate' ? 'bg-yellow-500/30 text-yellow-300'
                  : 'bg-gray-700 text-gray-400'
                }`}>
                  {signal.urgency === 'immediate' ? '⚡ Act Now' : '👁 Watching'}
                </div>
                <div className="text-xs text-blue-400">+{signal.confidenceBoost} confidence pts</div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="text-xs text-gray-400 leading-relaxed border-t border-gray-700/50 pt-3">
            {wyckoff.summary}
          </div>
        </div>
      )}
    </div>
  )
}
