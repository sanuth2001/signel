'use client'
// Prompt 26 — Settings Panel (Position Size Calculator + Capital/Risk Settings)
import React, { useState, useEffect } from 'react'
import { calculatePositionSize, formatPrice } from '../lib/utils/formatters'

const RISK_PRESETS = [
  { label: 'Conservative', value: 1, desc: '1% risk' },
  { label: 'Moderate', value: 2, desc: '2% risk' },
  { label: 'Aggressive', value: 3, desc: '3% risk' },
]

export default function SettingsPanel({ isOpen, onClose, onSave, currentFundingRate = 0.0001 }) {
  const [capital, setCapital] = useState(10000)
  const [riskPercent, setRiskPercent] = useState(2)
  const [maxDailyLoss, setMaxDailyLoss] = useState(5)
  const [positionSizeUSD, setPositionSizeUSD] = useState(10000)
  const [holdingPeriod, setHoldingPeriod] = useState(24)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('signal_settings') || '{}')
      if (saved.capital) setCapital(saved.capital)
      if (saved.riskPercent) setRiskPercent(saved.riskPercent)
      if (saved.maxDailyLoss) setMaxDailyLoss(saved.maxDailyLoss)
    } catch (e) {}
  }, [isOpen])

  const handleSave = () => {
    const settings = { capital, riskPercent, maxDailyLoss }
    try {
      localStorage.setItem('signal_settings', JSON.stringify(settings))
    } catch (e) {}
    if (onSave) onSave(settings)
    onClose()
  }

  const riskAmount = (capital * riskPercent / 100).toFixed(2)
  const maxDailyLossAmount = (capital * maxDailyLoss / 100).toFixed(2)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/30">
          <h2 className="text-white font-bold text-lg">⚙️ Trading Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Capital */}
          <div>
            <label className="text-sm text-gray-400 font-medium block mb-2">Portfolio Capital (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={capital}
                onChange={e => setCapital(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700/50 text-white focus:border-blue-500 focus:outline-none transition-colors"
                min="100"
                step="1000"
                id="settings-capital"
              />
            </div>
          </div>

          {/* Risk % */}
          <div>
            <label className="text-sm text-gray-400 font-medium block mb-2">
              Risk Per Trade: <span className="text-white font-bold">{riskPercent}%</span>
              <span className="text-orange-400 ml-2">(max loss: ${riskAmount})</span>
            </label>

            {/* Presets */}
            <div className="flex gap-2 mb-3">
              {RISK_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setRiskPercent(p.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${riskPercent === p.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={riskPercent}
              onChange={e => setRiskPercent(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
              id="settings-risk-slider"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0.5% (Safe)</span>
              <span>5% (Standard)</span>
              <span>10% (Max)</span>
            </div>
          </div>

          {/* Max Daily Loss */}
          <div>
            <label className="text-sm text-gray-400 font-medium block mb-2">
              Max Daily Loss: <span className="text-white font-bold">{maxDailyLoss}%</span>
              <span className="text-red-400 ml-2">(${maxDailyLossAmount})</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={maxDailyLoss}
              onChange={e => setMaxDailyLoss(parseInt(e.target.value))}
              className="w-full accent-red-500"
              id="settings-max-loss-slider"
            />
          </div>

          {/* Summary Card */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/30 p-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Risk Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-400 text-xs">Portfolio</div>
                <div className="text-white font-semibold">${capital?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Risk/Trade</div>
                <div className="text-orange-400 font-semibold">${riskAmount}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Max Daily Loss</div>
                <div className="text-red-400 font-semibold">${maxDailyLossAmount}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Max Trades/Day</div>
                <div className="text-white font-semibold">{Math.floor(maxDailyLoss / riskPercent)}</div>
              </div>
            </div>
          </div>

          {/* Funding Cost Calculator */}
          {(() => {
            const periods = holdingPeriod / 8
            const totalCostUSD = positionSizeUSD * currentFundingRate * periods
            const costPct = currentFundingRate * periods * 100

            return (
              <div className="rounded-xl bg-gray-800/60 border border-gray-700/30 p-4 space-y-4">
                <h3 className="text-xs text-gray-500 uppercase tracking-wider">💰 Funding Cost Calculator</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Position Size (USD)</label>
                    <input
                      type="number"
                      value={positionSizeUSD}
                      onChange={e => setPositionSizeUSD(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Holding Period</label>
                    <select
                      value={holdingPeriod}
                      onChange={e => setHoldingPeriod(parseInt(e.target.value) || 8)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value={8}>8 Hours</option>
                      <option value={24}>24 Hours (1 Day)</option>
                      <option value={72}>72 Hours (3 Days)</option>
                      <option value={168}>168 Hours (7 Days)</option>
                      <option value={720}>720 Hours (30 Days)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-950/40 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Funding Rate (8h):</span>
                    <span className="font-mono text-gray-300">{(currentFundingRate * 100).toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Est. Fee (USD):</span>
                    <span className={`font-mono font-bold ${totalCostUSD >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {totalCostUSD >= 0 ? `$${totalCostUSD.toFixed(2)}` : `-$${Math.abs(totalCostUSD).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Est. Fee (%):</span>
                    <span className="font-mono text-white">{Math.abs(costPct).toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Break-even Move:</span>
                    <span className="font-mono text-white">±{Math.abs(costPct).toFixed(4)}%</span>
                  </div>
                  {Math.abs(costPct) > 0.3 && (
                    <div className="text-[10px] text-red-400 font-semibold pt-1 border-t border-gray-800/40">
                      ⚠️ High holding cost — cover move target is elevated.
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700/30 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            id="settings-save-btn"
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
