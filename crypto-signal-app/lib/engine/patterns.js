// ─── Helper: Find pivot highs and lows ─────────────────────────────────────
function findPivots(highs, lows, window = 3) {
  const pivotHighs = [], pivotLows = []
  for (let i = window; i < highs.length - window; i++) {
    const isHigh = highs.slice(i - window, i).every(h => h <= highs[i]) && highs.slice(i + 1, i + window + 1).every(h => h <= highs[i])
    const isLow = lows.slice(i - window, i).every(l => l >= lows[i]) && lows.slice(i + 1, i + window + 1).every(l => l >= lows[i])
    if (isHigh) pivotHighs.push({ index: i, price: highs[i] })
    if (isLow) pivotLows.push({ index: i, price: lows[i] })
  }
  return { pivotHighs, pivotLows }
}

// ─── Key S/R Levels ─────────────────────────────────────────────────────────
export function findKeyLevels(ohlcv, lookback = 20) {
  const { high, low } = ohlcv
  if (!high || high.length < lookback) return { support: [], resistance: [] }

  const recentHighs = high.slice(-lookback)
  const recentLows = low.slice(-lookback)
  const tolerance = (Math.max(...recentHighs) - Math.min(...recentLows)) * 0.01

  // Cluster price levels touched 2+ times
  function cluster(prices) {
    const levels = []
    for (const p of prices) {
      const existing = levels.find(l => Math.abs(l.price - p) < tolerance)
      if (existing) { existing.count++; existing.price = (existing.price + p) / 2 }
      else levels.push({ price: p, count: 1 })
    }
    return levels.filter(l => l.count >= 2).map(l => parseFloat(l.price.toFixed(2))).sort((a, b) => a - b)
  }

  return {
    support: cluster(recentLows),
    resistance: cluster(recentHighs),
  }
}

// ─── Pattern Detectors ───────────────────────────────────────────────────────
function detectBullFlag(closes, highs, lows, volumes) {
  const n = closes.length
  if (n < 15) return null

  const impulse = closes.slice(-15, -10)
  const consol = closes.slice(-10)

  const impulseGain = (impulse[impulse.length - 1] - impulse[0]) / impulse[0]
  if (impulseGain < 0.05) return null

  const consolHigh = Math.max(...consol)
  const consolLow = Math.min(...consol)
  const consolRange = (consolHigh - consolLow) / consolHigh

  if (consolRange > 0.04) return null

  const avgImpulseVol = volumes.slice(-15, -10).reduce((a, b) => a + b, 0) / 5
  const avgConsolVol = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10
  if (avgConsolVol > avgImpulseVol * 0.7) return null

  return {
    pattern: 'Bull Flag',
    direction: 'bullish',
    confidence: Math.floor(65 + impulseGain * 200),
    description: `Strong ${(impulseGain * 100).toFixed(1)}% impulse up, tight consolidation on low volume`,
    breakoutTarget: parseFloat((consolHigh * (1 + impulseGain * 0.5)).toFixed(2)),
    invalidationLevel: parseFloat((consolLow * 0.99).toFixed(2)),
  }
}

function detectDoubleBottom(lows, closes) {
  const n = lows.length
  if (n < 20) return null

  const recentLows = lows.slice(-20)
  const minLow = Math.min(...recentLows)
  const tolerance = minLow * 0.015

  const bottomIndices = recentLows.reduce((acc, l, i) => {
    if (Math.abs(l - minLow) < tolerance) acc.push(i)
    return acc
  }, [])

  if (bottomIndices.length < 2) return null
  const gap = bottomIndices[bottomIndices.length - 1] - bottomIndices[0]
  if (gap < 5) return null

  const midHigh = Math.max(...recentLows.slice(bottomIndices[0], bottomIndices[bottomIndices.length - 1]))
  const neckline = midHigh

  return {
    pattern: 'Double Bottom',
    direction: 'bullish',
    confidence: 70,
    description: `Two lows near $${minLow.toFixed(0)} with neckline at $${neckline.toFixed(0)}`,
    breakoutTarget: parseFloat((neckline + (neckline - minLow)).toFixed(2)),
    invalidationLevel: parseFloat((minLow * 0.985).toFixed(2)),
  }
}

function detectHeadAndShoulders(highs, closes) {
  const n = highs.length
  if (n < 25) return null

  const segment = highs.slice(-25)
  const peak = Math.max(...segment)
  const peakIdx = segment.indexOf(peak)

  if (peakIdx < 5 || peakIdx > segment.length - 5) return null

  const leftShoulder = Math.max(...segment.slice(0, peakIdx - 3))
  const rightShoulder = Math.max(...segment.slice(peakIdx + 3))

  const shoulderTolerance = peak * 0.05
  if (Math.abs(leftShoulder - rightShoulder) > shoulderTolerance) return null
  if (leftShoulder >= peak * 0.95 || rightShoulder >= peak * 0.95) return null

  const neckline = closes[closes.length - 1]

  return {
    pattern: 'Head and Shoulders',
    direction: 'bearish',
    confidence: 68,
    description: `Three peaks with head at $${peak.toFixed(0)}, shoulders near $${((leftShoulder + rightShoulder) / 2).toFixed(0)}`,
    breakoutTarget: parseFloat((neckline - (peak - neckline)).toFixed(2)),
    invalidationLevel: parseFloat((peak * 1.02).toFixed(2)),
  }
}

function detectDoubleTop(highs) {
  const n = highs.length
  if (n < 20) return null

  const recentHighs = highs.slice(-20)
  const maxHigh = Math.max(...recentHighs)
  const tolerance = maxHigh * 0.015

  const topIndices = recentHighs.reduce((acc, h, i) => {
    if (Math.abs(h - maxHigh) < tolerance) acc.push(i)
    return acc
  }, [])

  if (topIndices.length < 2) return null
  const gap = topIndices[topIndices.length - 1] - topIndices[0]
  if (gap < 5) return null

  return {
    pattern: 'Double Top',
    direction: 'bearish',
    confidence: 70,
    description: `Two highs near $${maxHigh.toFixed(0)} with ${gap} candles apart`,
    breakoutTarget: parseFloat((maxHigh * 0.94).toFixed(2)),
    invalidationLevel: parseFloat((maxHigh * 1.015).toFixed(2)),
  }
}

// ─── Master Pattern Detector ─────────────────────────────────────────────────
export function detectPatterns(ohlcv) {
  const { open, high, low, close, volume } = ohlcv || {}
  if (!close || close.length < 20) return null

  const keyLevels = findKeyLevels(ohlcv)

  // Try patterns in priority order
  const candidates = [
    detectBullFlag(close, high, low, volume || close.map(() => 1e9)),
    detectDoubleBottom(low, close),
    detectDoubleTop(high),
    detectHeadAndShoulders(high, close),
  ].filter(Boolean)

  if (candidates.length === 0) return null

  const best = candidates.reduce((max, p) => p.confidence > max.confidence ? p : max, candidates[0])

  return {
    ...best,
    confidence: Math.min(best.confidence, 85),
    keyLevels,
  }
}

if (process.argv[2] === 'test') {
  const n = 50
  const close = Array.from({ length: n }, (_, i) => 67000 + Math.sin(i * 0.4) * 2000)
  const high = close.map(c => c * 1.005)
  const low = close.map(c => c * 0.995)
  const volume = Array.from({ length: n }, () => 1e9)
  console.log(JSON.stringify(detectPatterns({ open: close, high, low, close, volume }), null, 2))
}
