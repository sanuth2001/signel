// Prompt 33 — Backtesting Engine (Rule-based — no real Claude API calls)
import axios from 'axios'
import { calculateAllIndicators } from '../engine/indicators.js'
import { runConfluenceAnalysis } from '../engine/confluence.js'
import { detectRegime, isRegimeTradeable } from '../engine/regime.js'
import { getCoinId } from '../utils/constants.js'

// ─── Rule-Based Signal Simulation (no Claude API) ────────────────────────────
function simulateSignal(indicators, confluence, regime, confidenceThreshold) {
  const d = indicators?.daily || {}
  const conf = confluence?.confidence || 0
  const direction = confluence?.direction || 'NEUTRAL'

  if (!isRegimeTradeable(regime)?.tradeable) {
    return { signal: 'HOLD', confidence: 0 }
  }

  if (conf < confidenceThreshold) {
    return { signal: 'HOLD', confidence: conf }
  }

  if (direction === 'BUY') {
    return { signal: 'BUY', confidence: conf }
  } else if (direction === 'SELL') {
    return { signal: 'SELL', confidence: conf }
  }

  return { signal: 'HOLD', confidence: conf }
}

// ─── Backtest Logic ───────────────────────────────────────────────────────────
export async function runBacktest(coin = 'BTC', days = 90, settings = {}) {
  const { confidenceThreshold = 70, riskPercent = 2 } = settings
  const coinId = getCoinId(coin)

  let ohlcData
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?days=${days}&vs_currency=usd`,
      { timeout: 20000 }
    )
    ohlcData = res.data  // [[timestamp, open, high, low, close], ...]
  } catch (e) {
    throw new Error(`Failed to fetch historical data: ${e.message}`)
  }

  if (!ohlcData || ohlcData.length < 30) {
    throw new Error('Insufficient historical data for backtest')
  }

  const signals = []
  const windowSize = 30  // minimum candles to compute indicators

  // Slide window across data
  for (let i = windowSize; i < ohlcData.length - 5; i++) {
    const slice = ohlcData.slice(0, i + 1)
    const closes = slice.map(c => c[4])
    const opens = slice.map(c => c[1])
    const highs = slice.map(c => c[2])
    const lows = slice.map(c => c[3])
    const volumes = slice.map(() => 1e9)  // synthetic volume

    const priceData = {
      daily: { timestamps: slice.map(c => c[0]), open: opens, high: highs, low: lows, close: closes, volume: volumes },
      hourly: { timestamps: [], open: [], high: [], low: [], close: closes.slice(-24), volume: volumes.slice(-24) },
      currentPrice: closes[closes.length - 1],
    }

    let indicators, confluence, regime
    try {
      indicators = calculateAllIndicators(priceData)
      confluence = runConfluenceAnalysis(indicators.daily, indicators.hourly, {})
      regime = detectRegime(priceData, indicators, {})
    } catch (e) {
      continue
    }

    const { signal, confidence } = simulateSignal(indicators, confluence, regime, confidenceThreshold)

    if (signal !== 'HOLD') {
      const entryPrice = closes[closes.length - 1]

      // Check outcome: look 5 candles forward
      let outcome = 'pending'
      let exitPrice = entryPrice
      const futurePrices = ohlcData.slice(i + 1, i + 6).map(c => c[4])

      if (futurePrices.length > 0) {
        if (signal === 'BUY') {
          const stopLoss = entryPrice * 0.97
          const target = entryPrice * 1.05
          const hitTarget = futurePrices.find(p => p >= target)
          const hitStop = futurePrices.find(p => p <= stopLoss)

          if (hitTarget && (!hitStop || futurePrices.indexOf(hitTarget) <= futurePrices.indexOf(hitStop))) {
            outcome = 'win'
            exitPrice = target
          } else if (hitStop) {
            outcome = 'loss'
            exitPrice = stopLoss
          } else {
            exitPrice = futurePrices[futurePrices.length - 1]
            outcome = exitPrice > entryPrice ? 'win' : 'loss'
          }
        } else if (signal === 'SELL') {
          const stopLoss = entryPrice * 1.03
          const target = entryPrice * 0.95
          const hitTarget = futurePrices.find(p => p <= target)
          const hitStop = futurePrices.find(p => p >= stopLoss)

          if (hitTarget && (!hitStop || futurePrices.indexOf(hitTarget) <= futurePrices.indexOf(hitStop))) {
            outcome = 'win'
            exitPrice = target
          } else if (hitStop) {
            outcome = 'loss'
            exitPrice = stopLoss
          } else {
            exitPrice = futurePrices[futurePrices.length - 1]
            outcome = exitPrice < entryPrice ? 'win' : 'loss'
          }
        }

        const pnl = signal === 'BUY'
          ? ((exitPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - exitPrice) / entryPrice) * 100

        signals.push({
          timestamp: new Date(slice[slice.length - 1][0]).toISOString(),
          signal,
          confidence,
          entryPrice,
          exitPrice,
          outcome,
          pnl: parseFloat(pnl.toFixed(2)),
          regime: regime.regime,
        })
      }
    }
  }

  // Calculate stats
  const executed = signals.filter(s => s.outcome !== 'pending')
  const wins = executed.filter(s => s.outcome === 'win')
  const losses = executed.filter(s => s.outcome === 'loss')
  const winRate = executed.length > 0 ? parseFloat(((wins.length / executed.length) * 100).toFixed(1)) : 0
  const avgWinPct = wins.length > 0 ? parseFloat((wins.reduce((s, w) => s + w.pnl, 0) / wins.length).toFixed(2)) : 0
  const avgLossPct = losses.length > 0 ? parseFloat((losses.reduce((s, l) => s + l.pnl, 0) / losses.length).toFixed(2)) : 0
  const totalWins = wins.reduce((s, w) => s + w.pnl, 0)
  const totalLosses = Math.abs(losses.reduce((s, l) => s + l.pnl, 0))
  const profitFactor = totalLosses > 0 ? parseFloat((totalWins / totalLosses).toFixed(2)) : totalWins > 0 ? 99 : 0
  const totalReturn = parseFloat(executed.reduce((s, e) => s + e.pnl, 0).toFixed(2))

  // Max drawdown
  let peak = 0, maxDrawdown = 0, runningPnl = 0
  for (const s of executed) {
    runningPnl += s.pnl
    if (runningPnl > peak) peak = runningPnl
    const dd = peak - runningPnl
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  // By regime
  const byRegime = {}
  for (const s of executed) {
    if (!byRegime[s.regime]) byRegime[s.regime] = { signals: 0, wins: 0 }
    byRegime[s.regime].signals++
    if (s.outcome === 'win') byRegime[s.regime].wins++
  }
  for (const r of Object.keys(byRegime)) {
    byRegime[r].winRate = parseFloat(((byRegime[r].wins / byRegime[r].signals) * 100).toFixed(1))
  }

  const blocked = ohlcData.length - windowSize - signals.length

  return {
    coin,
    period: `${days} days`,
    totalCandles: ohlcData.length,
    totalSignals: signals.length + blocked,
    executed: executed.length,
    blocked,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWinPercent: avgWinPct,
    avgLossPercent: avgLossPct,
    profitFactor,
    maxDrawdown: parseFloat((-maxDrawdown).toFixed(2)),
    totalReturn,
    byRegime,
    signalLog: signals.slice(-50),  // last 50 signals
    settings: { confidenceThreshold, riskPercent },
  }
}
