'use client'
import React, { useState } from 'react'
import { formatPrice, formatPercent, timeAgo } from '../lib/utils/formatters'
import { getSignalColor } from '../lib/utils/formatters'

export default function HistoryTable({ signals = [], onSelectSignal, onUpdateOutcome }) {
  const [expandedId, setExpandedId] = useState(null)
  const [updating, setUpdating] = useState(null)

  const handleOutcome = async (id, outcome, entryPrice) => {
    const closePrice = parseFloat(prompt(`Enter close price for this trade (entry was ${entryPrice}):`) || '0')
    if (!closePrice) return

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

  const outcomeColors = {
    win: 'text-green-400 bg-green-900/20',
    loss: 'text-red-400 bg-red-900/20',
    pending: 'text-gray-400 bg-gray-800/40',
  }

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-gray-700/30">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Signal History</h3>
      </div>

      {signals.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No signals yet. Click "Get Signal" to start.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/30">
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Coin</th>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Signal</th>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Conf</th>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Outcome</th>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">P&L</th>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {signals.map(s => (
                <React.Fragment key={s.id}>
                  <tr
                    key={s.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                    onClick={() => { setExpandedId(expandedId === s.id ? null : s.id); if (onSelectSignal) onSelectSignal(s) }}
                  >
                    <td className="p-3 text-gray-400 text-xs">{timeAgo(s.timestamp)}</td>
                    <td className="p-3 font-semibold text-white">{s.coin}</td>
                    <td className="p-3">
                      <span className="font-bold text-sm" style={{ color: getSignalColor(s.signal) }}>{s.signal}</span>
                    </td>
                    <td className="p-3 text-gray-300">{s.confidence}%</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${outcomeColors[s.outcome] || outcomeColors.pending}`}>
                        {s.outcome || 'pending'}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.pnlPercent !== null && s.pnlPercent !== undefined ? (
                        <span className={s.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatPercent(s.pnlPercent)}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-3">
                      {s.outcome === 'pending' && (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleOutcome(s.id, 'win', s.entryPrice)}
                            disabled={updating === s.id}
                            className="px-2 py-1 text-xs bg-green-900/40 hover:bg-green-900/70 border border-green-700/40 text-green-300 rounded-md transition-colors"
                          >Win</button>
                          <button
                            onClick={() => handleOutcome(s.id, 'loss', s.entryPrice)}
                            disabled={updating === s.id}
                            className="px-2 py-1 text-xs bg-red-900/40 hover:bg-red-900/70 border border-red-700/40 text-red-300 rounded-md transition-colors"
                          >Loss</button>
                        </div>
                      )}
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
    </div>
  )
}
