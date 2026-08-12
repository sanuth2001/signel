// ─── Scalping Module (GAP 7) ──────────────────────────────────────────────────
// Ultra-short timeframe analysis for 1min/5min/15min signals.
// Uses micro-structure: momentum, mini S/R, and tight entry/exit windows.

// ─── Micro EMA Helper ─────────────────────────────────────────────────────────
function calcEMA(data, period) {
  if (!data || data.length < period) return []
  const k = 2 / (period + 1)
  const result = []
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(...Array(period - 1).fill(null))
  result.push(ema)
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
    result.push(ema)
  }
  return result
}

// ─── A. MICRO RSI ─────────────────────────────────────────────────────────────
function calcMicroRSI(closes, period = 9) {
  if (!closes || closes.length < period + 1) return { value: 50, zone: 'neutral', signal: 'NEUTRAL' }

  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
  }

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const value = parseFloat((100 - 100 / (1 + rs)).toFixed(1))

  const zone = value < 30 ? 'oversold' : value > 70 ? 'overbought' : 'neutral'
  const signal = value < 30 ? 'BUY' : value > 70 ? 'SELL' : 'NEUTRAL'

  return { value, zone, signal }
}

// ─── B. MICRO STRUCTURE SUPPORT/RESISTANCE ────────────────────────────────────
function findMicroLevels(ohlcv, lookback = 30) {
  const { high, low, close } = ohlcv || {}
  if (!close || close.length < lookback) return { support: null, resistance: null }

  const h = high.slice(-lookback)
  const l = low.slice(-lookback)
  const c = close.slice(-lookback)

  // Find local pivot highs and lows
  const pivotHighs = []
  const pivotLows = []

  for (let i = 2; i < h.length - 2; i++) {
    if (h[i] > h[i - 1] && h[i] > h[i + 1] && h[i] > h[i - 2] && h[i] > h[i + 2]) pivotHighs.push(h[i])
    if (l[i] < l[i - 1] && l[i] < l[i + 1] && l[i] < l[i - 2] && l[i] < l[i + 2]) pivotLows.push(l[i])
  }

  const currentPrice = c[c.length - 1]

  const support = pivotLows.filter(p => p < currentPrice).slice(-3).reduce((best, p) => (currentPrice - p < currentPrice - (best || 0) ? p : best), null)
  const resistance = pivotHighs.filter(p => p > currentPrice).slice(-3).reduce((best, p) => (p - currentPrice < (best || Infinity) - currentPrice ? p : best), null)

  return {
    support: support ? parseFloat(support.toFixed(2)) : null,
    resistance: resistance ? parseFloat(resistance.toFixed(2)) : null,
    pivotHighs: pivotHighs.slice(-5).map(p => parseFloat(p.toFixed(2))),
    pivotLows: pivotLows.slice(-5).map(p => parseFloat(p.toFixed(2))),
  }
}

// ─── C. MOMENTUM ANALYSIS ─────────────────────────────────────────────────────
function analyzeMicroMomentum(ohlcv) {
  const { close, volume } = ohlcv || {}
  if (!close || close.length < 10) return { momentum: 0, signal: 'NEUTRAL', strength: 'weak' }

  const ema5 = calcEMA(close, 5)
  const ema9 = calcEMA(close, Math.min(9, close.length))
  const ema21 = calcEMA(close, Math.min(21, close.length))

  const e5 = ema5[ema5.length - 1]
  const e9 = ema9[ema9.length - 1]
  const e21 = ema21[ema21.length - 1]

  const currentPrice = close[close.length - 1]

  const emaAligned = e5 > e9 && e9 > e21
  const emaAlignedDown = e5 < e9 && e9 < e21

  // 5-bar rate of change
  const roc = close.length >= 6 ? ((close[close.length - 1] - close[close.length - 6]) / close[close.length - 6]) * 100 : 0

  // Volume momentum
  const recentVol = (volume || close.map(() => 1)).slice(-5)
  const prevVol = (volume || close.map(() => 1)).slice(-10, -5)
  const avgRecent = recentVol.reduce((a, b) => a + b, 0) / 5
  const avgPrev = prevVol.length > 0 ? prevVol.reduce((a, b) => a + b, 0) / prevVol.length : avgRecent
  const volMomentum = avgPrev > 0 ? avgRecent / avgPrev : 1

  let signal = 'NEUTRAL'
  let strength = 'weak'

  if (emaAligned && roc > 0.05) {
    signal = 'BUY'
    strength = (emaAligned && roc > 0.2 && volMomentum >= 1.2) ? 'strong' : 'medium'
  } else if (emaAlignedDown && roc < -0.05) {
    signal = 'SELL'
    strength = (emaAlignedDown && roc < -0.2 && volMomentum >= 1.2) ? 'strong' : 'medium'
  }

  return {
    momentum: parseFloat(roc.toFixed(3)),
    signal,
    strength,
    ema5: e5 ? parseFloat(e5.toFixed(2)) : null,
    ema9: e9 ? parseFloat(e9.toFixed(2)) : null,
    ema21: e21 ? parseFloat(e21.toFixed(2)) : null,
    emaAligned,
    emaAlignedDown,
    volumeMomentum: parseFloat(volMomentum.toFixed(2)),
  }
}

// ─── D. SCALP SIGNAL GENERATOR ───────────────────────────────────────────────
/**
 * Generate a scalp signal for a given timeframe's candle data.
 * @param {Object} ohlcv - Candle data (short series: 30-100 candles)
 * @param {string} timeframe - '1m', '5m', or '15m'
 * @param {number} currentPrice
 * @returns {Object} Scalp signal with tight entry/exit
 */
export function generateScalpSignal(ohlcv, timeframe, currentPrice) {
  const { close, volume } = ohlcv || {}
  if (!close || close.length < 10 || !currentPrice) {
    return {
      timeframe,
      signal: null,
      confidence: 0,
      reason: 'Insufficient candle data',
    }
  }

  const microRSI = calcMicroRSI(close)
  const microLevels = findMicroLevels(ohlcv, Math.min(30, close.length))
  const momentum = analyzeMicroMomentum(ohlcv)

  // Score system
  let bullScore = 0
  let bearScore = 0
  const bullReasons = []
  const bearReasons = []

  // RSI signal
  if (microRSI.zone === 'oversold') { bullScore += 3; bullReasons.push(`RSI oversold (${microRSI.value})`) }
  if (microRSI.zone === 'overbought') { bearScore += 3; bearReasons.push(`RSI overbought (${microRSI.value})`) }
  if (microRSI.value < 35 && microRSI.value > 25) { bullScore += 2; bullReasons.push(`RSI approaching oversold`) }
  if (microRSI.value > 65 && microRSI.value < 75) { bearScore += 2; bearReasons.push(`RSI approaching overbought`) }

  // Momentum
  if (momentum.signal === 'BUY') {
    const mBonus = momentum.strength === 'strong' ? 4 : 2
    bullScore += mBonus
    bullReasons.push(`${momentum.strength} bullish momentum (ROC: +${momentum.momentum}%)`)
  }
  if (momentum.signal === 'SELL') {
    const mBonus = momentum.strength === 'strong' ? 4 : 2
    bearScore += mBonus
    bearReasons.push(`${momentum.strength} bearish momentum (ROC: ${momentum.momentum}%)`)
  }

  // EMA alignment
  if (momentum.emaAligned) { bullScore += 2; bullReasons.push('EMA5 > EMA9 > EMA21 aligned') }
  if (momentum.emaAlignedDown) { bearScore += 2; bearReasons.push('EMA5 < EMA9 < EMA21 aligned') }

  // At micro support/resistance
  const atSupport = microLevels.support && Math.abs(currentPrice - microLevels.support) / currentPrice < 0.002
  const atResistance = microLevels.resistance && Math.abs(currentPrice - microLevels.resistance) / currentPrice < 0.002

  if (atSupport) { bullScore += 3; bullReasons.push(`At micro-support ($${microLevels.support?.toLocaleString()})`) }
  if (atResistance) { bearScore += 3; bearReasons.push(`At micro-resistance ($${microLevels.resistance?.toLocaleString()})`) }

  // Volume surge
  if (momentum.volumeMomentum > 1.5) {
    const volBonus = 2
    if (bullScore > bearScore) { bullScore += volBonus; bullReasons.push('Volume surge (1.5x+)') }
    else { bearScore += volBonus; bearReasons.push('Volume surge (1.5x+)') }
  }

  // Determine signal
  const totalScore = bullScore + bearScore
  let signal = null
  let confidence = 0
  let reasons = []
  let entry, stopLoss, target, riskReward

  const minScore = 5
  const maxScore = 12

  if (bullScore > bearScore && bullScore >= minScore) {
    signal = 'BUY'
    confidence = Math.min(75, Math.round((bullScore / maxScore) * 80))
    reasons = bullReasons

    // Tight scalp levels
    const scalpRisk = timeframe === '1m' ? 0.001 : timeframe === '5m' ? 0.002 : 0.003
    const scalpReward = scalpRisk * 1.5

    entry = parseFloat(currentPrice.toFixed(2))
    stopLoss = parseFloat((currentPrice * (1 - scalpRisk)).toFixed(2))
    target = parseFloat((currentPrice * (1 + scalpReward)).toFixed(2))
    riskReward = 1.5
  } else if (bearScore > bullScore && bearScore >= minScore) {
    signal = 'SELL'
    confidence = Math.min(75, Math.round((bearScore / maxScore) * 80))
    reasons = bearReasons

    const scalpRisk = timeframe === '1m' ? 0.001 : timeframe === '5m' ? 0.002 : 0.003
    const scalpReward = scalpRisk * 1.5

    entry = parseFloat(currentPrice.toFixed(2))
    stopLoss = parseFloat((currentPrice * (1 + scalpRisk)).toFixed(2))
    target = parseFloat((currentPrice * (1 - scalpReward)).toFixed(2))
    riskReward = 1.5
  }

  return {
    timeframe,
    signal,
    confidence,
    entry,
    stopLoss,
    target,
    riskReward,
    reasons,
    indicators: {
      rsi: microRSI.value,
      rsiZone: microRSI.zone,
      momentum: momentum.momentum,
      momentumSignal: momentum.signal,
      momentumStrength: momentum.strength,
      volumeMomentum: momentum.volumeMomentum,
      ema5: momentum.ema5,
      ema9: momentum.ema9,
    },
    microLevels,
    scalpNote: `Scalp target: ${(Math.abs((target || currentPrice) - currentPrice) / currentPrice * 100).toFixed(2)}% | Stop: ${(Math.abs((stopLoss || currentPrice) - currentPrice) / currentPrice * 100).toFixed(2)}% | Max hold: ${timeframe === '1m' ? '5–10 min' : timeframe === '5m' ? '15–30 min' : '30–60 min'}`,
  }
}

// ─── E. MULTI-TIMEFRAME SCALP ANALYSIS ───────────────────────────────────────
/**
 * Run scalp analysis across 1m, 5m, 15m timeframes.
 * Requires priceData to contain the short-term candle data.
 */
export function analyzeScalping(priceData, currentPrice) {
  if (!priceData || !currentPrice) return null

  const results = {}
  const TIMEFRAMES = [
    { key: 'oneMin', tf: '1m' },
    { key: 'fiveMin', tf: '5m' },
    { key: 'fifteenMin', tf: '15m' },
  ]

  for (const { key, tf } of TIMEFRAMES) {
    const data = priceData[key]
    if (!data || !data.close || data.close.length < 10) {
      results[tf] = { timeframe: tf, signal: null, confidence: 0, reason: 'No data for this timeframe' }
      continue
    }
    results[tf] = generateScalpSignal(data, tf, currentPrice)
  }

  // Confluence check
  const signals = Object.values(results).map(r => r.signal).filter(Boolean)
  const buyCount = signals.filter(s => s === 'BUY').length
  const sellCount = signals.filter(s => s === 'SELL').length

  let consensus = null
  let consensusConfidence = 0
  let consensusReason = ''

  if (buyCount === 3) {
    consensus = 'BUY'
    consensusConfidence = Math.round(Object.values(results).reduce((s, r) => s + (r.confidence || 0), 0) / 3)
    consensusReason = 'All 3 scalp timeframes aligned BULLISH — strong momentum entry'
  } else if (sellCount === 3) {
    consensus = 'SELL'
    consensusConfidence = Math.round(Object.values(results).reduce((s, r) => s + (r.confidence || 0), 0) / 3)
    consensusReason = 'All 3 scalp timeframes aligned BEARISH — strong momentum entry'
  } else if (buyCount === 2) {
    consensus = 'BUY'
    consensusConfidence = 55
    consensusReason = `2/3 timeframes bullish — partial scalp alignment`
  } else if (sellCount === 2) {
    consensus = 'SELL'
    consensusConfidence = 55
    consensusReason = `2/3 timeframes bearish — partial scalp alignment`
  } else {
    consensus = null
    consensusReason = 'Mixed scalp signals across timeframes — no clear scalp entry'
  }

  return {
    '1m': results['1m'],
    '5m': results['5m'],
    '15m': results['15m'],
    consensus,
    consensusConfidence,
    consensusReason,
    warning: 'Scalp signals expire in 1–5 minutes. Always use tight stops.',
  }
}

// ─── TEST CLI ─────────────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  // Simulate a bullish micro-trend
  const n = 50
  const basePrices = Array.from({ length: n }, (_, i) => 65000 + i * 10 + (Math.random() - 0.4) * 30)
  const mockOHLCV = {
    open: basePrices.map(p => p - 5),
    high: basePrices.map(p => p + 12),
    low: basePrices.map(p => p - 12),
    close: basePrices,
    volume: basePrices.map(() => 1e8 * (1 + Math.random())),
  }

  const currentPrice = basePrices[basePrices.length - 1]
  const signal = generateScalpSignal(mockOHLCV, '5m', currentPrice)

  console.log('=== Scalping Test ===')
  console.log('Timeframe: 5m')
  console.log('Signal:', signal.signal)
  console.log('Confidence:', signal.confidence + '%')
  console.log('Entry:', '$' + signal.entry?.toLocaleString())
  console.log('Stop:', '$' + signal.stopLoss?.toLocaleString())
  console.log('Target:', '$' + signal.target?.toLocaleString())
  console.log('RSI:', signal.indicators.rsi, '(' + signal.indicators.rsiZone + ')')
  console.log('Momentum:', signal.indicators.momentumSignal, '(' + signal.indicators.momentumStrength + ')')
  console.log('Volume Momentum:', signal.indicators.volumeMomentum + 'x')
  console.log('Reasons:', signal.reasons)
  console.log('Note:', signal.scalpNote)
  console.log('\n✅ Scalping test passed!')
}
