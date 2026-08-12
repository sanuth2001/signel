'use client'
// Prompt 30 — Weekly Performance Report / Insights Page
import React, { useState, useEffect } from 'react'
import { formatPercent } from '../../../lib/utils/formatters'

const GRADE_CONFIG = {
  'A': { color: '#22c55e', bg: '#22c55e18', label: 'Excellent', icon: '🏆' },
  'B': { color: '#3b82f6', bg: '#3b82f618', label: 'Good', icon: '🟢' },
  'C': { color: '#eab308', bg: '#eab30818', label: 'Average', icon: '🟡' },
  'D': { color: '#ef4444', bg: '#ef444418', label: 'Needs Work', icon: '🔴' },
  'N/A': { color: '#6b7280', bg: '#6b728018', label: 'No Data', icon: '📊' },
}

export default function InsightsPage() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/memory?type=weekly')
      .then(r => r.json())
      .then(data => {
        setReport(data.report)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Generating weekly report with AI…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-xl mb-2">⚠️ Report generation failed</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const grade = report?.weeklyGrade || 'N/A'
  const gradeConf = GRADE_CONFIG[grade] || GRADE_CONFIG['N/A']
  const s = report?.summary || {}

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Weekly Performance Report</h1>
            <p className="text-gray-500 text-sm mt-1">
              {report?.generatedAt ? `Generated ${new Date(report.generatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <a href="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">← Dashboard</a>
            <span className="text-gray-600">•</span>
            <a href="/dashboard/smc" className="text-amber-400 hover:text-amber-300 transition-colors">🏦 SMC Supreme</a>
            <span className="text-gray-600">•</span>
            <a href="/dashboard/fvg" className="text-amber-400 hover:text-amber-300 transition-colors">⚡ FVG Signals</a>
          </div>
        </div>

        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: gradeConf.color + '40', backgroundColor: gradeConf.bg }}>
          <div className="text-6xl font-black mb-2" style={{ color: gradeConf.color }}>{grade}</div>
          <div className="text-lg font-semibold text-gray-200">{gradeConf.icon} {gradeConf.label} Performance</div>
          {report?.motivationalNote && (
            <p className="text-gray-400 text-sm mt-3 italic">"{report.motivationalNote}"</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Signals Fired', value: s.signalsFired || 0, color: '#3b82f6' },
            { label: 'Win Rate', value: `${s.winRate || 0}%`, color: s.winRate >= 60 ? '#22c55e' : s.winRate >= 40 ? '#eab308' : '#ef4444' },
            { label: 'Wins / Losses', value: `${s.wins || 0} / ${s.losses || 0}`, color: '#22c55e' },
            { label: 'Avg Confidence', value: `${s.avgConfidence || 0}%`, color: '#8b5cf6' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-gray-900/80 border border-gray-700/30 p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-gray-500 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {(report?.bestTrade || report?.worstTrade) && (
          <div className="grid grid-cols-2 gap-4">
            {report.bestTrade && (
              <div className="rounded-xl bg-green-900/20 border border-green-700/30 p-4">
                <div className="text-xs text-green-400 uppercase tracking-wider mb-2">Best Trade</div>
                <div className="text-2xl font-bold text-green-400">+{report.bestTrade.pnlPercent?.toFixed(2)}%</div>
                <div className="text-sm text-gray-300">{report.bestTrade.coin} {report.bestTrade.signal}</div>
                <div className="text-xs text-gray-500 mt-1">{report.bestTrade.regime?.replace('_', ' ')}</div>
              </div>
            )}
            {report.worstTrade && (
              <div className="rounded-xl bg-red-900/20 border border-red-700/30 p-4">
                <div className="text-xs text-red-400 uppercase tracking-wider mb-2">Worst Trade</div>
                <div className="text-2xl font-bold text-red-400">{report.worstTrade.pnlPercent?.toFixed(2)}%</div>
                <div className="text-sm text-gray-300">{report.worstTrade.coin} {report.worstTrade.signal}</div>
                <div className="text-xs text-gray-500 mt-1">{report.worstTrade.regime?.replace('_', ' ')}</div>
              </div>
            )}
          </div>
        )}

        {report?.insights?.length > 0 && (
          <div className="rounded-2xl bg-gray-900/80 border border-gray-700/30 p-6">
            <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider mb-4">🧠 AI Insights</h2>
            <div className="space-y-3">
              {report.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-gray-300 text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report?.recommendations?.length > 0 && (
          <div className="rounded-2xl bg-gray-900/80 border border-amber-700/30 p-6">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">⚡ Recommendations</h2>
            <div className="space-y-3">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-amber-400 mt-0.5">→</span>
                  <p className="text-gray-300 text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 pb-4">
          Reports are AI-generated based on your historical signal data. Not financial advice.
        </p>
      </div>
    </div>
  )
}
