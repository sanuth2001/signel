'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import SignalCard from '../../components/SignalCard'
import ChartPanel from '../../components/ChartPanel'
import DroughtDetector from '../../components/DroughtDetector'
import RegimeIndicator from '../../components/RegimeIndicator'
import HistoryTable from '../../components/HistoryTable'
import AccuracyStats from '../../components/AccuracyStats'
import SettingsPanel from '../../components/SettingsPanel'
import ConflictPanel from '../../components/ConflictPanel'
import RegimeHistory from '../../components/RegimeHistory'
import DivergencePanel from '../../components/DivergencePanel'
import FibonacciPanel from '../../components/FibonacciPanel'
import OpenInterestPanel from '../../components/OpenInterestPanel'
import FundingPanel from '../../components/FundingPanel'
import OnchainPanel from '../../components/OnchainPanel'
import SessionPanel from '../../components/SessionPanel'
import VisionPanel from '../../components/VisionPanel'
import PatternPanel from '../../components/PatternPanel'
import { getCurrentSession } from '../../lib/engine/sessions.js'
import { formatPrice, formatPercent, timeAgo, calculatePositionSize } from '../../lib/utils/formatters'
import { COINS, REFRESH_INTERVAL } from '../../lib/utils/constants'
import {
  requestNotificationPermission,
  sendSignalAlert,
  playAlertSound,
  getNotificationHistory,
  clearNotificationHistory,
  markAllNotificationsRead
} from '../../lib/utils/alerts'

// ─── Client-side mock price (only used as absolute last resort on client) ─────
function getClientMockPrice(selectedCoin) {
  const base = {
    BTC: 75000, ETH: 3500, SOL: 180, BNB: 580,
    XRP: 1.30, AVAX: 35, LINK: 18, ARB: 1.10, MATIC: 0.65, DOT: 6.20,
  }[selectedCoin] || 10.0
  const daily  = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
  const hourly = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
  let price = base * 0.95
  for (let i = 30; i >= 0; i--) {
    const ts = Date.now() - i * 86400000
    const change = (Math.random() - 0.49) * 0.04
    const o = price; const c = price * (1 + change)
    daily.timestamps.push(ts)
    daily.open.push(o); daily.high.push(Math.max(o, c) * 1.01)
    daily.low.push(Math.min(o, c) * 0.99); daily.close.push(c)
    daily.volume.push(base * 1e5); price = c
  }
  price = daily.close[daily.close.length - 1]
  for (let i = 48; i >= 0; i--) {
    const ts = Date.now() - i * 3600000
    const change = (Math.random() - 0.49) * 0.01
    const o = price; const c = price * (1 + change)
    hourly.timestamps.push(ts)
    hourly.open.push(o); hourly.high.push(Math.max(o, c) * 1.002)
    hourly.low.push(Math.min(o, c) * 0.998); hourly.close.push(c)
    hourly.volume.push(base * 1e4); price = c
  }
  return {
    coin: selectedCoin, currentPrice: price, priceChange24h: 1.5,
    daily, hourly, lastUpdated: new Date().toISOString(), isMock: true, isStale: false,
  }
}

// ─── Data freshness colour ────────────────────────────────────────────────────
function getFreshnessColor(isoTimestamp) {
  if (!isoTimestamp) return 'text-gray-500'
  const ageMs = Date.now() - new Date(isoTimestamp).getTime()
  const ageMin = ageMs / 60000
  if (ageMin < 5)  return 'text-green-400'
  if (ageMin < 15) return 'text-yellow-400'
  return 'text-red-400'
}

function formatFreshnessTime(isoTimestamp) {
  if (!isoTimestamp) return null
  const d = new Date(isoTimestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Panel Error Boundary ─────────────────────────────────────────────────────
function PanelError({ label, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-700/30 bg-red-900/10 p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]">
      <div className="text-2xl">⚠️</div>
      <div className="text-sm text-red-300 font-semibold text-center">{label} failed to load</div>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 rounded-lg bg-red-700/30 hover:bg-red-700/50 text-red-200 text-xs font-bold transition-all"
      >
        Retry
      </button>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonPanel({ className = '' }) {
  return <div className={`rounded-2xl bg-gray-800/50 animate-pulse ${className}`} />
}

// ─── Data quality badge ───────────────────────────────────────────────────────
function DataQualityBadge({ priceData }) {
  if (!priceData) return null
  if (priceData.isRateLimited) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 font-semibold">
        ⚠️ Rate limited — using recent data
      </span>
    )
  }
  if (priceData.isStale) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 font-semibold">
        ⚠️ Using cached data (5 min old)
      </span>
    )
  }
  if (priceData.isMock) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-900/40 border border-red-700/40 text-red-300 font-semibold">
        ⚠️ Using demo data — API unavailable
      </span>
    )
  }
  return null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [coin, setCoin] = useState('BTC')
  const [isLoading, setIsLoading]       = useState(false)  // initial load / coin switch
  const [isRefreshing, setIsRefreshing] = useState(false)  // background price refresh
  const [loading, setLoading]           = useState(false)  // signal analysis
  const [signalData, setSignalData]     = useState(null)
  const [activePriceData, setActivePriceData] = useState(null)
  const [history, setHistory]           = useState([])
  const [accuracyStats, setAccuracyStats] = useState(null)
  const [insights, setInsights]         = useState(null)
  const [error, setError]               = useState(null)
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [countdown, setCountdown]       = useState(30)
  const [activeTimeframe, setActiveTimeframe] = useState('1D')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({ confidenceThreshold: 70, riskPercent: 2, autoRefresh: true })
  const [accountSize, setAccountSize]   = useState(10000)
  const [showTier3, setShowTier3]       = useState(false)
  const [panelErrors, setPanelErrors]   = useState({}) // { panelName: errorMessage }

  // Notification system
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications]         = useState([])
  const [unreadCount, setUnreadCount]             = useState(0)

  // 24h ticker prices for selector badges
  const [coinPrices, setCoinPrices] = useState({})

  const [showSessionDetail, setShowSessionDetail] = useState(false)
  const [currentSession, setCurrentSession] = useState(null)

  useEffect(() => {
    const updateSession = () => {
      try {
        const ses = getCurrentSession()
        setCurrentSession(ses)
      } catch (e) {
        console.error(e)
      }
    }
    updateSession()
    const timer = setInterval(updateSession, 60000)
    return () => clearInterval(timer)
  }, [])

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const countdownRef        = useRef(null)
  const prevSignalRef       = useRef(null)
  const abortControllerRef  = useRef(null)  // cancel in-flight price fetches
  const activeCoinRef       = useRef(coin)  // track the coin we are currently showing

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const clearPanelError = useCallback((panelName) => {
    setPanelErrors(prev => { const next = { ...prev }; delete next[panelName]; return next })
  }, [])

  const setPanelError = useCallback((panelName, msg) => {
    setPanelErrors(prev => ({ ...prev, [panelName]: msg }))
  }, [])

  // ─── History & insights ────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      setHistory(data.signals || [])
      setAccuracyStats(data.stats || null)
    } catch (e) { console.error('History fetch error:', e) }
  }, [])

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/accuracy')
      const data = await res.json()
      setInsights(data.insights || null)
    } catch (e) { console.error('Insights fetch error:', e) }
  }, [])

  // ─── Price fetch (with AbortController + coin guard) ──────────────────────
  const fetchPrice = useCallback(async (selectedCoin, { initial = false } = {}) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    if (initial) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const res = await fetch(`/api/price?coin=${selectedCoin}`, { signal: controller.signal })
      const data = await res.json()

      // Guard: discard if user already switched to another coin
      if (activeCoinRef.current !== selectedCoin) return

      if (data.success && data.priceData) {
        setActivePriceData(data.priceData)
      } else {
        console.warn('Backend price fetch unsuccessful, using client fallback')
        if (activeCoinRef.current === selectedCoin) {
          setActivePriceData(getClientMockPrice(selectedCoin))
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return  // silently swallow
      console.warn('Backend price fetch failed, using client fallback:', e.message)
      if (activeCoinRef.current === selectedCoin) {
        setActivePriceData(getClientMockPrice(selectedCoin))
      }
    } finally {
      if (activeCoinRef.current === selectedCoin) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [])

  // ─── Signal analysis ───────────────────────────────────────────────────────
  const getSignal = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    clearPanelError('signal')
    clearPanelError('chart')

    const currentCoin = coin

    try {
      const res = await fetch(`/api/signal?coin=${currentCoin}`)
      const data = await res.json()

      if (res.status === 429) {
        setError(`Rate limited: ${data.message}`)
        return
      }
      if (res.status !== 200) {
        setError(data.message || 'Signal generation failed')
        return
      }

      // Guard: user switched coin while request was in flight
      if (activeCoinRef.current !== currentCoin) return

      setSignalData(data)

      if (data.success && data.currentPrice) {
        setActivePriceData(prev => {
          // Never merge into stale priceData from a different coin
          if (prev && prev.coin && prev.coin !== currentCoin) {
            return {
              coin: data.coin || currentCoin,
              currentPrice: data.currentPrice,
              priceChange24h: data.priceChange24h ?? 0,
              daily: prev.daily,
              hourly: prev.hourly,
              lastUpdated: data.timestamp || new Date().toISOString(),
              isStale: prev.isStale,
              isMock: prev.isMock,
            }
          }
          return {
            ...prev,
            coin: data.coin || currentCoin,
            currentPrice: data.currentPrice,
            priceChange24h: data.priceChange24h !== undefined ? data.priceChange24h : prev?.priceChange24h,
            lastUpdated: data.timestamp || new Date().toISOString(),
          }
        })
      }
      setLastUpdated(new Date().toISOString())
      setCountdown(30)
      await fetchHistory()
    } catch (e) {
      if (activeCoinRef.current === currentCoin) {
        setPanelError('signal', e.message)
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [coin, loading, fetchHistory, clearPanelError, setPanelError])

  // ─── Init from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    const savedCoin = localStorage.getItem('selected_coin')
    if (savedCoin && COINS[savedCoin]) setCoin(savedCoin)

    try {
      const saved = JSON.parse(localStorage.getItem('signal_settings') || '{}')
      if (saved.capital) setAccountSize(saved.capital)
      if (saved.riskPercent) setSettings(s => ({ ...s, riskPercent: saved.riskPercent }))
    } catch (e) {}

    const hist = getNotificationHistory()
    setNotifications(hist)
    setUnreadCount(hist.filter(n => !n.read).length)
  }, [])

  // ─── Coin switch: clear ALL state immediately, then fetch fresh ───────────
  useEffect(() => {
    activeCoinRef.current = coin
    setActivePriceData(null)
    setSignalData(null)
    setPanelErrors({})
    setError(null)
    localStorage.setItem('selected_coin', coin)
    fetchPrice(coin, { initial: true })
  }, [coin, fetchPrice])

  // ─── Poll coin-selector 24h% badges via server-side proxy (every 60 s) ────
  // NOTE: Never call CoinGecko directly from the browser — CORS will block it.
  // The /api/prices route proxies the request server-side and caches for 60 s.
  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        const res = await fetch('/api/prices')
        if (!res.ok) throw new Error(`prices proxy responded ${res.status}`)
        const data = await res.json()
        if (data.prices && Object.keys(data.prices).length > 0) {
          setCoinPrices(data.prices)
        }
        if (data.rateLimited) {
          console.warn('[dashboard] Coin prices are rate-limited; showing cached values.')
        }
      } catch (e) {
        console.warn('Failed to fetch prices for selector:', e.message)
      }
    }
    fetchAllPrices()
    const interval = setInterval(fetchAllPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  // ─── Signal alert: HOLD → BUY/SELL transition ─────────────────────────────
  useEffect(() => {
    if (signalData?.signal) {
      const prev    = prevSignalRef.current
      const current = signalData.signal
      const currentCoin = signalData.coin

      if (prev && prev.coin === currentCoin && prev.signal === 'HOLD' && (current === 'BUY' || current === 'SELL')) {
        sendSignalAlert(current, currentCoin, signalData.confidence, signalData.entryPrice, signalData.target)
        playAlertSound(current.toLowerCase())
        const hist = getNotificationHistory()
        setNotifications(hist)
        setUnreadCount(hist.filter(n => !n.read).length)
      }
      prevSignalRef.current = { coin: currentCoin, signal: current }
    }
  }, [signalData])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      const coinSymbols = Object.keys(COINS)
      const key = e.key.toLowerCase()
      if (key === 'a') { e.preventDefault(); getSignal() }
      else if (key === 's') { e.preventDefault(); setShowSettings(prev => !prev) }
      else if (key === 'h') {
        e.preventDefault()
        document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })
      } else {
        const num = parseInt(e.key)
        if (num >= 1 && num <= 9 && num <= coinSymbols.length) {
          e.preventDefault()
          setCoin(coinSymbols[num - 1])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [getSignal])

  // ─── Auto-refresh countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!settings.autoRefresh) return
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchPrice(activeCoinRef.current, { initial: false })
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [settings.autoRefresh, fetchPrice])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ─── Notification handlers ─────────────────────────────────────────────────
  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications)
    requestNotificationPermission()
    if (!showNotifications) {
      markAllNotificationsRead()
      setUnreadCount(0)
    }
    setNotifications(getNotificationHistory())
  }
  const handleMarkAllAsRead = () => {
    markAllNotificationsRead()
    setUnreadCount(0)
    setNotifications(getNotificationHistory())
  }
  const handleClearNotifications = () => {
    clearNotificationHistory()
    setUnreadCount(0)
    setNotifications([])
  }

  // ─── Derived values ────────────────────────────────────────────────────────
  const positionDetails = signalData?.entryPrice && signalData?.stopLoss
    ? calculatePositionSize(accountSize, settings.riskPercent, signalData.entryPrice, signalData.stopLoss)
    : null

  const ohlcv = activeTimeframe === '1D'
    ? (activePriceData?.daily  || signalData?.priceData?.daily  || null)
    : (activePriceData?.hourly || signalData?.priceData?.hourly || null)

  const isDrought   = signalData?.status === 'drought'
  const t1Coins     = Object.keys(COINS).filter(sym => COINS[sym].tier === 1)
  const t2Coins     = Object.keys(COINS).filter(sym => COINS[sym].tier === 2)
  const t3Coins     = Object.keys(COINS).filter(sym => COINS[sym].tier === 3)

  const getCoinLabel = (sym) => {
    const data = coinPrices[sym]
    if (!data) return sym
    const sign = data.change24h >= 0 ? '+' : ''
    return `${sym} (${sign}${data.change24h.toFixed(1)}%)`
  }

  const currentPrice   = activePriceData?.currentPrice || signalData?.currentPrice || 0
  const priceChange24h = activePriceData?.priceChange24h !== undefined
    ? activePriceData.priceChange24h
    : (signalData?.priceChange24h || 0)

  const freshnessColor = getFreshnessColor(lastUpdated)
  const freshnessTime  = formatFreshnessTime(lastUpdated)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Logo & Nav */}
          <div className="flex items-center justify-between md:justify-start gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black">₿</div>
              <div>
                <div className="font-black text-white text-sm">CryptoSignal AI</div>
                <div className="text-xs text-gray-500 font-medium">Powered by Claude</div>
              </div>
            </div>
            <nav className="flex gap-4 items-center">
              <a href="/dashboard"          className="text-xs font-bold text-white border-b-2 border-blue-600 pb-1">Dashboard</a>
              <a href="/dashboard/smc"      className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">🏦 SMC Supreme</a>
              <a href="/dashboard/fvg"      className="text-xs font-bold text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-1">⚡ FVG Signals</a>
              <a href="/dashboard/backtest" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">Backtest</a>
              <a href="/dashboard/insights" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">AI Insights</a>
            </nav>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between md:justify-end gap-4">

            {/* Status: freshness time + refreshing spinner */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {freshnessTime && (
                <span className={`hidden sm:inline font-mono ${freshnessColor}`}>
                  Data from: {freshnessTime}
                </span>
              )}
              {isRefreshing && (
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <span className="text-[10px]">Refreshing…</span>
                </span>
              )}
              {!isRefreshing && settings.autoRefresh && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {countdown}s
                </span>
              )}
            </div>
 
            {/* Session Clock Indicator */}
            {currentSession && (
              <button
                onClick={() => setShowSessionDetail(!showSessionDetail)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 border border-gray-700/30 transition-all hover:scale-105 active:scale-95 shadow-md"
                title="Click to view detailed session info"
              >
                <span className={`w-2 h-2 rounded-full ${
                  currentSession.name.includes("Overlap") || currentSession.name.includes("New York") ? 'bg-green-400 animate-pulse'
                  : currentSession.name.includes("London") ? 'bg-blue-400'
                  : currentSession.name.includes("Asia") ? 'bg-yellow-400'
                  : 'bg-red-400'
                }`} />
                <span className="hidden sm:inline">{currentSession.name.replace(' Session', '')}</span>
                <span className="font-mono text-gray-300">{currentSession.currentTime}</span>
                <span className="text-gray-500 font-mono hidden md:inline">
                  +{Math.floor(currentSession.minutesUntilSessionEnd / 60)}h {currentSession.minutesUntilSessionEnd % 60}m
                </span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="relative p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all text-sm"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-extrabold flex items-center justify-center text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 rounded-xl bg-gray-900 border border-gray-700/50 shadow-2xl p-4 z-50">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
                    <span className="font-bold text-xs text-white">Alert History</span>
                    <div className="flex gap-2.5">
                      <button onClick={handleMarkAllAsRead}     className="text-[10px] text-blue-400 hover:text-blue-300 font-bold">Read All</button>
                      <button onClick={handleClearNotifications} className="text-[10px] text-red-400 hover:text-red-300 font-bold">Clear</button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center text-gray-500 py-6 text-xs">No alerts yet</div>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} className={`p-2 rounded-lg text-xs border ${n.read ? 'bg-gray-950/40 border-gray-800' : 'bg-blue-950/20 border-blue-900/30'}`}>
                          <div className="flex justify-between font-bold mb-0.5">
                            <span className={n.type === 'BUY' ? 'text-green-400' : n.type === 'SELL' ? 'text-red-400' : 'text-yellow-400'}>
                              {n.type} — {n.coin}
                            </span>
                            <span className="text-[9px] text-gray-500 font-normal">{timeAgo(n.timestamp)}</span>
                          </div>
                          <div className="text-gray-400 leading-normal">{n.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all text-sm"
              title="Open Settings"
            >⚙️</button>

            {/* Analyze */}
            <button
              onClick={getSignal}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Analyzing…</span></>
              ) : '⚡ Analyze'}
            </button>
          </div>
        </div>
      </header>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(newSettings) => {
          setSettings(prev => ({ ...prev, ...newSettings }))
          if (newSettings.capital) setAccountSize(newSettings.capital)
        }}
        currentFundingRate={signalData?.onchainData?.funding?.current?.rate ?? 0.0001}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Tiered Coin Selector ─────────────────────────────────────────── */}
        <div className="mb-6 bg-gray-900/60 border border-gray-700/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col gap-2.5">

            {/* T1 */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-blue-400 bg-blue-950/50 border border-blue-900/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider w-8 text-center flex-shrink-0">T1</span>
              <div className="flex flex-wrap gap-1.5">
                {t1Coins.map(sym => (
                  <button key={sym} onClick={() => setCoin(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${coin === sym ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                    {getCoinLabel(sym)}
                  </button>
                ))}
              </div>
            </div>

            {/* T2 */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-purple-400 bg-purple-950/50 border border-purple-900/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider w-8 text-center flex-shrink-0">T2</span>
              <div className="flex flex-wrap gap-1.5">
                {t2Coins.map(sym => (
                  <button key={sym} onClick={() => setCoin(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${coin === sym ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                    {getCoinLabel(sym)}
                  </button>
                ))}
              </div>
            </div>

            {/* T3 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 w-8 flex-shrink-0">
                <span className="text-[10px] text-orange-400 bg-orange-950/50 border border-orange-900/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-center">T3</span>
                <button onClick={() => setShowTier3(!showTier3)} className="text-[9px] font-bold text-gray-500 hover:text-gray-300 mt-1 focus:outline-none">
                  {showTier3 ? 'Less' : 'More'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {(showTier3 ? t3Coins : t3Coins.slice(0, 2)).map(sym => (
                  <button key={sym} onClick={() => setCoin(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${coin === sym ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                    {getCoinLabel(sym)}
                  </button>
                ))}
                {!showTier3 && t3Coins.length > 2 && (
                  <button onClick={() => setShowTier3(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800/40 text-gray-500 hover:bg-gray-800 hover:text-gray-300 border border-dashed border-gray-700/40">
                    + {t3Coins.length - 2} more coins
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {/* ── Skeleton loader (initial load or coin switch) ─────────────────── */}
        {isLoading && !activePriceData && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <SkeletonPanel className="h-9 w-40" />
              <SkeletonPanel className="h-6 w-20" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SkeletonPanel className="h-72" />
              <SkeletonPanel className="h-72" />
              <SkeletonPanel className="h-72" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SkeletonPanel className="lg:col-span-2 h-80" />
              <SkeletonPanel className="h-80" />
            </div>
          </div>
        )}

        {/* ── Dashboard Content ─────────────────────────────────────────────── */}
        {activePriceData && (
          <>
            {/* Price Header */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="text-3xl font-black text-white">{formatPrice(currentPrice)}</div>
              <div className={`text-lg font-semibold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(priceChange24h)} 24h
              </div>
              <div className="text-gray-500 text-sm">{coin}/USD</div>
              <DataQualityBadge priceData={activePriceData} />
            </div>

            {/* Main Row: Signal + Regime + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Column 1: Signal Card */}
              <div className="lg:col-span-1">
                {panelErrors.signal ? (
                  <PanelError label="Signal" onRetry={() => { clearPanelError('signal'); getSignal() }} />
                ) : signalData ? (
                  isDrought ? (
                    <DroughtDetector
                      reason={signalData.droughtReason || signalData.reason}
                      regime={signalData.regime}
                      watchFor={signalData.waitingFor?.conditions?.[0]}
                      recommendedAction={signalData.recommendation || "Wait for market indicators to stabilize"}
                      sessionAnalysis={signalData.sessionAnalysis}
                    />
                  ) : (
                    <>
                      <SignalCard
                        signal={signalData.signal}
                        confidence={signalData.confidence}
                        reasoning={signalData.reasoning}
                        risk={signalData.risk}
                        stopLoss={signalData.stopLoss}
                        target={signalData.target}
                        riskReward={signalData.riskRewardRatio}
                        timeHorizon={signalData.timeHorizon}
                        keyRisk={signalData.keyRisk}
                        entryPrice={signalData.entryPrice}
                        candlePattern={signalData.candlePattern}
                        conflicts={signalData.conflicts}
                        waitingFor={signalData.waitingFor}
                        droughtReason={signalData.droughtReason}
                        warnings={signalData.warnings}
                        fibonacciPosition={signalData.fibonacci?.currentPosition}
                        signalId={signalData.savedId || null}
                        scalpSetup={signalData.scalpSetup}
                        swingSetup={signalData.swingSetup}
                      />
                      {signalData.divergences && (
                        <div className="mt-3">
                          <DivergencePanel divergences={signalData.divergences} />
                        </div>
                      )}
                      {signalData.visionAnalysis && (
                        <div className="mt-3">
                          <VisionPanel
                            visionAnalysis={signalData.visionAnalysis}
                            patternComparison={signalData.patternComparison}
                          />
                        </div>
                      )}
                      {signalData.fibonacci && (
                        <div className="mt-3">
                          <FibonacciPanel fibonacci={signalData.fibonacci} currentPrice={currentPrice} />
                        </div>
                      )}
                      {signalData.openInterest && (
                        <div id="open-interest-section" className="mt-3">
                          <OpenInterestPanel openInterest={signalData.openInterest} />
                        </div>
                      )}
                      {signalData.onchainData?.funding && (
                        <div id="funding-section" className="mt-3">
                          <FundingPanel funding={signalData.onchainData.funding} />
                        </div>
                      )}
                      {signalData.sessionAnalysis && (
                        <div id="session-section" className="mt-3">
                          <SessionPanel session={signalData.sessionAnalysis} />
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-center h-full flex flex-col justify-center items-center min-h-[300px]">
                    <div className="text-4xl mb-3">🧠</div>
                    <h3 className="font-bold text-white mb-2">AI Signal Scan Ready</h3>
                    <p className="text-xs text-gray-500 mb-6 max-w-xs leading-relaxed">
                      Click the "Analyze" button in the top right to run deep AI strategy checks, candle patterns, on-chain confluences, and whale metrics.
                    </p>
                    <button
                      onClick={getSignal}
                      disabled={loading}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                      {loading ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Scanning…</span></>
                      ) : '⚡ Scan Market with Claude'}
                    </button>
                  </div>
                )}
              </div>

              {/* Column 2: Regime */}
              <div className="flex flex-col gap-4">
                {signalData ? (
                  <>
                    <RegimeIndicator
                      regime={signalData.regime}
                      accuracy={signalData.tradeability?.accuracy}
                      description={signalData.tradeability?.reason}
                      tradeable={signalData.tradeability?.tradeable}
                      startTime={signalData.tradeability?.startTime}
                    />
                    <RegimeHistory
                      history={signalData.regimeHistory}
                      currentRegime={signalData.regime}
                    />
                  </>
                ) : (
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-center h-full flex flex-col justify-center items-center min-h-[220px]">
                    <div className="text-3xl mb-2">⚖️</div>
                    <h4 className="font-bold text-sm text-gray-300">Regime Scan Pending</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs leading-normal">Run analysis to identify trend regimes and lock trades.</p>
                  </div>
                )}
              </div>

              {/* Column 3: Accuracy Stats */}
              <div>
                <AccuracyStats stats={accuracyStats} insights={insights} onRefresh={fetchInsights} />
              </div>
            </div>

            {/* Chart + Metrics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Chart Panel */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex gap-1 text-xs">
                  {['1D', '4H', '1H'].map(tf => (
                    <button key={tf} onClick={() => setActiveTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTimeframe === tf ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {tf}
                    </button>
                  ))}
                </div>
                {panelErrors.chart ? (
                  <PanelError label="Chart" onRetry={() => { clearPanelError('chart'); fetchPrice(coin, { initial: true }) }} />
                ) : (
                  <ChartPanel
                    ohlcv={ohlcv}
                    indicators={activeTimeframe === '1D' ? signalData?.indicators?.daily : signalData?.indicators?.hourly}
                    signal={signalData}
                    selectedTimeframe={activeTimeframe}
                    signalData={signalData || { priceData: activePriceData }}
                  />
                )}
              </div>

              {/* Sidebar: Metrics, Position, Order Book */}
              <div className="flex flex-col gap-4">

                {/* Expandable SessionPanel from Top Clock Click */}
                {showSessionDetail && (
                  <div className="transition-all animate-fadeIn">
                    <SessionPanel session={signalData?.sessionAnalysis || (currentSession ? { current: currentSession, transition: {}, adjustment: { points: 0, reason: "Analysis pending" }, history: {}, upcomingWindows: [] } : null)} />
                  </div>
                )}

                {/* On-chain Metrics Panel */}
                {signalData?.onchainData ? (
                  <OnchainPanel onchainData={signalData.onchainData} />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Fear & Greed', emoji: '😐' },
                      { label: 'Funding Rate', emoji: '📈' },
                      { label: 'Exchange Flow', emoji: '🟢' },
                      { label: 'Whale Txns', emoji: '🐋' },
                    ].map(({ label, emoji }) => (
                      <div key={label} className="bg-gray-900/60 border border-gray-700/30 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</span>
                          <span>{emoji}</span>
                        </div>
                        <div className="font-bold text-white text-sm">N/A</div>
                        <div className="text-xs text-gray-400">Scan pending</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Position Calculator */}
                {positionDetails && (
                  <div className="rounded-2xl border border-blue-700/30 bg-blue-900/10 p-4 backdrop-blur-sm">
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-3">Position Calculator</div>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-400">Position Size:</span>
                        <span className="text-lg font-black text-white">
                          {positionDetails.coinAmount} <span className="text-xs text-gray-400 font-medium">{coin}</span>
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Position Value:</span>
                        <span className="font-semibold text-white">${positionDetails.usdValue.toLocaleString()} ({positionDetails.portfolioPercent}% portfolio)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Max Risk (Loss):</span>
                        <span className="font-semibold text-red-400">${positionDetails.maxLoss.toLocaleString()} ({positionDetails.maxLossPercent}%)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Potential Reward:</span>
                        <span className="font-semibold text-green-400">${positionDetails.potentialWin.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Stop Distance:</span>
                        <span className="font-semibold text-orange-400">{positionDetails.stopDistancePercent}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Book */}
                {signalData?.orderBook ? (
                  <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Order Book Depth</div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400">Buy Wall</span>
                      <span className="text-xs text-gray-400">{formatPrice(signalData.orderBook.buyWall?.price)}</span>
                      <span className="text-xs text-green-300 font-bold">{signalData.orderBook.buyWall?.strength}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full mb-3">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((signalData.orderBook.bidAskRatio || 1) / 2 * 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-red-400">Sell Wall</span>
                      <span className="text-xs text-gray-400">{formatPrice(signalData.orderBook.sellWall?.price)}</span>
                      <span className="text-xs text-red-300 font-bold">{signalData.orderBook.sellWall?.strength}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full mb-3">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100 / (signalData.orderBook.bidAskRatio || 1) / 2 * 100, 100)}%` }} />
                    </div>
                    <div className="text-xs text-gray-400">Bid/Ask Ratio: <span className="text-white font-bold">{signalData.orderBook.bidAskRatio}</span></div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-sm text-center flex flex-col justify-center items-center min-h-[140px]">
                    <div className="text-xl mb-1">📖</div>
                    <span className="text-xs text-gray-500">Order book depth scan pending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pattern Detection & Vision Comparison */}
            {(signalData?.pattern || signalData?.visionAnalysis) && (
              <div className="mb-6">
                <PatternPanel
                  pattern={signalData.pattern}
                  visionAnalysis={signalData.visionAnalysis}
                  patternComparison={signalData.patternComparison}
                />
              </div>
            )}

            {/* Conflict Panel */}
            {signalData?.signal !== 'HOLD' && signalData?.conflicts &&
              (signalData.conflicts.conflictLevel === 'high' || signalData.conflicts.conflictLevel === 'medium') && (
              <div className="mb-6">
                <ConflictPanel conflicts={signalData.conflicts} visible={true} />
              </div>
            )}

            {/* History Table */}
            <div id="history-section" className="mb-6">
              <HistoryTable signals={history} onUpdateOutcome={fetchHistory} />
            </div>

            {/* Insights Link Footer */}
            <div className="flex justify-center">
              <a href="/dashboard/insights"
                className="px-6 py-3 rounded-xl border border-purple-700/30 bg-purple-900/10 text-purple-300 text-sm font-semibold hover:bg-purple-900/20 transition-colors shadow-lg">
                🧠 View Full AI Strategy Insights →
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
