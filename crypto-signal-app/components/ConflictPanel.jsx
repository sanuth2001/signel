'use client'
// Prompt 27 — Conflict Detection Panel
import React from 'react'

const strengthColors = {
  strong: { bg: 'bg-opacity-30', text: '' },
  medium: { bg: 'bg-opacity-20', text: '' },
  weak: { bg: 'bg-opacity-10', text: '' },
}

const strengthDots = {
  strong: 3,
  medium: 2,
  weak: 1,
}

function SignalRow({ name, strength, type }) {
  const color = type === 'bullish' ? '#22c55e' : '#ef4444'
  const dots = strengthDots[strength] || 1
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-white/5 transition-colors">
      <div className="flex gap-0.5">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: i < dots ? color : '#374151', opacity: i < dots ? 1 : 0.3 }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-300 flex-1 truncate" title={name}>{name}</span>
      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}18`, color }}>
        {strength}
      </span>
    </div>
  )
}

export default function ConflictPanel({ conflicts, visible = true }) {
  if (!conflicts || !visible) return null

  const { bullishSignals = [], bearishSignals = [], conflictLevel, dominantSide, bullishScore, bearishScore, conflictReason, recommendation } = conflicts

  if (bullishSignals.length === 0 && bearishSignals.length === 0) return null

  const levelColors = {
    high: { color: '#ef4444', label: 'High Conflict', bg: '#ef444418' },
    medium: { color: '#f97316', label: 'Medium Conflict', bg: '#f9731618' },
    low: { color: '#eab308', label: 'Low Conflict', bg: '#eab30818' },
    none: { color: '#22c55e', label: 'Aligned', bg: '#22c55e18' },
  }
  const level = levelColors[conflictLevel] || levelColors.none

  const weightMap = { very_strong: 3, strong: 3, medium: 2, weak: 1 }
  const computedBullish = bullishScore || bullishSignals.reduce((s, x) => s + (weightMap[x.strength] || 1), 0)
  const computedBearish = bearishScore || bearishSignals.reduce((s, x) => s + (weightMap[x.strength] || 1), 0)

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/30">
        <div className="flex items-center gap-2">
          <span className="text-gray-200 text-sm font-semibold">⚖️ Signal Conflict Analysis</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: level.bg, color: level.color }}>
            {level.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: '#22c55e' }}>🟢 {computedBullish}pts</span>
          <span className="text-gray-600">vs</span>
          <span style={{ color: '#ef4444' }}>🔴 {computedBearish}pts</span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-px bg-gray-700/20 p-0">
        {/* Bullish */}
        <div className="bg-gray-900/80 p-3">
          <div className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
            <span>▲</span>
            <span>BULLISH ({bullishSignals.length})</span>
          </div>
          {bullishSignals.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No bullish signals</p>
          ) : (
            <div className="space-y-0.5">
              {bullishSignals.map((s, i) => <SignalRow key={i} name={s.name} strength={s.strength} type="bullish" />)}
            </div>
          )}
        </div>

        {/* Bearish */}
        <div className="bg-gray-900/80 p-3">
          <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
            <span>▼</span>
            <span>BEARISH ({bearishSignals.length})</span>
          </div>
          {bearishSignals.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No bearish signals</p>
          ) : (
            <div className="space-y-0.5">
              {bearishSignals.map((s, i) => <SignalRow key={i} name={s.name} strength={s.strength} type="bearish" />)}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-700/30">
        <p className="text-xs text-gray-400">{recommendation}</p>
      </div>
    </div>
  )
}
