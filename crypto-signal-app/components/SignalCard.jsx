'use client'
// Prompt 21/22/26/37/SMC — Enhanced Signal Card with Live Tracking + Position Size
import { useEffect, useState, useRef, useCallback } from 'react'
import { getSignalColor, getConfidenceColor, getConfidenceLabel, formatPrice, calculatePositionSize } from '../lib/utils/formatters'
import ConflictPanel from './ConflictPanel'
import SignalTrackerPanel from './SignalTrackerPanel'

export default function SignalCard({
  signal, confidence, reasoning, risk, stopLoss, target,
  riskReward, timeHorizon, keyRisk, entryPrice,
  candlePattern, conflicts, waitingFor, droughtReason, warnings,
  fibonacciPosition, signalId, invalidationReason,
  scalpSetup, swingSetup,
}) {
  const [animated, setAnimated]       = useState(false)
  const prevSignalRef                  = useRef(null)
  const [pulsing, setPulsing]         = useState(false)
  const [trackState, setTrackState]   = useState('idle') // 'idle'|'tracking'|'critical'|'invalid'
  const [showTracker, setShowTracker] = useState(false)
  const [trackLoading, setTrackLoading] = useState(false)
  const [positionSize, setPositionSize] = useState(null)
  const [invalidationReasonState, setInvalidationReasonState] = useState(null)

  useEffect(() => {
    setAnimated(false)
    const t1 = setTimeout(() => setAnimated(true), 100)
    // Pulse animation when signal changes
    if (prevSignalRef.current && prevSignalRef.current !== signal) {
      setPulsing(true)
      setTimeout(() => setPulsing(false), 1000)
    }
    prevSignalRef.current = signal

    // Compute position size from saved settings
    if ((signal === 'BUY' || signal === 'SELL') && entryPrice && stopLoss) {
      try {
        const saved = JSON.parse(localStorage.getItem('signal_settings') || '{}')
        const capital = saved.capital || 10000
        const riskPct = saved.riskPercent || 2
        const targetPriceForCalc = target || (signal === 'BUY' ? entryPrice * 1.05 : entryPrice * 0.95)
        const size = calculatePositionSize(capital, riskPct, entryPrice, stopLoss)
        if (size) {
          const actualRR = target ? Math.abs(target - entryPrice) / Math.abs(entryPrice - stopLoss) : 2
          const potentialWin = size.maxLoss * actualRR
          setPositionSize({ ...size, capital, riskPct, potentialWin: parseFloat(potentialWin.toFixed(2)), potentialWinPercent: parseFloat(((potentialWin / capital) * 100).toFixed(2)), rr: parseFloat(actualRR.toFixed(2)) })
        }
      } catch (e) { setPositionSize(null) }
    } else {
      setPositionSize(null)
    }

    return () => clearTimeout(t1)
  }, [signal, confidence, entryPrice, stopLoss, target])

  // Restore tracking state from API on mount (if signalId is known)
  useEffect(() => {
    if (!signalId) return
    fetch(`/api/track?id=${signalId}`)
      .then(r => r.json())
      .then(data => {
        if (data.isTracking) {
          setTrackState('tracking')
          setShowTracker(true)
        }
        if (data.invalidationReason || data.outcome === 'invalidated') {
          setTrackState('invalid')
          setInvalidationReasonState(data.invalidationReason)
        }
        if (data.healthGrade === 'CRITICAL' || data.healthGrade === 'POOR') {
          setTrackState('critical')
        }
      })
      .catch(() => {})
  }, [signalId])

  const handleTrack = useCallback(async () => {
    if (!signalId) return
    if (trackState === 'invalid') return

    setTrackLoading(true)
    try {
      if (trackState === 'idle') {
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signalId, action: 'start' }),
        })
        setTrackState('tracking')
        setShowTracker(true)
      } else {
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signalId, action: 'stop' }),
        })
        setTrackState('idle')
        setShowTracker(false)
      }
    } catch (e) {
      console.error('[SignalCard] Track toggle error:', e)
    }
    setTrackLoading(false)
  }, [signalId, trackState])

  // Listen for health updates from SignalTrackerPanel
  const handleHealthUpdate = useCallback((healthGrade) => {
    if (healthGrade === 'CRITICAL' || healthGrade === 'POOR') setTrackState('critical')
    else if (trackState === 'critical') setTrackState('tracking')
  }, [trackState])

  const signalColor = getSignalColor(signal)
  const confColor = getConfidenceColor(confidence)

  const riskColors = { low: '#22c55e', medium: '#eab308', high: '#ef4444' }
  const riskColor = riskColors[risk] || '#6b7280'

  // SHORT label when stop > entry (short position)
  const isShort = signal === 'SELL' && stopLoss > entryPrice
  const isLong = signal === 'BUY' && stopLoss < entryPrice

  // Candle pattern icon
  const candleIcons = {
    bullish: '🕯️🟢',
    bearish: '🕯️🔴',
    neutral: '🕯️⚪',
  }

  const showConflicts = conflicts && (signal === 'HOLD' || conflicts.conflictLevel === 'high' || conflicts.conflictLevel === 'medium')

  return (
    <>
    <div className={`relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm p-6 shadow-2xl transition-all duration-300 ${pulsing ? 'scale-[1.01]' : 'scale-100'}`}>
      {/* Glow effect */}
      <div className="absolute inset-0 opacity-5 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${signalColor}, transparent 70%)` }} />

      <div className="relative z-10">
        {/* Signal + Confidence */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-400 mb-1 uppercase tracking-widest font-medium">Signal</div>
            <div className="flex items-center gap-3">
              <div
                className={`text-7xl font-black tracking-tight transition-all duration-500 ${(signal === 'BUY' || signal === 'SELL') && !pulsing ? '' : ''}`}
                style={{
                  color: signalColor,
                  textShadow: `0 0 40px ${signalColor}40`,
                  animation: signal !== 'HOLD' ? 'none' : undefined,
                }}
              >
                {signal || 'HOLD'}
              </div>
              {isShort && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900/40 text-red-300 border border-red-700/40">SHORT</span>}
              {isLong && <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900/40 text-green-300 border border-green-700/40">LONG</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1 uppercase tracking-widest">Confidence</div>
            <div className="text-4xl font-bold transition-all duration-700" style={{ color: confColor }}>{confidence || 0}%</div>
            <div className="text-sm mt-1" style={{ color: confColor }}>{getConfidenceLabel(confidence)}</div>
          </div>
        </div>

        {/* Invalidation Banner — shown when trade thesis is voided or invalid */}
        {(trackState === 'invalid' || invalidationReasonState || invalidationReason) && (
          <div className="mb-5 p-4 rounded-xl border border-red-500/70 bg-red-950/70 shadow-xl animate-pulse">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
                <span className="text-xl">🚨</span> TRADE INVALIDATED
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-700/60 font-bold uppercase tracking-wider">
                EXIT POSITION
              </span>
            </div>
            <div className="text-xs text-red-200 font-medium leading-relaxed">
              {invalidationReasonState || invalidationReason || 'Market structure turned against this trade thesis (CHoCH or Stop breach). The signal is no longer valid.'}
            </div>
          </div>
        )}

        {/* Gradient Confidence Bar */}
        <div className="mb-5">
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: animated ? `${confidence || 0}%` : '0%',
                background: `linear-gradient(90deg, #ef4444, #f97316 40%, #eab308 60%, #22c55e)`,
                clipPath: `inset(0 ${100 - (confidence || 0)}% 0 0 round 4px)`,
                boxShadow: `0 0 10px ${confColor}60`,
              }}
            />
          </div>
          {/* Threshold marker */}
          <div className="relative h-0">
            <div className="absolute" style={{ left: '70%', top: '-12px' }}>
              <div className="w-px h-4 bg-white/20" />
              <div className="text-xs text-gray-600 mt-0.5 -ml-3">70%</div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings?.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {warnings.map((w, i) => w && (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-900/20 border border-orange-700/30">
                <span className="text-orange-400 text-xs">⚠️</span>
                <span className="text-xs text-orange-300">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price Targets */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/30">
            <div className="text-xs text-gray-500 mb-1">Entry</div>
            <div className="text-sm font-semibold text-gray-200">{formatPrice(entryPrice)}</div>
            {fibonacciPosition?.atKeyLevel && fibonacciPosition?.nearestLevel && (
              <div className="mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ backgroundColor: '#78350f30', color: '#fbbf24', border: '1px solid #78350f60' }}>
                📐 Fib {fibonacciPosition.nearestLevel.level} ★
              </div>
            )}
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

        {/* Dual Setup Card: Scalp (Small Move) vs Swing (Big Move) */}
        <div className="mb-4 rounded-xl border border-purple-800/30 bg-purple-950/20 p-4">
          <div className="text-xs text-purple-300 font-bold uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>⚡ Trade Setup Options</span>
            <span className="text-[10px] text-purple-400 font-normal">Small vs Big Movement</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Scalp Setup (Small Movement) */}
            <div className="bg-gray-900/80 rounded-xl p-3 border border-yellow-700/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">⚡ SCALP (Small Move)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-300 font-mono font-bold">{scalpSetup?.timeHorizon || '1h - 4h'}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-400"><span>Target:</span> <span className="text-green-400 font-bold">{formatPrice(scalpSetup?.target || target)}</span></div>
                <div className="flex justify-between text-gray-400"><span>Stop:</span> <span className="text-red-400 font-bold">{formatPrice(scalpSetup?.stopLoss || stopLoss)}</span></div>
                <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800">
                  <span>R:R {scalpSetup?.riskRewardRatio || 1.8}</span>
                  <span className="text-green-400 font-semibold">{scalpSetup?.pnlPercent || '+1.5%'}</span>
                </div>
              </div>
            </div>

            {/* Swing Setup (Big Movement) */}
            <div className="bg-gray-900/80 rounded-xl p-3 border border-blue-700/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">🚀 SWING (Big Move)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 font-mono font-bold">{swingSetup?.timeHorizon || '24h - 72h'}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-400"><span>Target:</span> <span className="text-green-400 font-bold">{formatPrice(swingSetup?.target || target)}</span></div>
                <div className="flex justify-between text-gray-400"><span>Stop:</span> <span className="text-red-400 font-bold">{formatPrice(swingSetup?.stopLoss || stopLoss)}</span></div>
                <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800">
                  <span>R:R {swingSetup?.riskRewardRatio || 2.2}</span>
                  <span className="text-green-400 font-semibold">{swingSetup?.pnlPercent || '+5.4%'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Position Size Calculator — only for actionable signals */}
        {positionSize && (signal === 'BUY' || signal === 'SELL') && (
          <div className="mb-4 rounded-xl border border-blue-800/30 bg-blue-950/20 p-4">
            <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              💼 Position Size
              <span className="text-[10px] text-gray-500 font-normal ml-auto normal-case">{positionSize.riskPct}% risk of ${positionSize.capital?.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-700/30">
                <div className="text-gray-500 mb-1">Coin Amount</div>
                <div className="text-white font-bold text-sm">{positionSize.coinAmount}</div>
                <div className="text-gray-400 text-[10px]">≈ ${positionSize.usdValue?.toLocaleString()} ({positionSize.portfolioPercent}% of portfolio)</div>
              </div>
              <div className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-700/30">
                <div className="text-gray-500 mb-1">Stop Distance</div>
                <div className="text-white font-bold text-sm">{positionSize.stopDistancePercent}%</div>
                <div className="text-gray-400 text-[10px]">R:R ratio {positionSize.rr}:1</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-800/20">
                <span className="text-red-400 text-xs">If LOSS</span>
                <span className="text-red-300 text-xs font-bold">-${positionSize.maxLoss} (-{positionSize.maxLossPercent}%)</span>
              </div>
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-green-950/30 border border-green-800/20">
                <span className="text-green-400 text-xs">If WIN</span>
                <span className="text-green-300 text-xs font-bold">+${positionSize.potentialWin} (+{positionSize.potentialWinPercent}%)</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-gray-600 text-center">Adjust capital &amp; risk % in ⚙️ Settings</div>
          </div>
        )}

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
            <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ color: riskColor, borderColor: `${riskColor}50`, backgroundColor: `${riskColor}12` }}>
              Risk: {risk}
            </span>
          )}
        </div>

        {/* Candle Pattern (Prompt 21) */}
        {candlePattern && candlePattern.pattern && (
          <div className="mb-4 px-3 py-2 rounded-xl border border-gray-700/30 bg-gray-800/40">
            <div className="flex items-center gap-2">
              <span>{candleIcons[candlePattern.direction] || '🕯️'}</span>
              <span className="text-xs font-semibold text-gray-200">{candlePattern.pattern}</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                backgroundColor: candlePattern.direction === 'bullish' ? '#22c55e18' : candlePattern.direction === 'bearish' ? '#ef444418' : '#6b728018',
                color: candlePattern.direction === 'bullish' ? '#22c55e' : candlePattern.direction === 'bearish' ? '#ef4444' : '#9ca3af'
              }}>{candlePattern.strength}</span>
              {candlePattern.atKeyLevel && <span className="text-xs text-yellow-400 ml-auto">📌 Key Level</span>}
            </div>
            <div className="text-xs text-gray-400 mt-1 ml-6">{candlePattern.description}</div>
          </div>
        )}

        {/* Reasoning */}
        {reasoning && (
          <div className="mb-4 p-3 rounded-xl bg-gray-800/40 border border-gray-700/20">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">AI Reasoning</div>
            <div className="text-sm text-gray-300 leading-relaxed">{reasoning}</div>
          </div>
        )}

        {/* Key Risk */}
        {keyRisk && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-red-900/10 border border-red-800/20">
            <span className="text-red-400 text-xs mt-0.5">⚠️</span>
            <div>
              <div className="text-xs text-red-400 font-medium mb-0.5">Key Risk</div>
              <div className="text-xs text-gray-400">{keyRisk}</div>
            </div>
          </div>
        )}

        {/* HOLD — Waiting For Section (Prompt 22) */}
        {signal === 'HOLD' && waitingFor && (
          <div className="mt-4 rounded-xl border border-yellow-700/30 bg-yellow-900/10 p-4 space-y-3">
            <div className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
              ⏳ Waiting For…
              {waitingFor.estimatedWait && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 ml-auto">{waitingFor.estimatedWait}</span>
              )}
            </div>
            {waitingFor.conditions?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1.5">Must see:</div>
                <div className="space-y-1">
                  {waitingFor.conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="text-yellow-500">→</span>{c}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {waitingFor.missingConditions?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1.5">Currently missing:</div>
                <div className="space-y-1">
                  {waitingFor.missingConditions.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-300">
                      <span className="text-red-500">✗</span>{m}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {waitingFor.watchLevels && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-yellow-700/20">
                {waitingFor.watchLevels.bullishTrigger && (
                  <div className="text-xs">
                    <span className="text-green-400">▲ Bull trigger: </span>
                    <span className="text-gray-300">${waitingFor.watchLevels.bullishTrigger?.toLocaleString()}</span>
                  </div>
                )}
                {waitingFor.watchLevels.bearishTrigger && (
                  <div className="text-xs">
                    <span className="text-red-400">▼ Bear trigger: </span>
                    <span className="text-gray-300">${waitingFor.watchLevels.bearishTrigger?.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            {waitingFor.currentConflicts?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Conflicts:</div>
                <div className="flex flex-wrap gap-1">
                  {waitingFor.currentConflicts.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drought Reason */}
        {signal === 'HOLD' && droughtReason && !waitingFor && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-gray-800/40 border border-gray-700/20">
            <span className="text-xs text-gray-500">{droughtReason}</span>
          </div>
        )}

        {/* Conflict Panel (Prompt 27) */}
        {showConflicts && (
          <div className="mt-4">
            <ConflictPanel conflicts={conflicts} visible={true} />
          </div>
        )}

        {/* TRACK BUTTON (only for BUY/SELL signals with a signalId) */}
        {signalId && (signal === 'BUY' || signal === 'SELL') && (
          <div className="mt-4">
            {trackState === 'idle' && (
              <button
                onClick={handleTrack}
                disabled={trackLoading}
                id={`track-btn-${signalId}`}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-gray-800/60 hover:bg-blue-900/30 border border-gray-700/40 hover:border-blue-600/50 text-gray-400 hover:text-blue-300 disabled:opacity-50"
              >
                {trackLoading ? '⏳ Starting…' : '📍 TRACK THIS SIGNAL'}
              </button>
            )}
            {trackState === 'tracking' && (
              <button
                onClick={handleTrack}
                disabled={trackLoading}
                id={`track-btn-${signalId}`}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border text-green-300 border-green-600/50"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.10))',
                  animation: 'pulseGreen 2s ease-in-out infinite',
                }}
              >
                {trackLoading ? '⏳ Stopping…' : '🟢 TRACKING LIVE — Click to stop'}
              </button>
            )}
            {trackState === 'critical' && (
              <button
                onClick={() => setShowTracker(true)}
                id={`track-btn-${signalId}`}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border text-red-300 border-red-600/50"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.10))',
                  animation: 'pulseRed 1.5s ease-in-out infinite',
                }}
              >
                🔴 CRITICAL — View Signal Status
              </button>
            )}
            {trackState === 'invalid' && (
              <button
                disabled
                id={`track-btn-${signalId}`}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-900/20 border border-red-800/30 text-red-400 opacity-70 cursor-not-allowed"
              >
                ❌ SIGNAL INVALIDATED
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline animations */}
      <style jsx>{`
        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
      `}</style>
    </div>

    {/* Signal Tracker Panel — shown below card when tracking */}
    {showTracker && signalId && (
      <SignalTrackerPanel
        signalId={signalId}
        signal={{ signal, entryPrice, stopLoss, target, coin: undefined }}
        onClose={() => setShowTracker(false)}
        onHealthUpdate={handleHealthUpdate}
        onStop={() => { setTrackState('idle'); setShowTracker(false) }}
        onInvalidated={() => setTrackState('invalid')}
      />
    )}
  </>
  )
}
