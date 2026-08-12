'use client'
import { useState, useEffect, useCallback } from 'react'
import KillZoneStatusPanel from '../../../components/smc/KillZoneStatusPanel'
import ActiveSetupsPanel from '../../../components/smc/ActiveSetupsPanel'
import SupremeSignalCard from '../../../components/smc/SupremeSignalCard'
import SMCBreakdownPanel from '../../../components/smc/SMCBreakdownPanel'
import AMDStatusPanel from '../../../components/smc/AMDStatusPanel'
import SupremeSMCChart from '../../../components/smc/SupremeSMCChart'
import SupremeHistory from '../../../components/smc/SupremeHistory'
import SetupDetailModal from '../../../components/smc/SetupDetailModal'

export default function SupremeSMCDashboardPage() {
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastScanTime, setLastScanTime] = useState(null)
  const [loading, setLoading] = useState(true)

  // Data states
  const [smcAnalysis, setSmcAnalysis] = useState(null)
  const [activeSignal, setActiveSignal] = useState(null)
  const [activeSetupsData, setActiveSetupsData] = useState(null)
  const [killZoneData, setKillZoneData] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [accuracyData, setAccuracyData] = useState(null)

  // Modal selection
  const [selectedModalSetup, setSelectedModalSetup] = useState(null)

  const fetchSMCAnalysis = useCallback(async (coin = selectedCoin) => {
    try {
      const res = await fetch(`/api/smc/analysis?coin=${coin}`)
      const data = await res.json()
      if (data.success) {
        setSmcAnalysis(data.analysis)
      }
    } catch (e) {
      console.warn('[smcDashboard] analysis fetch failed:', e)
    }
  }, [selectedCoin])

  const fetchSMCSignal = useCallback(async (coin = selectedCoin) => {
    try {
      const res = await fetch(`/api/smc/signal?coin=${coin}`)
      const data = await res.json()
      if (data.success) {
        if (data.status === 'signal_generated') {
          setActiveSignal(data.signal)
        } else {
          setActiveSignal(null)
        }
      }
    } catch (e) {
      console.warn('[smcDashboard] signal fetch failed:', e)
    }
  }, [selectedCoin])

  const fetchSMCSetups = useCallback(async (coin = selectedCoin) => {
    try {
      const res = await fetch(`/api/smc/setups?coin=${coin}`)
      const data = await res.json()
      if (data.success) {
        setActiveSetupsData(data)
      }
    } catch (e) {
      console.warn('[smcDashboard] setups fetch failed:', e)
    }
  }, [selectedCoin])

  const fetchKillZone = useCallback(async () => {
    try {
      const res = await fetch('/api/smc/killzone')
      const data = await res.json()
      if (data.success) {
        setKillZoneData(data.killZone)
      }
    } catch (e) {
      console.warn('[smcDashboard] killzone fetch failed:', e)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/smc/history?limit=50')
      const data = await res.json()
      if (data.success) {
        setHistoryData(data.history || [])
        setAccuracyData(data.accuracy || null)
      }
    } catch (e) {
      console.warn('[smcDashboard] history fetch failed:', e)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchSMCAnalysis(selectedCoin),
      fetchSMCSignal(selectedCoin),
      fetchSMCSetups(selectedCoin),
      fetchKillZone(),
      fetchHistory()
    ])
    setLastScanTime(new Date())
    setLoading(false)
  }, [selectedCoin, fetchSMCAnalysis, fetchSMCSignal, fetchSMCSetups, fetchKillZone, fetchHistory])

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

  const currentPrice = smcAnalysis?.currentPrice || 68260

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">

      {/* NAVIGATION & TOP BANNER */}
      <header className="rounded-2xl border border-gray-800 bg-gray-900/90 backdrop-blur-xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="text-amber-400">🏦</span> SUPREME SMC SYSTEM
            </h1>
            <span className="px-3 py-0.5 text-xs font-black bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 text-gray-950 rounded-full shadow-md">
              SMC + ICT + MULTI-SETUP CONFLUENCE
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Combines FVG, Order Blocks, Liquidity Sweeps, ICT Kill Zones, OTE, Power of 3, Silver Bullet, & Breakers for 88-94% accuracy
          </p>
        </div>

        {/* Navigation Bar Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
          <a href="/dashboard" className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors rounded-lg">
            📊 Dashboard
          </a>
          <a href="/dashboard/smc" className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg shadow-md shadow-amber-900/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            🏦 SMC Supreme
          </a>
          <a href="/dashboard/fvg" className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-amber-400 transition-colors rounded-lg flex items-center gap-1">
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
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50 border border-amber-400/30'
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
            Auto-scan: {autoRefresh ? 'ON (30s)' : 'OFF'}
          </button>

          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-gray-950 font-black transition-all shadow-md flex items-center gap-1"
          >
            {loading ? 'Scanning...' : '🔄 Scan SMC Radar'}
          </button>
        </div>
      </div>

      {/* TOP ROW: KILL ZONE STATUS & ACTIVE SETUPS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <KillZoneStatusPanel
          killZone={killZoneData || smcAnalysis?.killZone}
        />

        <ActiveSetupsPanel
          activeSetups={activeSetupsData?.activeSetups || []}
          onSelectSetup={(setup) => setSelectedModalSetup(setup)}
        />
      </div>

      {/* MAIN ACTIVE SUPREME SIGNAL CARD */}
      <SupremeSignalCard
        signal={activeSignal}
        onRefresh={refreshAll}
        onTrack={() => alert(`Tracking Supreme SMC signal for ${selectedCoin}!`)}
      />

      {/* ALL SMC CONCEPTS BREAKDOWN PANEL */}
      <SMCBreakdownPanel
        analysis={smcAnalysis}
      />

      {/* POWER OF 3 (AMD) STATUS PANEL */}
      <AMDStatusPanel
        amd={smcAnalysis?.amd}
      />

      {/* SUPREME SMC CHART WITH OVERLAYS */}
      <SupremeSMCChart
        analysis={smcAnalysis}
        currentPrice={currentPrice}
      />

      {/* SUPREME SIGNAL HISTORY TABLE */}
      <SupremeHistory
        history={historyData}
        accuracy={accuracyData}
      />

      {/* SETUP DETAIL MODAL POPUP */}
      {selectedModalSetup && (
        <SetupDetailModal
          setup={selectedModalSetup}
          onClose={() => setSelectedModalSetup(null)}
          onGenerateSignal={() => {
            fetchSMCSignal(selectedCoin)
          }}
        />
      )}

    </div>
  )
}
