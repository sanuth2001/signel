'use client'
// Prompt 24/37/SMC — History Table with outcome modal, sort, filter, pagination, tracking
import React, { useState, useMemo, useCallback } from 'react'
import { formatPrice, formatPercent, timeAgo } from '../lib/utils/formatters'
import { getSignalColor } from '../lib/utils/formatters'

const PAGE_SIZE = 10

function OutcomeModal({ signal, onClose, onSubmit }) {
  const [closePrice, setClosePrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)

  const handlePriceChange = (price) => {
    setClosePrice(price)
    const p = parseFloat(price)
    if (p && signal?.entryPrice) {
      const pnl = ((p - signal.entryPrice) / signal.entryPrice) * 100 * (signal.signal === 'SELL' ? -1 : 1)
      setPreview(parseFloat(pnl.toFixed(2)))
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async (outcome) => {
    const price = parseFloat(closePrice)
    if (!price) return
    setSubmitting(true)
    await onSubmit(signal.id, outcome, price)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-gray-700/50 bg-gray-900 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/30">
          <h3 className="text-white font-bold">Record Trade Outcome</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-400">
            <span className="font-bold text-white">{signal?.coin}</span> {signal?.signal} @ Entry: <span className="text-blue-300">{formatPrice(signal?.entryPrice)}</span>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Close Price (USD)</label>
            <input
              type="number"
              value={closePrice}
              onChange={e => handlePriceChange(e.target.value)}
              placeholder={`Entry was ${signal?.entryPrice}`}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none"
              id="outcome-close-price"
            />
          </div>

          {preview !== null && (
            <div className={`px-4 py-2 rounded-xl text-center font-bold ${preview >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {preview >= 0 ? '▲' : '▼'} {Math.abs(preview).toFixed(2)}% {preview >= 0 ? 'profit' : 'loss'}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => handleSubmit('win')}
              disabled={!closePrice || submitting}
              id="outcome-win-btn"
              className="py-2.5 rounded-xl text-sm font-bold transition-colors bg-green-900/40 hover:bg-green-900/70 border border-green-700/40 text-green-300 disabled:opacity-40"
            >
              ✅ Win
            </button>
            <button
              onClick={() => handleSubmit('loss')}
              disabled={!closePrice || submitting}
              id="outcome-loss-btn"
              className="py-2.5 rounded-xl text-sm font-bold transition-colors bg-red-900/40 hover:bg-red-900/70 border border-red-700/40 text-red-300 disabled:opacity-40"
            >
              ❌ Loss
            </button>
            <button
              onClick={onClose}
              className="py-2.5 rounded-xl text-sm transition-colors bg-gray-800 hover:bg-gray-700 text-gray-400"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HistoryTable({ signals = [], onSelectSignal, onUpdateOutcome }) {
  const [expandedId, setExpandedId] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [outcomeModal, setOutcomeModal] = useState(null)
  const [sortCol, setSortCol] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')
  const [filterCoin, setFilterCoin] = useState('all')
  const [filterSignal, setFilterSignal] = useState('all')
  const [filterOutcome, setFilterOutcome] = useState('all')
  const [page, setPage] = useState(0)

  const handleOutcome = async (id, outcome, closePrice) => {
    setUpdating(id)
    try {
      await fetch('/api/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, outcome, closePrice }),
      })
      if (onUpdateOutcome) onUpdateOutcome()
    } catch (e) {
      console.error(e)
    }
    setUpdating(null)
  }

  const handleTrack = useCallback(async (signal, e) => {
    e.stopPropagation()
    const id = signal.id
    setUpdating(id)
    try {
      const isTracking = !!signal.isTracking
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId: id, action: isTracking ? 'stop' : 'start' }),
      })
      if (onUpdateOutcome) onUpdateOutcome() // refresh list
    } catch (e) {
      console.error(e)
    }
    setUpdating(null)
  }, [onUpdateOutcome])

  const coins = useMemo(() => ['all', ...new Set(signals.map(s => s.coin).filter(Boolean))], [signals])
  const signalTypes = ['all', 'BUY', 'SELL', 'HOLD']
  const outcomeTypes = ['all', 'win', 'loss', 'pending', 'invalidated']

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(0)
  }

  const filtered = useMemo(() => {
    let s = [...signals]
    if (filterCoin !== 'all') s = s.filter(x => x.coin === filterCoin)
    if (filterSignal !== 'all') s = s.filter(x => x.signal === filterSignal)
    if (filterOutcome !== 'all') s = s.filter(x => (x.outcome || 'pending') === filterOutcome)

    s.sort((a, b) => {
      let va, vb
      if (sortCol === 'confidence') { va = a.confidence || 0; vb = b.confidence || 0 }
      else if (sortCol === 'pnl') { va = a.pnlPercent || -999; vb = b.pnlPercent || -999 }
      else { va = new Date(a.timestamp || 0).getTime(); vb = new Date(b.timestamp || 0).getTime() }
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return s
  }, [signals, filterCoin, filterSignal, filterOutcome, sortCol, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const outcomeColors = {
    win: 'text-green-400 bg-green-900/20 border border-green-700/30',
    loss: 'text-red-400 bg-red-900/20 border border-red-700/30',
    invalidated: 'text-orange-400 bg-orange-900/20 border border-orange-700/30',
    pending: 'text-blue-400 bg-blue-900/20 border border-blue-700/30',
    'n/a': 'text-gray-500 bg-gray-800/40 border border-gray-700/20',
  }

  const SortBtn = ({ col, label }) => (
    <button onClick={() => handleSort(col)} className={`text-xs uppercase tracking-wider hover:text-white transition-colors ${sortCol === col ? 'text-blue-400' : 'text-gray-500'}`}>
      {label} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </button>
  )

  return (
    <>
      {outcomeModal && (
        <OutcomeModal
          signal={outcomeModal}
          onClose={() => setOutcomeModal(null)}
          onSubmit={handleOutcome}
        />
      )}

      <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 overflow-hidden backdrop-blur-sm">
        {/* Header + Filters */}
        <div className="p-4 border-b border-gray-700/30 space-y-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">Signal History</h3>

          <div className="flex flex-wrap gap-2">
            {/* Coin filter */}
            <select value={filterCoin} onChange={e => { setFilterCoin(e.target.value); setPage(0) }}
              className="text-xs bg-gray-800 border border-gray-700/40 text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              id="history-filter-coin">
              {coins.map(c => <option key={c} value={c}>{c === 'all' ? 'All Coins' : c}</option>)}
            </select>

            {/* Signal filter */}
            <select value={filterSignal} onChange={e => { setFilterSignal(e.target.value); setPage(0) }}
              className="text-xs bg-gray-800 border border-gray-700/40 text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              id="history-filter-signal">
              {signalTypes.map(s => <option key={s} value={s}>{s === 'all' ? 'All Signals' : s}</option>)}
            </select>

            {/* Outcome filter */}
            <select value={filterOutcome} onChange={e => { setFilterOutcome(e.target.value); setPage(0) }}
              className="text-xs bg-gray-800 border border-gray-700/40 text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              id="history-filter-outcome">
              {outcomeTypes.map(o => <option key={o} value={o}>{o === 'all' ? 'All Outcomes' : o}</option>)}
            </select>

            <span className="text-xs text-gray-500 ml-auto self-center">{filtered.length} signals</span>
          </div>
        </div>

        {paged.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No signals match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/30">
                  <th className="text-left p-3"><SortBtn col="timestamp" label="Time" /></th>
                  <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Coin</th>
                  <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Signal</th>
                  <th className="text-left p-3"><SortBtn col="confidence" label="Conf" /></th>
                  <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Outcome</th>
                  <th className="text-left p-3"><SortBtn col="pnl" label="P&L" /></th>
                  <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Health</th>
                  <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(s => (
                  <React.Fragment key={s.id}>
                    <tr
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                      onClick={() => { setExpandedId(expandedId === s.id ? null : s.id); if (onSelectSignal) onSelectSignal(s) }}
                    >
                      <td className="p-3 text-gray-400 text-xs">{timeAgo(s.timestamp)}</td>
                      <td className="p-3 font-semibold text-white">{s.coin}</td>
                      <td className="p-3"><span className="font-bold text-sm" style={{ color: getSignalColor(s.signal) }}>{s.signal}</span></td>
                      <td className="p-3 text-gray-300">{s.confidence}%</td>
                      <td className="p-3">
                        {s.signal === 'HOLD' ? (
                          <span className="text-xs text-gray-600">—</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            s.invalidationReason && s.outcome === 'pending'
                              ? outcomeColors.invalidated
                              : (outcomeColors[s.outcome] || outcomeColors.pending)
                          }`}>
                            {s.invalidationReason && s.outcome === 'pending' ? 'invalidated' : (s.outcome || 'pending')}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.pnlPercent !== null && s.pnlPercent !== undefined && s.signal !== 'HOLD' ? (
                          <span className={s.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}>{formatPercent(s.pnlPercent)}</span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Health column */}
                      <td className="p-3">
                        {s.signal !== 'HOLD' && s.currentHealth != null ? (
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                s.currentHealth >= 75 ? 'rgba(34,197,94,0.12)' :
                                s.currentHealth >= 45 ? 'rgba(234,179,8,0.12)' :
                                'rgba(239,68,68,0.12)',
                              color:
                                s.currentHealth >= 75 ? '#22c55e' :
                                s.currentHealth >= 45 ? '#eab308' :
                                '#ef4444',
                            }}
                          >
                            {s.currentHealth}% {s.healthGrade ? s.healthGrade.slice(0, 4) : ''}
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {s.signal !== 'HOLD' && (!s.outcome || s.outcome === 'pending') ? (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); setOutcomeModal(s) }}
                                disabled={updating === s.id}
                                className="px-2 py-1 text-xs bg-blue-900/40 hover:bg-blue-900/70 border border-blue-700/40 text-blue-300 rounded-md transition-colors"
                              >
                                Record
                              </button>
                              <button
                                onClick={e => handleTrack(s, e)}
                                disabled={updating === s.id}
                                id={`history-track-${s.id}`}
                                className={`px-2 py-1 text-xs rounded-md border transition-all duration-200 ${
                                  s.isTracking
                                    ? 'bg-green-900/30 border-green-700/40 text-green-400 hover:bg-red-900/30 hover:border-red-700/40 hover:text-red-400'
                                    : 'bg-gray-800/60 border-gray-700/40 text-gray-400 hover:bg-purple-900/30 hover:border-purple-700/40 hover:text-purple-300'
                                }`}
                                title={s.isTracking ? 'Stop tracking' : 'Track this signal'}
                              >
                                {updating === s.id ? '⏳' : s.isTracking ? '🟢 Live' : '📍 Track'}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === s.id && (
                      <tr key={`${s.id}-detail`} className="bg-gray-800/20">
                        <td colSpan={7} className="p-4">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-gray-500 mb-1">Entry / Stop / Target</div>
                              <div className="text-gray-200">{formatPrice(s.entryPrice)} / {formatPrice(s.stopLoss)} / {formatPrice(s.target)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">Regime</div>
                              <div className="text-gray-200 capitalize">{s.regime?.replace('_', ' ') || 'N/A'}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-gray-500 mb-1">Reasoning</div>
                              <div className="text-gray-300 italic">{s.reasoning || 'No reasoning recorded'}</div>
                            </div>
                            {s.postMortem && (
                              <div className="col-span-2">
                                <div className="text-red-400 mb-1">Post-Mortem</div>
                                <div className="text-gray-300">{(() => { try { return JSON.parse(s.postMortem)?.mainReason } catch { return s.postMortem } })()}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-3 border-t border-gray-700/30">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >← Prev</button>
            <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >Next →</button>
          </div>
        )}
      </div>
    </>
  )
}
