// ─── Candle Pattern Detection Engine ─────────────────────────────────────────
// Detects 11 classic candlestick patterns on recent candles

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bodySize(candle) {
  return Math.abs(candle.close - candle.open)
}

function candleRange(candle) {
  return candle.high - candle.low
}

function upperWick(candle) {
  return candle.high - Math.max(candle.open, candle.close)
}

function lowerWick(candle) {
  return Math.min(candle.open, candle.close) - candle.low
}

function isBullish(candle) {
  return candle.close > candle.open
}

function isBearish(candle) {
  return candle.close < candle.open
}

function isNearLevel(price, levels = [], tolerancePercent = 1) {
  for (const level of levels) {
    if (Math.abs(price - level) / level * 100 <= tolerancePercent) return level
  }
  return null
}

function buildDescription(pattern, direction, price, nearestLevel) {
  const at = nearestLevel ? ` at $${nearestLevel.toLocaleString()} key level` : ''
  const dir = direction === 'bullish' ? 'bullish reversal' : direction === 'bearish' ? 'bearish reversal' : 'indecision'
  return `${pattern} signals ${dir}${at} near $${price.toLocaleString()}`
}

// ─── Bullish Patterns ─────────────────────────────────────────────────────────

function detectHammer(c) {
  const body = bodySize(c)
  const lower = lowerWick(c)
  const upper = upperWick(c)
  const range = candleRange(c)
  if (range === 0) return null
  const bodyTopRatio = (c.high - Math.max(c.open, c.close)) / range
  if (lower >= body * 2 && upper <= body * 0.2 && bodyTopRatio <= 0.3 && body > 0) {
    return { pattern: 'Hammer', direction: 'bullish', strength: 'strong', confidence: 78 }
  }
  return null
}

function detectBullishEngulfing(c1, c2) {
  if (!isBearish(c1) || !isBullish(c2)) return null
  if (c2.open <= c1.close && c2.close >= c1.open) {
    return { pattern: 'Bullish Engulfing', direction: 'bullish', strength: 'very strong', confidence: 88 }
  }
  return null
}

function detectMorningStar(c1, c2, c3) {
  const body1 = bodySize(c1)
  const body2 = bodySize(c2)
  const body3 = bodySize(c3)
  const midC1 = (c1.open + c1.close) / 2
  if (
    isBearish(c1) && body1 > 0 &&
    body2 <= body1 * 0.35 &&
    c2.high < c1.close &&
    isBullish(c3) &&
    c3.close >= midC1
  ) {
    return { pattern: 'Morning Star', direction: 'bullish', strength: 'very strong', confidence: 85 }
  }
  return null
}

function detectBullishDoji(c, keyLevels) {
  const body = bodySize(c)
  const range = candleRange(c)
  if (range === 0) return null
  const bodyRatio = body / range
  if (bodyRatio <= 0.05) {
    const nearLevel = isNearLevel(c.close, keyLevels?.support || [], 1)
    return {
      pattern: 'Doji',
      direction: 'neutral',
      strength: nearLevel ? 'medium' : 'weak',
      confidence: nearLevel ? 65 : 45,
      note: 'meaningful only at support',
    }
  }
  return null
}

function detectThreeWhiteSoldiers(c1, c2, c3) {
  if (!isBullish(c1) || !isBullish(c2) || !isBullish(c3)) return null
  const b1 = bodySize(c1), b2 = bodySize(c2), b3 = bodySize(c3)
  const opensWithinPrev =
    c2.open >= c1.open && c2.open <= c1.close &&
    c3.open >= c2.open && c3.open <= c2.close
  const closesNearHigh =
    upperWick(c1) <= b1 * 0.15 &&
    upperWick(c2) <= b2 * 0.15 &&
    upperWick(c3) <= b3 * 0.15
  const increasing = b2 >= b1 * 0.85 && b3 >= b2 * 0.85
  if (opensWithinPrev && closesNearHigh && increasing) {
    return { pattern: 'Three White Soldiers', direction: 'bullish', strength: 'very strong', confidence: 90 }
  }
  return null
}

function detectBullishMarubozu(c) {
  const body = bodySize(c)
  if (!isBullish(c) || body === 0) return null
  const upper = upperWick(c)
  const lower = lowerWick(c)
  if (upper <= body * 0.01 && lower <= body * 0.01) {
    return { pattern: 'Bullish Marubozu', direction: 'bullish', strength: 'strong', confidence: 82 }
  }
  return null
}

// ─── Bearish Patterns ─────────────────────────────────────────────────────────

function detectShootingStar(c) {
  const body = bodySize(c)
  const upper = upperWick(c)
  const lower = lowerWick(c)
  const range = candleRange(c)
  if (range === 0) return null
  const bodyBottomRatio = (Math.min(c.open, c.close) - c.low) / range
  if (upper >= body * 2 && lower <= body * 0.2 && bodyBottomRatio <= 0.3 && body > 0) {
    return { pattern: 'Shooting Star', direction: 'bearish', strength: 'strong', confidence: 78 }
  }
  return null
}

function detectBearishEngulfing(c1, c2) {
  if (!isBullish(c1) || !isBearish(c2)) return null
  if (c2.open >= c1.close && c2.close <= c1.open) {
    return { pattern: 'Bearish Engulfing', direction: 'bearish', strength: 'very strong', confidence: 88 }
  }
  return null
}

function detectEveningStar(c1, c2, c3) {
  const body1 = bodySize(c1)
  const body2 = bodySize(c2)
  const midC1 = (c1.open + c1.close) / 2
  if (
    isBullish(c1) && body1 > 0 &&
    body2 <= body1 * 0.35 &&
    c2.low > c1.close &&
    isBearish(c3) &&
    c3.close <= midC1
  ) {
    return { pattern: 'Evening Star', direction: 'bearish', strength: 'very strong', confidence: 85 }
  }
  return null
}

function detectBearishMarubozu(c) {
  const body = bodySize(c)
  if (!isBearish(c) || body === 0) return null
  const upper = upperWick(c)
  const lower = lowerWick(c)
  if (upper <= body * 0.01 && lower <= body * 0.01) {
    return { pattern: 'Bearish Marubozu', direction: 'bearish', strength: 'strong', confidence: 82 }
  }
  return null
}

function detectThreeBlackCrows(c1, c2, c3) {
  if (!isBearish(c1) || !isBearish(c2) || !isBearish(c3)) return null
  const b1 = bodySize(c1), b2 = bodySize(c2), b3 = bodySize(c3)
  const opensWithinPrev =
    c2.open <= c1.open && c2.open >= c1.close &&
    c3.open <= c2.open && c3.open >= c2.close
  const closesNearLow =
    lowerWick(c1) <= b1 * 0.15 &&
    lowerWick(c2) <= b2 * 0.15 &&
    lowerWick(c3) <= b3 * 0.15
  if (opensWithinPrev && closesNearLow) {
    return { pattern: 'Three Black Crows', direction: 'bearish', strength: 'very strong', confidence: 90 }
  }
  return null
}

// ─── Strength Priority ────────────────────────────────────────────────────────
const STRENGTH_ORDER = { 'very strong': 4, 'strong': 3, 'medium': 2, 'weak': 1 }

// ─── Main Export ──────────────────────────────────────────────────────────────
/**
 * Detect the strongest candle pattern in the last 3–5 candles
 * @param {Array} candles - Array of candle objects { open, high, low, close, volume, timestamp } (most recent last)
 * @param {Object} keyLevels - { support: [...], resistance: [...] }
 * @returns {Object|null}
 */
export function detectCandlePattern(candles = [], keyLevels = {}) {
  if (!candles || candles.length < 2) return null

  // Build proper candle objects from arrays if needed
  const buildCandle = (c) => ({
    open: c.open ?? 0,
    high: c.high ?? 0,
    low: c.low ?? 0,
    close: c.close ?? 0,
    volume: c.volume ?? 0,
    timestamp: c.timestamp ?? 0,
  })

  const cs = candles.slice(-5).map(buildCandle)
  const len = cs.length
  const c0 = len >= 1 ? cs[len - 1] : null  // most recent
  const c1 = len >= 2 ? cs[len - 2] : null  // 1 ago
  const c2 = len >= 3 ? cs[len - 3] : null  // 2 ago

  const candidates = []

  if (c0) {
    const h = detectHammer(c0)
    if (h) candidates.push({ ...h, candle: 1 })

    const ss = detectShootingStar(c0)
    if (ss) candidates.push({ ...ss, candle: 1 })

    const bm = detectBullishMarubozu(c0)
    if (bm) candidates.push({ ...bm, candle: 1 })

    const berm = detectBearishMarubozu(c0)
    if (berm) candidates.push({ ...berm, candle: 1 })

    const doji = detectBullishDoji(c0, keyLevels)
    if (doji) candidates.push({ ...doji, candle: 1 })
  }

  if (c0 && c1) {
    const be = detectBullishEngulfing(c1, c0)
    if (be) candidates.push({ ...be, candle: 1 })

    const bere = detectBearishEngulfing(c1, c0)
    if (bere) candidates.push({ ...bere, candle: 1 })
  }

  if (c0 && c1 && c2) {
    const ms = detectMorningStar(c2, c1, c0)
    if (ms) candidates.push({ ...ms, candle: 1 })

    const es = detectEveningStar(c2, c1, c0)
    if (es) candidates.push({ ...es, candle: 1 })

    const tws = detectThreeWhiteSoldiers(c2, c1, c0)
    if (tws) candidates.push({ ...tws, candle: 1 })

    const tbc = detectThreeBlackCrows(c2, c1, c0)
    if (tbc) candidates.push({ ...tbc, candle: 1 })
  }

  if (candidates.length === 0) return null

  // Filter out weak doji unless at key level
  const strong = candidates.filter(p => p.strength !== 'weak')
  const pool = strong.length > 0 ? strong : candidates

  // Sort by strength then confidence
  pool.sort((a, b) => {
    const sd = (STRENGTH_ORDER[b.strength] || 0) - (STRENGTH_ORDER[a.strength] || 0)
    return sd !== 0 ? sd : (b.confidence || 0) - (a.confidence || 0)
  })

  const best = pool[0]
  const price = c0 ? c0.close : 0
  const allLevels = [...(keyLevels?.support || []), ...(keyLevels?.resistance || [])]
  const nearestLevel = isNearLevel(price, allLevels, 1.5)

  // Boost confidence if at key level
  const atKeyLevel = !!nearestLevel
  const finalConfidence = atKeyLevel
    ? Math.min(95, (best.confidence || 70) + 8)
    : (best.confidence || 70)

  return {
    pattern: best.pattern,
    direction: best.direction,
    strength: best.strength,
    candle: best.candle,
    atKeyLevel,
    nearestLevel: nearestLevel || null,
    confidence: finalConfidence,
    entrySignal: atKeyLevel && best.strength !== 'weak',
    description: buildDescription(best.pattern, best.direction, price, nearestLevel),
    note: best.note || null,
  }
}

if (process.argv[2] === 'test') {
  // Test Bullish Engulfing
  const engulfingCandles = [
    { open: 100, high: 105, low: 98, close: 99, volume: 1000, timestamp: Date.now() - 2000 },
    { open: 97, high: 108, low: 96, close: 107, volume: 1500, timestamp: Date.now() - 1000 },
  ]
  console.log('Bullish Engulfing test:', JSON.stringify(detectCandlePattern(engulfingCandles, {}), null, 2))

  // Test Hammer
  const hammerCandles = [
    { open: 100, high: 101, low: 88, close: 100.5, volume: 1000, timestamp: Date.now() },
  ]
  console.log('Hammer test:', JSON.stringify(detectCandlePattern(hammerCandles, {}), null, 2))

  // Test Three White Soldiers
  const twsCandles = [
    { open: 100, high: 104, low: 99, close: 104, volume: 1000, timestamp: Date.now() - 3000 },
    { open: 101, high: 108, low: 100, close: 108, volume: 1200, timestamp: Date.now() - 2000 },
    { open: 104, high: 113, low: 103, close: 113, volume: 1400, timestamp: Date.now() - 1000 },
  ]
  console.log('Three White Soldiers test:', JSON.stringify(detectCandlePattern(twsCandles, {}), null, 2))

  // Test with key level
  const hammerAtSupport = [
    { open: 1000, high: 1005, low: 980, close: 1002, volume: 1000, timestamp: Date.now() },
  ]
  console.log('Hammer at support:', JSON.stringify(detectCandlePattern(hammerAtSupport, { support: [985] }), null, 2))
}
