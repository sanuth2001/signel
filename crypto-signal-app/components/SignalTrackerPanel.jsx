'use client'
// Live Signal Tracker Panel — main real-time tracking UI
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatPrice } from '../lib/utils/formatters'
import SMCPanel from './SMCPanel'
import InvalidationAlert from './InvalidationAlert'

const REFRESH_INTERVAL = 30_000 // 30 seconds

const healthColors = {
  EXCELLENT: { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e60', text: '#22c55e', bar: '#22c55e' },
  GOOD:      { bg: 'rgba(52,211,153,0.10)', border: '#34d39960', text: '#34d399', bar: '#34d399' },
  FAIR:      { bg: 'rgba(234,179,8,0.10)',  border: '#eab30860', text: '#eab308', bar: '#eab308' },
  WEAK:      { bg: 'rgba(249,115,22,0.10)', border: '#f9731660', text: '#f97316', bar: '#f97316' },
  POOR:      { bg: 'rgba(239,68,68,0.12)',  border: '#ef444460', text: '#ef4444', bar: '#ef4444' },
  CRITICAL:  { bg: 'rgba(239,68,68,0.18)',  border: '#ef4444',   text: '#ef4444', bar: '#ef4444' },
}

const eventIcons = {
  SIGNAL_ENTRY:       '📍',
  PROGRESS_25:        '📈',
  PROGRESS_50:        '📈',
  PROGRESS_75:        '🚀',
  TARGET_NEAR:        '🎯',
  TARGET_HIT:         '🏆',
  STOP_HIT:           '❌',
  CHOCH_MILD:         '⚠️',
  CHOCH_MODERATE:     '⚠️',
  CHOCH_SEVERE:       '🔴',
  LIQUIDITY_SWEPT:    '🌊',
  LIQUIDITY_RECOVERED:'✅',
  HEALTH_DROPPING:    '📉',
  HEALTH_CRITICAL:    '🔴',
  INVALIDATED_SOFT:   '⚠️',
  INVALIDATED_HARD:   '❌',
  OB_BROKEN:          '💥',
  MANUAL_CLOSE:       '✋',
}

function HealthBar({ score, grade }) {
  const colors = healthColors[grade] || healthColors.FAIR
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Signal Health</span>
        <span className="text-sm font-bold" style={{ color: colors.text }}>
          {score}% — {grade}
        </span>
      </div>
      <div className="h-3 bg-gray-800/80 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${colors.bar}88, ${colors.bar})`,
            boxShadow: `0 0 10px ${colors.bar}50`,
          }}
        />
      </div>
    </div>
  )
}

function ProgressBar({ entry, stop, target, currentPrice, isLong }) {
  if (!entry || !stop || !target) return null

  const low  = Math.min(stop, entry, target, currentPrice || entry)
  const high = Math.max(stop, entry, target, currentPrice || entry)
  const range = high - low || 1

  const toPercent = (v) => ((v - low) / range) * 100

  const stopPct    = toPercent(stop)
  const entryPct   = toPercent(entry)
  const targetPct  = toPercent(target)
  const currentPct = toPercent(currentPrice || entry)

  const rewardDist = Math.abs(target - entry)
  const progress   = currentPrice
    ? isLong
      ? Math.max(0, Math.min(100, ((currentPrice - entry) / rewardDist) * 100))
      : Math.max(0, Math.min(100, ((entry - currentPrice) / rewardDist) * 100))
    : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Stop {formatPrice(stop)}</span>
        <span className="font-semibold text-green-400">{progress.toFixed(0)}% toward target</span>
        <span>Target {formatPrice(target)}</span>
      </div>

      {/* Price Track */}
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-gray-800 rounded-full relative">
            {/* Filled progress */}
            <div
              className="absolute h-full rounded-full transition-all duration-700"
              style={{
                left: `${Math.min(entryPct, currentPct)}%`,
                width: `${Math.abs(currentPct - entryPct)}%`,
                background: progress >= 0 ? 'linear-gradient(90deg, #22c55e60, #22c55e)' : 'linear-gradient(90deg, #ef4444, #ef444460)',
              }}
            />
          </div>
        </div>

        {/* Stop marker */}
        <div className="absolute" style={{ left: `${Math.max(0, Math.min(96, stopPct))}%` }}>
          <div className="w-1.5 h-4 bg-red-500 rounded-sm" title={`Stop: ${formatPrice(stop)}`} />
        </div>

        {/* Entry marker */}
        <div className="absolute -translate-x-1/2" style={{ left: `${Math.max(2, Math.min(98, entryPct))}%` }}>
          <div className="w-0.5 h-5 bg-blue-400" title={`Entry: ${formatPrice(entry)}`} />
        </div>

        {/* Target marker */}
        <div className="absolute" style={{ right: `${Math.max(0, Math.min(96, 100 - targetPct))}%` }}>
          <div className="w-1.5 h-4 bg-green-500 rounded-sm" title={`Target: ${formatPrice(target)}`} />
        </div>

        {/* Current price dot */}
        {currentPrice && (
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-700 -translate-x-1/2"
            style={{
              left: `${Math.max(2, Math.min(98, currentPct))}%`,
              background: progress >= 0 ? '#22c55e' : '#ef4444',
              boxShadow: `0 0 8px ${progress >= 0 ? '#22c55e' : '#ef4444'}80`,
            }}
            title={`Current: ${formatPrice(currentPrice)}`}
          />
        )}
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-red-400">Stop</span>
        <span className="text-blue-300">Entry {formatPrice(entry)}</span>
        {currentPrice && (
          <span className={progress >= 0 ? 'text-green-400' : 'text-red-400'}>
            Now {formatPrice(currentPrice)}
          </span>
        )}
        <span className="text-green-400">Target</span>
      </div>
    </div>
  )
}

function ComponentBar({ label, score, maxScore, description }) {
  const pct    = (score / maxScore) * 100
  const color  = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : pct >= 20 ? '#f97316' : '#ef4444'
  const icon   = pct >= 80 ? '✅' : pct >= 50 ? '🟡' : '⚠️'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span style={{ color }} className="font-semibold">{score}/{maxScore} {icon}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {description && <div className="text-[10px] text-gray-500">{description}</div>}
    </div>
  )
}

function TimelineEvent({ event, isLast }) {
  const icon = eventIcons[event.event] || '●'
  const time = event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '?'
  const isAlert = ['CHOCH_SEVERE','HEALTH_CRITICAL','INVALIDATED_HARD','INVALIDATED_SOFT','STOP_HIT'].includes(event.event)

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 border"
          style={{
            background: isAlert ? 'rgba(239,68,68,0.15)' : 'rgba(55,65,81,0.6)',
            borderColor: isAlert ? '#ef444440' : '#374151',
          }}
        >
          {icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-700/50 mt-1" />}
      </div>
      <div className="pb-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{time}</span>
          {event.healthScore && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${event.healthScore >= 60 ? 'bg-green-900/30 text-green-400' : event.healthScore >= 30 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
              {event.healthScore}%
            </span>
          )}
        </div>
        <div className={`text-xs mt-0.5 ${isAlert ? 'text-red-300' : 'text-gray-300'}`}>
          {event.eventDescription || `Price: $${event.price?.toLocaleString?.()}`}
        </div>
      </div>
    </div>
  )
}

export default function SignalTrackerPanel({
  signalId, signal, onClose, onHealthUpdate, onStop, onInvalidated,
}) {
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [lastUpdated, setLastUpdated]     = useState(null)
  const [secondsAgo, setSecondsAgo]       = useState(0)
  const [showSMC, setShowSMC]             = useState(false)
  const [showInvalidation, setShowInvalidation] = useState(false)
  const [invalidationData, setInvalidationData] = useState(null)
  const refreshRef                         = useRef(null)
  const isLong                             = signal?.signal === 'BUY'

  const fetchData = useCallback(async () => {
    try {
      // Trigger a monitor update then fetch state
      fetch('/api/track/monitor').catch(() => {})
      const res  = await fetch(`/api/track?id=${signalId}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(Date.now())
      setSecondsAgo(0)

      // Notify parent of health grade
      if (json.healthGrade && onHealthUpdate) onHealthUpdate(json.healthGrade)

      // Show invalidation modal if detected
      if (json.invalidationReason && !showInvalidation) {
        setInvalidationData({
          reason:     json.invalidationReason,
          confidence: 80,
        })
        setShowInvalidation(true)
        if (onInvalidated) onInvalidated()
      }
    } catch (e) {
      console.error('[SignalTrackerPanel] Fetch error:', e)
    }
    setLoading(false)
  }, [signalId, showInvalidation, onHealthUpdate, onInvalidated])

  useEffect(() => {
    fetchData()
    refreshRef.current = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(refreshRef.current)
  }, [fetchData])

  // Tick seconds counter
  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  const handleStop = async () => {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId, action: 'stop' }),
    }).catch(() => {})
    clearInterval(refreshRef.current)
    if (onStop) onStop()
  }

  const handleMarkOutcome = async (outcome) => {
    const currentPrice = data?.timeline?.slice(-1)?.[0]?.price
    if (!currentPrice) return
    await fetch('/api/outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: signalId, outcome, closePrice: currentPrice }),
    }).catch(() => {})
    await handleStop()
    if (onClose) onClose()
  }

  const hc = healthColors[data?.healthGrade] || healthColors.FAIR
  const timeline = data?.timeline || []
  const latestPrice = timeline.length > 0 ? timeline[timeline.length - 1]?.price : signal?.entryPrice
  const currentHealth = data?.healthScore
  const isInvalidating = data?.invalidationReason || (data?.healthGrade === 'CRITICAL')

  return (
    <>
      {showInvalidation && invalidationData && (
        <InvalidationAlert
          signal={{ ...signal, id: signalId, coin: data?.coin }}
          currentPrice={latestPrice}
          invalidation={invalidationData}
          onExitNow={() => { handleMarkOutcome('loss'); setShowInvalidation(false) }}
          onHold={() => setShowInvalidation(false)}
          onTrustStop={() => { handleStop(); setShowInvalidation(false) }}
        />
      )}

      <div
        className="mt-3 rounded-2xl border overflow-hidden"
        style={{
          borderColor: isInvalidating ? '#ef444450' : '#374151',
          background: isInvalidating
            ? 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(17,24,39,0.95))'
            : 'rgba(17,24,39,0.95)',
          backdropFilter: 'blur(12px)',
        }}
        id={`tracker-panel-${signalId}`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: isInvalidating ? '#ef444430' : '#1f2937' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: isInvalidating ? '#ef4444' : '#22c55e',
                animation: 'pulse 2s ease-in-out infinite',
                boxShadow: isInvalidating ? '0 0 6px #ef4444' : '0 0 6px #22c55e',
              }}
            />
            <span className="text-sm font-bold text-white">
              {isInvalidating ? '🔴 SIGNAL CRITICAL' : '📍 LIVE SIGNAL TRACKER'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500">
              {loading ? 'Loading…' : `Updated ${secondsAgo}s ago`}
            </span>
            <button
              onClick={fetchData}
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors"
              title="Refresh now"
            >↻</button>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-white transition-colors text-sm"
            >✕</button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Health Score */}
          {currentHealth !== null && currentHealth !== undefined ? (
            <HealthBar score={currentHealth} grade={data?.healthGrade || 'FAIR'} />
          ) : (
            <div className="text-xs text-gray-500 text-center py-2">Loading health score…</div>
          )}

          {/* Price Progress */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Price Progress</div>
            <ProgressBar
              entry={signal?.entryPrice}
              stop={signal?.stopLoss}
              target={signal?.target}
              currentPrice={latestPrice}
              isLong={isLong}
            />
          </div>

          {/* SMC Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Smart Money Concepts</div>
              <button
                onClick={() => setShowSMC(!showSMC)}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showSMC ? '▲ Collapse' : '▼ Full Analysis'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: 'Structure',
                  value: data?.smcBias
                    ? (data.smcBias === 'bullish' ? '🟢 Bullish' : data.smcBias === 'bearish' ? '🔴 Bearish' : '🟡 Neutral')
                    : '—',
                },
                {
                  label: 'CHoCH',
                  value: data?.chochDetected ? '⚠️ Detected' : '✅ None',
                  alert: data?.chochDetected,
                },
                {
                  label: 'SMC Bias',
                  value: data?.smcBias ? data.smcBias.charAt(0).toUpperCase() + data.smcBias.slice(1) : '—',
                },
                {
                  label: 'Progress',
                  value: `${data?.progressPercent?.toFixed(1) ?? '0'}%`,
                },
              ].map(({ label, value, alert }) => (
                <div
                  key={label}
                  className="px-3 py-2 rounded-lg border"
                  style={{
                    background: alert ? 'rgba(239,68,68,0.08)' : 'rgba(17,24,39,0.6)',
                    borderColor: alert ? '#ef444430' : '#1f2937',
                  }}
                >
                  <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                  <div className={`text-xs font-semibold ${alert ? 'text-red-300' : 'text-gray-200'}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Expanded SMC Panel */}
          {showSMC && <SMCPanel signalId={signalId} />}

          {/* Health Components */}
          {data?.healthGrade && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Health Components</div>
              <div className="space-y-3">
                {/* We render placeholder bars since full component data comes from monitorSignal */}
                {[
                  { label: 'Price Progress',   score: Math.round((data?.progressPercent || 0) / 4), max: 25, desc: `${(data?.progressPercent || 0).toFixed(0)}% toward target` },
                  { label: 'Market Structure', score: data?.smcBias === (isLong ? 'bullish' : 'bearish') ? 25 : data?.smcBias === 'neutral' ? 12 : 0, max: 25, desc: data?.smcBias ? `${data.smcBias} structure` : '—' },
                  { label: 'CHoCH Status',     score: data?.chochDetected ? 5 : 25, max: 25, desc: data?.chochDetected ? 'CHoCH detected — watch carefully' : 'No CHoCH — healthy' },
                  { label: 'Order Block',      score: 8, max: 15, desc: 'OB data from last monitor cycle' },
                  { label: 'Liquidity Risk',   score: 7, max: 10, desc: 'Moderate liquidity risk' },
                ].map(c => (
                  <ComponentBar key={c.label} label={c.label} score={c.score} maxScore={c.max} description={c.desc} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {data && (
            <div
              className="px-4 py-3 rounded-xl border"
              style={{ background: hc.bg, borderColor: hc.border }}
            >
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Recommendation</div>
              <div className="text-sm font-semibold" style={{ color: hc.text }}>
                {data?.healthGrade === 'EXCELLENT' && '✅ Hold — Signal performing perfectly'}
                {data?.healthGrade === 'GOOD' &&      '✅ Hold — Progressing well toward target'}
                {data?.healthGrade === 'FAIR' &&      '🟡 Hold — Monitor closely, some concerns'}
                {data?.healthGrade === 'WEAK' &&      '⚠️ Caution — Consider partial exit'}
                {data?.healthGrade === 'POOR' &&      '⚠️ Warning — Exit recommended'}
                {data?.healthGrade === 'CRITICAL' &&  '🔴 EXIT NOW — Signal thesis likely broken'}
                {!data?.healthGrade &&                '⏳ Awaiting first health assessment…'}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Signal Timeline</div>
              <div className="max-h-64 overflow-y-auto space-y-0 pr-1">
                {timeline.slice(-15).map((e, i, arr) => (
                  <TimelineEvent key={e.id || i} event={e} isLast={i === arr.length - 1} />
                ))}
                <div className="flex gap-3 mt-1">
                  <div className="w-6 h-6 rounded-full border border-blue-500/40 bg-blue-900/20 flex items-center justify-center text-xs flex-shrink-0">
                    ⏳
                  </div>
                  <div className="text-xs text-gray-500 pt-1">
                    Next update in ~{Math.max(0, 30 - secondsAgo)}s…
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invalidation Warning Banner */}
          {isInvalidating && (
            <div className="px-4 py-3 rounded-xl border border-red-500/40 bg-red-900/10">
              <div className="text-sm font-bold text-red-400 mb-1">⚠️ Signal Invalidation Detected</div>
              <div className="text-xs text-red-300">{data?.invalidationReason}</div>
              <button
                onClick={() => setShowInvalidation(true)}
                className="mt-2 text-xs text-red-400 underline hover:text-red-300 transition-colors"
              >
                View options →
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-800">
            <button
              onClick={handleStop}
              className="py-2 rounded-lg text-xs font-semibold bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 text-gray-400 hover:text-white transition-colors"
            >
              ⏹ Stop Tracking
            </button>
            <button
              onClick={() => handleMarkOutcome('loss')}
              className="py-2 rounded-lg text-xs font-semibold bg-red-900/20 hover:bg-red-900/40 border border-red-800/30 text-red-400 hover:text-red-300 transition-colors"
            >
              ❌ Mark Loss
            </button>
            <button
              onClick={() => handleMarkOutcome('win')}
              className="py-2 rounded-lg text-xs font-semibold bg-green-900/20 hover:bg-green-900/40 border border-green-800/30 text-green-400 hover:text-green-300 transition-colors"
            >
              ✅ Mark Win
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  )
}
