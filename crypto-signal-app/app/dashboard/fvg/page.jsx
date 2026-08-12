'use client'
import { useState, useEffect, useCallback } from 'react'
import FVGMap from '../../../components/fvg/FVGMap'
import FVGSignalCard from '../../../components/fvg/FVGSignalCard'
import FVGAnalysisPanel from '../../../components/fvg/FVGAnalysisPanel'
import FVGChart from '../../../components/fvg/FVGChart'
import FVGScannerStatus from '../../../components/fvg/FVGScannerStatus'
import FVGHistory from '../../../components/fvg/FVGHistory'
import FVGDetailModal from '../../../components/fvg/FVGDetailModal'

export default function FVGDashboardPage() {
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastScanTime, setLastScanTime] = useState(null)
  const [loading, setLoading] = useState(true)

  // Data states
  const [fvgScanData, setFvgScanData] = useState(null)
  const [activeSignal, setActiveSignal] = useState(null)
  const [watchingStatus, setWatchingStatus] = useState(null)
  const [activeMap, setActiveMap] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [accuracyData, setAccuracyData] = useState(null)

  // Selected FVG for detail modal
  const [selectedModalFVG, setSelectedModalFVG] = useState(null)

  const fetchFVGScan = useCallback(async (coin = selectedCoin) => {
    try {
      const res = await fetch(`/api/fvg/scan?coin=${coin}`)
      const data = await res.json()
      if (data.success) {
        setFvgScanData(data)
      }
    } catch (e) {
      console.warn('[fvgDashboard] scan fetch failed:', e)
    }
  }, [selectedCoin])

  const fetchFVGSignal = useCallback(async (coin = selectedCoin) => {
    try {
      const res = await fetch(`/api/fvg/signal?coin=${coin}`)
      const data = await res.json()
      if (data.success) {
        if (data.status === 'signal_generated') {
          setActiveSignal(data.signal)
          setWatchingStatus(null)
        } else {
          setActiveSignal(null)
          setWatchingStatus(data)
        }
      }
    } catch (e) {
      console.warn('[fvgDashboard] signal fetch failed:', e)
    }
  }, [selectedCoin])

  const fetchActiveMap = useCallback(async () => {
    try {
      const res = await fetch('/api/fvg/active')
      const data = await res.json()
      if (data.success) {
        setActiveMap(data)
      }
    } catch (e) {
      console.warn('[fvgDashboard] active map fetch failed:', e)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/fvg/history?limit=50')
      const data = await res.json()
      if (data.success) {
        setHistoryData(data.history || [])
        setAccuracyData(data.accuracy || null)
      }
    } catch (e) {
      console.warn('[fvgDashboard] history fetch failed:', e)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchFVGScan(selectedCoin),
      fetchFVGSignal(selectedCoin),
      fetchActiveMap(),
      fetchHistory()
    ])
    setLastScanTime(new Date())
    setLoading(false)
  }, [selectedCoin, fetchFVGScan, fetchFVGSignal, fetchActiveMap, fetchHistory])

  // Initial load
  useEffect(() => {
    refreshAll()
  }, [selectedCoin, refreshAll])

  // Auto-refresh interval (30 seconds)
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      refreshAll()
    }, 30000)
    return () => clearInterval(timer)
  }, [autoRefresh, refreshAll])

  const currentPrice = fvgScanData?.currentPrice || 68260

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">

      {/* NAVIGATION & TOP BANNER */}
      <header className="rounded-2xl border border-gray-800 bg-gray-900/90 backdrop-blur-xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="text-amber-400">⚡</span> FVG SIGNAL SYSTEM
            </h1>
            <span className="px-3 py-0.5 text-xs font-black bg-gradient-to-r from-amber-500 to-emerald-500 text-gray-950 rounded-full shadow-md">
              SMC INSTITUTIONAL IMBALANCE
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Fair Value Gap Entry System — Catches price entering institutional demand/supply zones with full SMC confirmation
          </p>
        </div>

        {/* Navigation Bar Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
          <a href="/dashboard" className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors rounded-lg">
            📊 Dashboard
          </a>
          <a href="/dashboard/smc" className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-amber-400 transition-colors rounded-lg flex items-center gap-1">
            🏦 SMC Supreme
          </a>
          <a href="/dashboard/fvg" className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-md shadow-blue-900/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            ⚡ FVG Signals
          </a>
          <a href="/dashboard/backtest" className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors rounded-lg">
            📈 Backtest
          </a>
          <a href="/dashboard/insights" className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors rounded-lg">
            🧠 Insights
          </a>
        </div>
      </header>

      {/* CONTROL BAR: COIN SELECTOR & REFRESH STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-2xl border border-gray-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Coin:</span>
          {['BTC', 'ETH', 'SOL', 'BNB'].map(coin => (
            <button
              key={coin}
              onClick={() => setSelectedCoin(coin)}
              className={`px-4 py-1.5 text-xs font-bold font-mono rounded-xl transition-all ${
                selectedCoin === coin
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 border border-blue-400/30'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-700/60'
              }`}
            >
              {coin}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <span>Last scan:</span>
            <span className="font-mono font-bold text-white">
              {lastScanTime ? lastScanTime.toLocaleTimeString() : 'Just now'}
            </span>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 border ${
              autoRefresh
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`}></span>
            Auto-refresh: {autoRefresh ? 'ON (30s)' : 'OFF'}
          </button>

          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md flex items-center gap-1"
          >
            {loading ? 'Scanning...' : '🔄 Scan Now'}
          </button>
        </div>
      </div>

      {/* SECTION 1: MARKET FVG MAP */}
      <FVGMap
        fvgScan={fvgScanData}
        currentPrice={currentPrice}
        onSelectFVG={(fvg) => setSelectedModalFVG(fvg)}
      />

      {/* SECTION 2: ACTIVE FVG SIGNAL CARD & SCANNER STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FVGSignalCard
          signal={activeSignal}
          watchingStatus={watchingStatus}
          onRefresh={refreshAll}
          onTrack={() => alert(`Tracking FVG trade for ${selectedCoin}!`)}
        />

        <FVGScannerStatus
          activeMap={activeMap}
          onManualScan={refreshAll}
        />
      </div>

      {/* SECTION 3: FVG ANALYSIS BREAKDOWN */}
      <FVGAnalysisPanel
        signal={activeSignal}
        fvgScan={fvgScanData}
      />

      {/* SECTION 4: FVG CHART */}
      <FVGChart
        fvgScan={fvgScanData}
        currentPrice={currentPrice}
        selectedFVG={selectedModalFVG}
      />

      {/* SECTION 5: FVG SIGNAL HISTORY TABLE */}
      <FVGHistory
        history={historyData}
        accuracy={accuracyData}
      />

      {/* DETAIL MODAL POPUP */}
      {selectedModalFVG && (
        <FVGDetailModal
          fvg={selectedModalFVG}
          onClose={() => setSelectedModalFVG(null)}
          onGenerateSignal={() => {
            fetchFVGSignal(selectedCoin)
          }}
        />
      )}

    </div>
  )
}
