'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import SignalCard from '../../components/SignalCard'
import ChartPanel from '../../components/ChartPanel'
import DroughtDetector from '../../components/DroughtDetector'
import RegimeIndicator from '../../components/RegimeIndicator'
import HistoryTable from '../../components/HistoryTable'
import AccuracyStats from '../../components/AccuracyStats'
import { formatPrice, formatPercent, timeAgo } from '../../lib/utils/formatters'
import { REFRESH_INTERVAL } from '../../lib/utils/constants'

const COINS = ['BTC', 'ETH', 'SOL', 'BNB']

export default function Dashboard() {
  const [coin, setCoin] = useState('BTC')
  const [loading, setLoading] = useState(false)
  const [signalData, setSignalData] = useState(null)
  const [history, setHistory] = useState([])
  const [accuracyStats, setAccuracyStats] = useState(null)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000)
  const [activeTimeframe, setActiveTimeframe] = useState('1D')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({ confidenceThreshold: 70, riskPercent: 2, autoRefresh: true })
  const [accountSize, setAccountSize] = useState(10000)
  const countdownRef = useRef(null)

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

  const getSignal = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/signal?coin=${coin}`)
      const data = await res.json()
      if (res.status === 429) {
        setError(`Rate limited: ${data.message}`)
        return
      }
      if (res.status !== 200) {
        setError(data.message || 'Signal generation failed')
        return
      }
      setSignalData(data)
      setLastUpdated(new Date().toISOString())
      setCountdown(REFRESH_INTERVAL / 1000)
      await fetchHistory()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [coin, loading, fetchHistory])

  // Auto-refresh countdown
  useEffect(() => {
    if (!settings.autoRefresh) return
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { getSignal(); return REFRESH_INTERVAL / 1000 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [settings.autoRefresh, getSignal])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const positionSize = signalData?.entryPrice && signalData?.stopLoss
    ? ((accountSize * (settings.riskPercent / 100)) / Math.abs(signalData.entryPrice - signalData.stopLoss)).toFixed(4)
    : null

  const ohlcv = activeTimeframe === '1D' ? signalData?.priceData?.daily || null : signalData?.priceData?.hourly || null

  // Determine what ohlcv data to use from signalData
  const chartData = signalData?.indicators ? (() => {
    // We need ohlcv from priceData embedded in signal response
    // Use mock structure if not available
    return null // ChartPanel handles null gracefully
  })() : null

  const isDrought = signalData?.status === 'drought'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black">₿</div>
            <div>
              <div className="font-black text-white text-sm">CryptoSignal AI</div>
              <div className="text-xs text-gray-500">Powered by Claude</div>
            </div>
          </div>

          {/* Coin Selector */}
          <div className="flex gap-1">
            {COINS.map(c => (
              <button
                key={c}
                onClick={() => setCoin(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${coin === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >{c}</button>
            ))}
          </div>

          {/* Status Row */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {lastUpdated && <span>Updated {timeAgo(lastUpdated)}</span>}
            {settings.autoRefresh && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Refresh in {countdown}s
              </span>
            )}
            <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white transition-colors">⚙️</button>
          </div>

          {/* Analyze Button */}
          <button
            onClick={getSignal}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 disabled:shadow-none flex items-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Analyzing...</span></>
            ) : '⚡ Analyze'}
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-900/90 border-b border-gray-700/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Confidence Threshold: {settings.confidenceThreshold}%</label>
                <input type="range" min="50" max="95" value={settings.confidenceThreshold}
                  onChange={e => setSettings(s => ({ ...s, confidenceThreshold: +e.target.value }))}
                  className="w-full accent-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Risk per Trade: {settings.riskPercent}%</label>
                <input type="range" min="0.5" max="5" step="0.5" value={settings.riskPercent}
                  onChange={e => setSettings(s => ({ ...s, riskPercent: +e.target.value }))}
                  className="w-full accent-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Account Size ($)</label>
                <input type="number" value={accountSize} onChange={e => setAccountSize(+e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setSettings(s => ({ ...s, autoRefresh: !s.autoRefresh }))}
                    className={`w-10 h-6 rounded-full transition-colors relative ${settings.autoRefresh ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.autoRefresh ? 'left-5' : 'left-1'}`} />
                  </div>
                  <span className="text-xs text-gray-400">Auto-refresh</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !signalData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-gray-800/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* No Data State */}
        {!loading && !signalData && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">📡</div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Analyze</h2>
            <p className="text-gray-400 mb-6 max-w-md">Select a coin and click Analyze to generate your first AI-powered signal. Make sure your Anthropic API key is set in .env.local</p>
            <button onClick={getSignal} className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-xl shadow-blue-500/20">
              ⚡ Get First Signal
            </button>
          </div>
        )}

        {signalData && (
          <>
            {/* Price Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-3xl font-black text-white">{formatPrice(signalData.priceData?.current)}</div>
              <div className={`text-lg font-semibold ${signalData.priceData?.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(signalData.priceData?.change24h)} 24h
              </div>
              <div className="text-gray-500 text-sm">{coin}/USD</div>
            </div>

            {/* Main Row: Signal + Regime + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Signal or Drought */}
              <div className="lg:col-span-1">
                {isDrought ? (
                  <DroughtDetector
                    reason={signalData.reason}
                    regime={signalData.regime?.regime}
                    watchFor={signalData.regime?.recommendedAction}
                    recommendedAction={signalData.regime?.expectedDuration}
                  />
                ) : (
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
                  />
                )}
              </div>

              {/* Regime + On-chain Metrics */}
              <div className="flex flex-col gap-4">
                <RegimeIndicator
                  regime={signalData.regime?.regime}
                  accuracy={signalData.regime?.accuracy}
                  description={signalData.regime?.reason}
                  tradeable={signalData.regime?.tradeable}
                />

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Fear & Greed', value: signalData.onchainData?.fearGreed?.value, sub: signalData.onchainData?.fearGreed?.label, emoji: signalData.onchainData?.fearGreed?.value < 30 ? '😱' : signalData.onchainData?.fearGreed?.value > 70 ? '🤑' : '😐' },
                    { label: 'Funding Rate', value: `${((signalData.onchainData?.funding?.rate || 0) * 100).toFixed(4)}%`, sub: signalData.onchainData?.funding?.signal, emoji: signalData.onchainData?.funding?.rate < 0 ? '📉' : '📈' },
                    { label: 'Exchange Flow', value: signalData.onchainData?.exchangeFlow?.direction?.toUpperCase(), sub: `${Math.abs(signalData.onchainData?.exchangeFlow?.netFlow || 0).toLocaleString()} BTC`, emoji: signalData.onchainData?.exchangeFlow?.direction === 'outflow' ? '🟢' : '🔴' },
                    { label: 'Whale Txns', value: signalData.onchainData?.whaleTransactions?.count, sub: signalData.onchainData?.whaleTransactions?.signal, emoji: '🐋' },
                  ].map(({ label, value, sub, emoji }) => (
                    <div key={label} className="bg-gray-900/60 border border-gray-700/30 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{label}</span>
                        <span>{emoji}</span>
                      </div>
                      <div className="font-bold text-white text-sm">{value}</div>
                      <div className="text-xs text-gray-400">{sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accuracy Stats */}
              <div>
                <AccuracyStats
                  stats={accuracyStats}
                  insights={insights}
                  onRefresh={fetchInsights}
                />
              </div>
            </div>

            {/* Chart + Order Book Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Chart */}
              <div className="lg:col-span-2">
                <div className="mb-2 flex gap-1">
                  {['1D', '4H', '1H'].map(tf => (
                    <button key={tf} onClick={() => setActiveTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeTimeframe === tf ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >{tf}</button>
                  ))}
                </div>
                <ChartPanel
                  ohlcv={ohlcv}
                  indicators={activeTimeframe === '1D' ? signalData?.indicators?.daily : signalData?.indicators?.hourly}
                  signal={signalData}
                />
              </div>

              {/* Order Book + CVD + Liquidations */}
              <div className="flex flex-col gap-4">
                {/* Order Book */}
                <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-sm">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Order Book</div>
                  {signalData.orderBook && (
                    <>
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
                    </>
                  )}
                </div>

                {/* CVD */}
                {signalData.cvd && (
                  <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">CVD Signal</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{signalData.cvd.trend === 'rising' ? '↑' : signalData.cvd.trend === 'falling' ? '↓' : '→'}</span>
                      <div>
                        <div className="text-sm font-bold text-white capitalize">{signalData.cvd.trend}</div>
                        <div className="text-xs text-gray-400">{signalData.cvd.divergence ? '⚠ Divergence!' : 'No divergence'}</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{signalData.cvd.description}</p>
                  </div>
                )}

                {/* Liquidations */}
                {signalData.sentiment?.liquidations && (
                  <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Liquidation Levels</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-green-400">Long Liq</span>
                        <span className="text-xs text-white font-bold">{formatPrice(signalData.sentiment.liquidations.nearestLongLiq)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-red-400">Short Liq</span>
                        <span className="text-xs text-white font-bold">{formatPrice(signalData.sentiment.liquidations.nearestShortLiq)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{signalData.sentiment.liquidations.description}</p>
                  </div>
                )}

                {/* Position Size Calculator */}
                {positionSize && (
                  <div className="rounded-2xl border border-blue-700/30 bg-blue-900/10 p-4 backdrop-blur-sm">
                    <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">Position Size</div>
                    <div className="text-2xl font-black text-white">{positionSize} <span className="text-sm text-gray-400">{coin}</span></div>
                    <div className="text-xs text-gray-400 mt-1">At {settings.riskPercent}% risk on ${accountSize.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Pattern Detection */}
            {signalData.pattern && (
              <div className="mb-6 rounded-2xl border border-gray-700/50 bg-gray-900/80 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chart Pattern Detected</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{signalData.pattern.direction === 'bullish' ? '🚀' : '📉'}</span>
                      <div>
                        <div className="font-bold text-white">{signalData.pattern.pattern}</div>
                        <div className="text-xs text-gray-400">{signalData.pattern.description}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Confidence</div>
                    <div className="text-2xl font-black text-white">{signalData.pattern.confidence}%</div>
                    <div className="text-xs text-green-400">Target: {formatPrice(signalData.pattern.breakoutTarget)}</div>
                    <div className="text-xs text-red-400">Invalidation: {formatPrice(signalData.pattern.invalidationLevel)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* History Table */}
            <div className="mb-6">
              <HistoryTable signals={history} onUpdateOutcome={fetchHistory} />
            </div>

            {/* Insights Link */}
            <div className="flex justify-center">
              <a href="/dashboard/insights"
                className="px-6 py-3 rounded-xl border border-purple-700/30 bg-purple-900/10 text-purple-300 text-sm font-semibold hover:bg-purple-900/20 transition-colors">
                🧠 View Full AI Strategy Insights →
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
