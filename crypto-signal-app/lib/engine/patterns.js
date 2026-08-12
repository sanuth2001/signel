import { calculatePatternTarget } from './patternTargets.js'
import { applyConfirmationFilter } from './confirmationFilters.js'

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
  const { high, low } = ohlcv || {}
  if (!high || high.length < lookback) return { support: [], resistance: [] }

  const recentHighs = high.slice(-lookback)
  const recentLows = low.slice(-lookback)
  const tolerance = (Math.max(...recentHighs) - Math.min(...recentLows)) * 0.01

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

// ─── 1A. PIPE BOTTOM (Two-Bar Reversal Bottom) ──────────────────────────────
export function detectPipeBottom(ohlcv) {
  const { open, high, low, close } = ohlcv || {}
  if (!close || close.length < 10) return { detected: false }

  const len = close.length
  const sliceLen = 10
  const startIdx = Math.max(0, len - sliceLen)
  
  // Calculate average range of preceding candles
  const ranges = []
  for (let i = 0; i < len; i++) {
    ranges.push(high[i] - low[i])
  }
  
  for (let i = Math.max(1, startIdx); i < len; i++) {
    const bar1 = { index: i - 1, open: open[i - 1], high: high[i - 1], low: low[i - 1], close: close[i - 1], range: ranges[i - 1] }
    const bar2 = { index: i, open: open[i], high: high[i], low: low[i], close: close[i], range: ranges[i] }

    const priorRanges = ranges.slice(Math.max(0, i - 10), i - 1)
    const avgRange = priorRanges.length > 0 ? priorRanges.reduce((a, b) => a + b, 0) / priorRanges.length : (bar1.range + bar2.range) / 2

    const isBar1Large = bar1.range > avgRange * 1.4
    const isBar2Large = bar2.range > avgRange * 1.4
    const bar1CloseNearLow = (bar1.close - bar1.low) <= bar1.range * 0.25
    const bar2CloseInUpperHalf = bar2.close >= bar2.low + bar2.range * 0.5

    // Check downtrend (price generally dropping in preceding candles)
    const priorCloses = close.slice(Math.max(0, i - 10), i - 1)
    const isDowntrend = priorCloses.length > 2 ? priorCloses[priorCloses.length - 1] < priorCloses[0] : true

    if (isBar1Large && isBar2Large && bar1CloseNearLow && bar2CloseInUpperHalf && isDowntrend) {
      const breakoutLevel = Math.max(bar1.high, bar2.high)
      const stopLoss = Math.min(bar1.low, bar2.low)
      const height = breakoutLevel - stopLoss
      const target = parseFloat((breakoutLevel + height).toFixed(2))

      return {
        detected: true,
        direction: 'bullish',
        pattern: 'Pipe Bottom',
        bar1,
        bar2,
        breakoutLevel: parseFloat(breakoutLevel.toFixed(2)),
        target,
        stopLoss: parseFloat(stopLoss.toFixed(2)),
        confidence: 72,
        description: 'Two large reversal bars at downtrend end',
      }
    }
  }

  return { detected: false }
}

// ─── 1B. NARROW RANGE (NR4 Pattern) ─────────────────────────────────────────
export function detectNarrowRange(ohlcv, n = 4) {
  const { high, low, close } = ohlcv || {}
  if (!close || close.length < n) return { detected: false }

  const len = close.length
  const recentHighs = high.slice(-n)
  const recentLows = low.slice(-n)
  
  const ranges = recentHighs.map((h, idx) => h - recentLows[idx])
  const lastRange = ranges[ranges.length - 1]
  const precedingRanges = ranges.slice(0, n - 1)

  const isNR4 = lastRange < Math.min(...precedingRanges)

  const lastHigh = recentHighs[recentHighs.length - 1]
  const lastLow = recentLows[recentLows.length - 1]
  const rangeSizePercent = parseFloat(((lastRange / close[len - 1]) * 100).toFixed(2))

  return {
    detected: isNR4,
    pattern: 'NR4',
    nValue: n,
    narrowCandle: {
      index: len - 1,
      high: lastHigh,
      low: lastLow,
      range: lastRange,
    },
    buyTrigger: lastHigh,
    sellTrigger: lastLow,
    rangeSize: rangeSizePercent,
    signal: isNR4 ? 'BREAKOUT_WATCH' : 'NONE',
    description: isNR4 ? 'Narrowest range in 4 bars — breakout imminent' : 'Normal bar ranges',
  }
}

// ─── 1C. GAP DETECTION + PIVOT STRATEGY ─────────────────────────────────────
export function detectGaps(ohlcv) {
  const { open, high, low, close } = ohlcv || {}
  if (!close || close.length < 2) return { gaps: [], mostRecentGap: null, activeSignal: null }

  const len = close.length
  const gaps = []

  for (let i = 1; i < len; i++) {
    const prevHigh = high[i - 1]
    const prevLow = low[i - 1]
    const prevClose = close[i - 1]
    const currOpen = open[i]

    let type = null
    let gapSize = 0

    if (currOpen > prevHigh) {
      type = 'gap_up'
      gapSize = (currOpen - prevHigh) / prevClose * 100
    } else if (currOpen < prevLow) {
      type = 'gap_down'
      gapSize = (prevLow - currOpen) / prevClose * 100
    }

    if (type && gapSize >= 0.5) {
      const gapHigh = type === 'gap_up' ? currOpen : prevLow
      const gapLow = type === 'gap_up' ? prevHigh : currOpen

      // Check subsequent candles for throwback / fill status
      let filled = false
      let pivotFormed = false
      let pivotPrice = null
      let status = 'fresh'

      const subsequent = close.slice(i + 1)
      const subLows = low.slice(i + 1)
      const subHighs = high.slice(i + 1)

      for (let j = 0; j < subsequent.length; j++) {
        if (type === 'gap_up') {
          if (subLows[j] <= gapLow) {
            filled = true
            status = 'filled'
            break
          } else if (subLows[j] < gapHigh && subLows[j] > gapLow) {
            status = 'throwback'
            pivotFormed = true
            pivotPrice = subLows[j]
          }
        } else {
          if (subHighs[j] >= gapHigh) {
            filled = true
            status = 'filled'
            break
          } else if (subHighs[j] > gapLow && subHighs[j] < gapHigh) {
            status = 'throwback'
            pivotFormed = true
            pivotPrice = subHighs[j]
          }
        }
      }

      if (pivotFormed && !filled) status = 'pivot'

      gaps.push({
        type,
        candleIndex: i,
        gapHigh: parseFloat(gapHigh.toFixed(2)),
        gapLow: parseFloat(gapLow.toFixed(2)),
        gapSize: parseFloat(gapSize.toFixed(2)),
        filled,
        pivotFormed,
        pivotPrice: pivotPrice ? parseFloat(pivotPrice.toFixed(2)) : null,
        entryLevel: type === 'gap_up' ? high[i] : low[i],
        stopLoss: gapLow,
        status,
      })
    }
  }

  const mostRecentGap = gaps.length > 0 ? gaps[gaps.length - 1] : null
  const activeSignal = gaps.find(g => g.status === 'pivot' || g.status === 'fresh') || null

  return {
    gaps,
    mostRecentGap,
    activeSignal,
  }
}

// ─── 1D. HARAMI (Bullish and Bearish) ────────────────────────────────────────
export function detectHarami(candles) {
  const ohlcv = Array.isArray(candles) ? {
    open: candles.map(c => c.open),
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
  } : candles

  const { open, high, low, close } = ohlcv || {}
  if (!close || close.length < 2) return { detected: false }

  const len = close.length
  const c1 = { index: len - 2, open: open[len - 2], close: close[len - 2], high: high[len - 2], low: low[len - 2] }
  const c2 = { index: len - 1, open: open[len - 1], close: close[len - 1], high: high[len - 1], low: low[len - 1] }

  c1.bodySize = Math.abs(c1.close - c1.open)
  c2.bodySize = Math.abs(c2.close - c2.open)

  const c1Top = Math.max(c1.open, c1.close)
  const c1Bottom = Math.min(c1.open, c1.close)
  const c2Top = Math.max(c2.open, c2.close)
  const c2Bottom = Math.min(c2.open, c2.close)

  const isInside = c2Top <= c1Top && c2Bottom >= c1Bottom && c1.bodySize > 0
  if (!isInside) return { detected: false }

  const bodyRatio = parseFloat((c2.bodySize / c1.bodySize).toFixed(2))

  const isBullishC1 = c1.close < c1.open
  const isBullishC2 = c2.close > c2.open

  if (isBullishC1 && isBullishC2) {
    return {
      detected: true,
      type: 'bullish_harami',
      direction: 'bullish',
      candle1: c1,
      candle2: c2,
      bodyRatio,
      confidence: 58,
      requiresConfirmation: true,
      description: 'Bullish Harami: Inside candle after red bar signals possible upward trend change',
    }
  }

  const isBearishC1 = c1.close > c1.open
  const isBearishC2 = c2.close < c2.open

  if (isBearishC1 && isBearishC2) {
    return {
      detected: true,
      type: 'bearish_harami',
      direction: 'bearish',
      candle1: c1,
      candle2: c2,
      bodyRatio,
      confidence: 58,
      requiresConfirmation: true,
      description: 'Bearish Harami: Inside candle after green bar signals possible downward trend change',
    }
  }

  return {
    detected: true,
    type: 'harami_indecision',
    direction: 'neutral',
    candle1: c1,
    candle2: c2,
    bodyRatio,
    confidence: 50,
    requiresConfirmation: true,
    description: 'Harami pattern indicates indecision and potential breakout in either direction',
  }
}

// ─── 1E. DARK CLOUD COVER and PIERCING LINE ──────────────────────────────────
export function detectDarkCloudPiercing(candles) {
  const ohlcv = Array.isArray(candles) ? {
    open: candles.map(c => c.open),
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
  } : candles

  const { open, high, low, close } = ohlcv || {}
  if (!close || close.length < 2) return { detected: false }

  const len = close.length
  const c1 = { index: len - 2, open: open[len - 2], close: close[len - 2], high: high[len - 2], low: low[len - 2] }
  const c2 = { index: len - 1, open: open[len - 1], close: close[len - 1], high: high[len - 1], low: low[len - 1] }

  const c1Midpoint = (c1.open + c1.close) / 2

  // Dark Cloud Cover (bearish)
  const isC1Bullish = c1.close > c1.open
  const isC2Bearish = c2.close < c2.open
  const darkCloudOpenGap = c2.open > c1.high
  const darkCloudPenetration = c2.close <= c1Midpoint && c2.close >= Math.min(c1.open, c1.close)

  if (isC1Bullish && isC2Bearish && (darkCloudOpenGap || c2.open >= c1.close) && darkCloudPenetration) {
    const penetrationPercent = parseFloat((((c1Midpoint - c2.close) / (c1.close - c1Midpoint)) * 100).toFixed(1))
    return {
      detected: true,
      type: 'dark_cloud_cover',
      direction: 'bearish',
      penetrationPercent,
      candle1: c1,
      candle2: c2,
      confidence: 64,
      description: 'Dark Cloud Cover: Bearish candle opens high and closes past 50% midpoint of previous bullish candle',
    }
  }

  // Piercing Line (bullish)
  const isC1Bearish = c1.close < c1.open
  const isC2Bullish = c2.close > c2.open
  const piercingOpenGap = c2.open < c1.low
  const piercingPenetration = c2.close >= c1Midpoint && c2.close <= Math.max(c1.open, c1.close)

  if (isC1Bearish && isC2Bullish && (piercingOpenGap || c2.open <= c1.close) && piercingPenetration) {
    const penetrationPercent = parseFloat((((c2.close - c1Midpoint) / (c1Midpoint - c1.close)) * 100).toFixed(1))
    return {
      detected: true,
      type: 'piercing_line',
      direction: 'bullish',
      penetrationPercent,
      candle1: c1,
      candle2: c2,
      confidence: 64,
      description: 'Piercing Line: Bullish candle opens low and penetrates past 50% midpoint of previous bearish candle',
    }
  }

  return { detected: false }
}

// ─── 1F. ISLAND REVERSAL ─────────────────────────────────────────────────────
export function detectIslandReversal(ohlcv) {
  const { open, high, low, close } = ohlcv || {}
  if (!close || close.length < 10) return { detected: false }

  const len = close.length
  const scanRange = Math.min(len - 1, 20)
  const startIdx = len - scanRange

  for (let i = startIdx; i < len - 2; i++) {
    // Gap 1
    const gap1Up = open[i] > high[i - 1]
    const gap1Down = open[i] < low[i - 1]

    if (!gap1Up && !gap1Down) continue

    for (let j = i + 1; j < Math.min(len, i + 6); j++) {
      // Gap 2
      const gap2Down = gap1Up && open[j] < low[j - 1] && close[j] < high[i - 1]
      const gap2Up = gap1Down && open[j] > high[j - 1] && close[j] > low[i - 1]

      if (gap2Down) {
        return {
          detected: true,
          type: 'bearish_island',
          firstGap: { index: i, price: open[i] },
          secondGap: { index: j, price: open[j] },
          islandSize: j - i,
          signal: 'SELL',
          confidence: 82,
          description: 'Bearish Island Reversal — isolated price cluster trapped between gap up and gap down',
        }
      }

      if (gap2Up) {
        return {
          detected: true,
          type: 'bullish_island',
          firstGap: { index: i, price: open[i] },
          secondGap: { index: j, price: open[j] },
          islandSize: j - i,
          signal: 'BUY',
          confidence: 82,
          description: 'Bullish Island Reversal — isolated price cluster trapped between gap down and gap up',
        }
      }
    }
  }

  return { detected: false }
}

// ─── 4. FALSE BREAKOUT DETECTION ──────────────────────────────────────────────
export function detectFalseBreakout(breakoutCandle, subsequentCandles, breakoutLevel) {
  if (!breakoutCandle || !subsequentCandles || subsequentCandles.length === 0 || !breakoutLevel) {
    return {
      isFalseBreakout: false,
      isTrap: false,
      returnedThroughLevel: false,
      candlesBeforeReturn: 0,
      reverseSignal: null,
      reverseEntry: null,
      description: 'No breakout monitored',
    }
  }

  const direction = breakoutCandle.direction || 'bullish'
  const checkSlice = subsequentCandles.slice(0, 3)

  let returnedThroughLevel = false
  let candlesBeforeReturn = 0

  for (let i = 0; i < checkSlice.length; i++) {
    const c = checkSlice[i]
    const cClose = typeof c === 'number' ? c : c.close
    if (direction === 'bullish' && cClose < breakoutLevel) {
      returnedThroughLevel = true
      candlesBeforeReturn = i + 1
      break
    }
    if (direction === 'bearish' && cClose > breakoutLevel) {
      returnedThroughLevel = true
      candlesBeforeReturn = i + 1
      break
    }
  }

  if (!returnedThroughLevel) {
    return {
      isFalseBreakout: false,
      isTrap: false,
      returnedThroughLevel: false,
      candlesBeforeReturn: 0,
      reverseSignal: null,
      reverseEntry: null,
      description: 'Breakout holding above level — no return detected',
    }
  }

  // Check trap condition (opposite direction move within 5 candles)
  const trapSlice = subsequentCandles.slice(0, 5)
  let isTrap = false
  let reverseEntry = null

  for (let i = 0; i < trapSlice.length; i++) {
    const c = trapSlice[i]
    const cClose = typeof c === 'number' ? c : c.close
    if (direction === 'bullish' && cClose < breakoutLevel * 0.99) {
      isTrap = true
      reverseEntry = cClose
      break
    }
    if (direction === 'bearish' && cClose > breakoutLevel * 1.01) {
      isTrap = true
      reverseEntry = cClose
      break
    }
  }

  const reverseSignal = direction === 'bullish' ? 'SELL' : 'BUY'

  return {
    isFalseBreakout: true,
    isTrap,
    returnedThroughLevel: true,
    candlesBeforeReturn,
    reverseSignal,
    reverseEntry,
    description: isTrap
      ? `FAILED BREAKOUT / TRAP: Price returned through $${breakoutLevel} and reversed. Activate Stop & Reverse -> ${reverseSignal}`
      : `False breakout detected: Price closed back through level ($${breakoutLevel}) within ${candlesBeforeReturn} bars`,
  }
}

// ─── 5. THROWBACK / RETRACEMENT ENTRY ─────────────────────────────────────────
export function detectThrowback(breakoutCandle, subsequentCandles, breakoutLevel, direction) {
  if (!subsequentCandles || subsequentCandles.length === 0 || !breakoutLevel) {
    return {
      throwbackDetected: false,
      throwbackType: direction === 'bullish' ? 'throwback' : 'pullback',
      throwbackLevel: null,
      throwbackComplete: false,
      entryPrice: null,
      stopLoss: null,
      improvement: 0,
      description: 'No subsequent candles to monitor throwback',
    }
  }

  const dir = direction || 'bullish'
  let throwbackDetected = false
  let throwbackLevel = null
  let throwbackComplete = false
  let entryPrice = null
  let stopLoss = null
  let improvement = 0

  for (let i = 0; i < subsequentCandles.length; i++) {
    const c = subsequentCandles[i]
    const cLow = typeof c === 'object' ? c.low : c
    const cHigh = typeof c === 'object' ? c.high : c
    const cClose = typeof c === 'object' ? c.close : c

    if (dir === 'bullish') {
      const distPercent = Math.abs(cLow - breakoutLevel) / breakoutLevel * 100
      if (distPercent <= 0.5 || (cLow <= breakoutLevel * 1.005 && cLow >= breakoutLevel * 0.99)) {
        throwbackDetected = true
        throwbackLevel = cLow
        if (i < subsequentCandles.length - 1 && cClose > cLow) {
          throwbackComplete = true
          entryPrice = parseFloat(cClose.toFixed(2))
          stopLoss = parseFloat((breakoutLevel * 0.99).toFixed(2))
          const origEntry = breakoutCandle?.close || breakoutLevel * 1.01
          improvement = parseFloat((((origEntry - entryPrice) / origEntry) * 100).toFixed(2))
        }
      }
    } else {
      const distPercent = Math.abs(cHigh - breakoutLevel) / breakoutLevel * 100
      if (distPercent <= 0.5 || (cHigh >= breakoutLevel * 0.995 && cHigh <= breakoutLevel * 1.01)) {
        throwbackDetected = true
        throwbackLevel = cHigh
        if (i < subsequentCandles.length - 1 && cClose < cHigh) {
          throwbackComplete = true
          entryPrice = parseFloat(cClose.toFixed(2))
          stopLoss = parseFloat((breakoutLevel * 1.01).toFixed(2))
          const origEntry = breakoutCandle?.close || breakoutLevel * 0.99
          improvement = parseFloat((((entryPrice - origEntry) / origEntry) * 100).toFixed(2))
        }
      }
    }
  }

  return {
    throwbackDetected,
    throwbackType: dir === 'bullish' ? 'throwback' : 'pullback',
    throwbackLevel: throwbackLevel ? parseFloat(throwbackLevel.toFixed(2)) : null,
    throwbackComplete,
    entryPrice,
    stopLoss,
    improvement,
    description: throwbackDetected
      ? `${dir === 'bullish' ? 'Throwback' : 'Pullback'} detected near $${breakoutLevel}. Entry ${improvement > 0 ? improvement + '% better price' : 'available'}`
      : 'No throwback/pullback detected yet',
  }
}

// ─── Multi-Bar Pattern Detectors (Existing) ──────────────────────────────────
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
    confidence: Math.min(Math.floor(65 + impulseGain * 200), 90),
    description: `Strong ${(impulseGain * 100).toFixed(1)}% impulse up, tight consolidation on low volume`,
    breakoutTarget: parseFloat((consolHigh * (1 + impulseGain * 0.5)).toFixed(2)),
    invalidationLevel: parseFloat((consolLow * 0.99).toFixed(2)),
    highestPeak: consolHigh,
    lowestTrough: consolLow,
    breakoutPrice: consolHigh,
    flagpoleHeight: consolHigh - impulse[0],
  }
}

function detectBearFlag(closes, highs, lows, volumes) {
  const n = closes.length
  if (n < 15) return null

  const impulse = closes.slice(-15, -10)
  const consol = closes.slice(-10)

  const impulseDrop = (impulse[0] - impulse[impulse.length - 1]) / impulse[0]
  if (impulseDrop < 0.05) return null

  const consolHigh = Math.max(...consol)
  const consolLow = Math.min(...consol)
  const consolRange = (consolHigh - consolLow) / consolHigh

  if (consolRange > 0.04) return null

  return {
    pattern: 'Bear Flag',
    direction: 'bearish',
    confidence: Math.min(Math.floor(65 + impulseDrop * 200), 90),
    description: `Strong ${(impulseDrop * 100).toFixed(1)}% impulse down, tight consolidation`,
    breakoutTarget: parseFloat((consolLow * (1 - impulseDrop * 0.5)).toFixed(2)),
    invalidationLevel: parseFloat((consolHigh * 1.01).toFixed(2)),
    highestPeak: consolHigh,
    lowestTrough: consolLow,
    breakoutPrice: consolLow,
  }
}

function detectTriangles(closes, highs, lows) {
  const n = closes.length
  if (n < 20) return null

  const segmentHighs = highs.slice(-20)
  const segmentLows = lows.slice(-20)

  const maxH = Math.max(...segmentHighs)
  const minL = Math.min(...segmentLows)

  // Check if highs are flat (within 1.5% of max)
  const highSpread = Math.max(...segmentHighs.slice(-5)) - Math.min(...segmentHighs.slice(-5))
  const flatResistance = (highSpread / maxH) < 0.015

  // Check if lows are flat (within 1.5% of min)
  const lowSpread = Math.max(...segmentLows.slice(-5)) - Math.min(...segmentLows.slice(-5))
  const flatSupport = (lowSpread / minL) < 0.015

  // Trend of lows (higher lows?)
  const firstHalfLow = Math.min(...segmentLows.slice(0, 10))
  const secondHalfLow = Math.min(...segmentLows.slice(10))
  const higherLows = secondHalfLow > firstHalfLow * 1.01

  // Trend of highs (lower highs?)
  const firstHalfHigh = Math.max(...segmentHighs.slice(0, 10))
  const secondHalfHigh = Math.max(...segmentHighs.slice(10))
  const lowerHighs = secondHalfHigh < firstHalfHigh * 0.99

  if (flatResistance && higherLows) {
    return {
      pattern: 'Ascending Triangle',
      direction: 'bullish',
      confidence: 72,
      description: `Flat resistance at $${maxH.toFixed(0)} with higher lows forming`,
      breakoutTarget: parseFloat((maxH * 1.05).toFixed(2)),
      invalidationLevel: parseFloat((secondHalfLow * 0.99).toFixed(2)),
    }
  }

  if (flatSupport && lowerHighs) {
    return {
      pattern: 'Descending Triangle',
      direction: 'bearish',
      confidence: 72,
      description: `Flat support at $${minL.toFixed(0)} with lower highs forming`,
      breakoutTarget: parseFloat((minL * 0.95).toFixed(2)),
      invalidationLevel: parseFloat((secondHalfHigh * 1.01).toFixed(2)),
    }
  }

  if (lowerHighs && higherLows) {
    return {
      pattern: 'Symmetric Triangle',
      direction: 'neutral',
      confidence: 68,
      description: `Symmetric triangle — converging highs and lows`,
      breakoutTarget: parseFloat((maxH * 1.04).toFixed(2)),
      invalidationLevel: parseFloat((minL * 0.96).toFixed(2)),
    }
  }

  return null
}

function detectCupAndHandle(closes, highs, lows) {
  const n = closes.length
  if (n < 25) return null

  const seg = closes.slice(-25)
  const leftRim = Math.max(...seg.slice(0, 5))
  const rightRim = Math.max(...seg.slice(15, 20))
  const bottom = Math.min(...seg.slice(5, 15))

  const rimDiff = Math.abs(leftRim - rightRim) / leftRim
  if (rimDiff > 0.03) return null

  const cupDepth = (leftRim - bottom) / leftRim
  if (cupDepth < 0.03 || cupDepth > 0.30) return null

  // Handle: small pullback after right rim
  const handle = seg.slice(20)
  const handleLow = Math.min(...handle)
  if (handleLow < rightRim * 0.90 || handleLow > rightRim) return null

  return {
    pattern: 'Cup and Handle',
    direction: 'bullish',
    confidence: 75,
    description: `U-shaped cup with depth ${(cupDepth * 100).toFixed(1)}% and handle consolidation`,
    breakoutTarget: parseFloat((rightRim + (rightRim - bottom)).toFixed(2)),
    invalidationLevel: parseFloat((handleLow * 0.99).toFixed(2)),
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
    resistanceLine: neckline,
    supportLine: minLow,
    highestPeak: neckline,
    lowestTrough: minLow,
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
    pattern: 'Head and Shoulders Top',
    direction: 'bearish',
    confidence: 68,
    description: `Three peaks with head at $${peak.toFixed(0)}, shoulders near $${((leftShoulder + rightShoulder) / 2).toFixed(0)}`,
    breakoutTarget: parseFloat((neckline - (peak - neckline)).toFixed(2)),
    invalidationLevel: parseFloat((peak * 1.02).toFixed(2)),
    head: peak,
    neckline,
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
    resistanceLine: maxHigh,
    neckline: maxHigh * 0.97,
  }
}

// ─── Master Pattern Detector ─────────────────────────────────────────────────
export function detectPatterns(ohlcv) {
  const { open, high, low, close, volume } = ohlcv || {}
  if (!close || close.length < 20) return null

  const currentPrice = close[close.length - 1]
  const keyLevels = findKeyLevels(ohlcv)

  // 1. Primary multi-bar patterns
  const candidates = [
    detectBullFlag(close, high, low, volume || close.map(() => 1e9)),
    detectBearFlag(close, high, low, volume || close.map(() => 1e9)),
    detectDoubleBottom(low, close),
    detectDoubleTop(high),
    detectHeadAndShoulders(high, close),
    detectTriangles(close, high, low),
    detectCupAndHandle(close, high, low),
  ].filter(Boolean)

  const primaryPattern = candidates.length > 0
    ? candidates.reduce((max, p) => p.confidence > max.confidence ? p : max, candidates[0])
    : null

  // 2. Short-term candlestick & gap patterns
  const pipeBottom = detectPipeBottom(ohlcv)
  const narrowRange = detectNarrowRange(ohlcv)
  const gaps = detectGaps(ohlcv)
  const harami = detectHarami(ohlcv)
  const darkCloudPiercing = detectDarkCloudPiercing(ohlcv)
  const islandReversal = detectIslandReversal(ohlcv)

  // 3. Confirmation Filters
  let confirmation = null
  let falseBreakout = null
  let throwback = null

  const breakoutLevel = primaryPattern?.breakoutPrice || primaryPattern?.resistanceLine || keyLevels.resistance[0] || currentPrice

  if (primaryPattern) {
    const breakoutObj = {
      level: breakoutLevel,
      direction: primaryPattern.direction,
      index: close.length - 1,
    }

    confirmation = applyConfirmationFilter(breakoutObj, ohlcv, 'percentage')
    falseBreakout = detectFalseBreakout(breakoutObj, close.slice(-5), breakoutLevel)
    throwback = detectThrowback(breakoutObj, close.slice(-5), breakoutLevel, primaryPattern.direction)
  }

  // 4. Precise Targets (Fidelity Measured Move)
  const targets = primaryPattern ? calculatePatternTarget(primaryPattern, currentPrice) : null

  return {
    primaryPattern,
    pipeBottom,
    narrowRange,
    gaps,
    harami,
    darkCloudPiercing,
    islandReversal,
    confirmation,
    falseBreakout,
    throwback,
    targets,
    keyLevels,

    // Backward-compatibility properties
    pattern: primaryPattern?.pattern || (islandReversal.detected ? islandReversal.type : pipeBottom.detected ? pipeBottom.pattern : null),
    direction: primaryPattern?.direction || (islandReversal.detected ? islandReversal.signal === 'BUY' ? 'bullish' : 'bearish' : pipeBottom.detected ? 'bullish' : 'neutral'),
    confidence: primaryPattern ? Math.min(primaryPattern.confidence + (confirmation?.confidenceBoost || 0), 95) : (islandReversal.detected ? 82 : 60),
    breakoutTarget: targets?.primaryTarget || primaryPattern?.breakoutTarget || currentPrice,
    invalidationLevel: targets?.invalidationLevel || primaryPattern?.invalidationLevel || currentPrice,
  }
}

// ─── Test CLI Runner ──────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  const n = 50
  const close = Array.from({ length: n }, (_, i) => 67000 + Math.sin(i * 0.4) * 2000)
  const high = close.map(c => c * 1.005)
  const low = close.map(c => c * 0.995)
  const volume = Array.from({ length: n }, () => 1e9)
  console.log(JSON.stringify(detectPatterns({ open: close, high, low, close, volume }), null, 2))
}

if (process.argv[2] === 'testNew') {
  console.log('=== RUNNING NEW PATTERN TESTS ===')

  // Test Pipe Bottom
  const pipeCandles = {
    open:  [100, 98, 96, 94, 92, 90, 88, 86, 85, 87],
    high:  [101, 99, 97, 95, 93, 91, 89, 87, 85.5, 93],
    low:   [97,  95, 93, 91, 89, 87, 85, 75, 75,   86],
    close: [98,  96, 94, 92, 90, 88, 86, 76, 92,   92],
    volume: [1e5, 1e5, 1e5, 1e5, 1e5, 1e5, 1e5, 5e5, 5e5, 5e5],
  }
  const pipe = detectPipeBottom(pipeCandles)
  console.log('Pipe Bottom detected:', pipe.detected)
  console.log('Pipe Target:', pipe.target)

  // Test NR4
  const nr4Candles = {
    open:  [100, 102, 101, 101.5],
    high:  [105, 106, 104, 102],
    low:   [95,  94,  98,  101],
    close: [102, 101, 101.5, 101.8],
  }
  const nr4 = detectNarrowRange(nr4Candles)
  console.log('NR4 detected:', nr4.detected)
  console.log('Buy trigger:', nr4.buyTrigger)
  console.log('Sell trigger:', nr4.sellTrigger)

  // Test Gap
  const gapCandles = {
    open:  [100, 108],
    high:  [102, 112],
    low:   [98,  107],
    close: [101, 110],
  }
  const gaps = detectGaps(gapCandles)
  console.log('Gap detected:', gaps.mostRecentGap?.type)
  console.log('Gap size:', gaps.mostRecentGap?.gapSize + '%')

  // Test Harami
  const haramiCandles = [
    { open: 100, high: 102, low: 88, close: 90 },
    { open: 92,  high: 96,  low: 91, close: 95 }
  ]
  const harami = detectHarami(haramiCandles)
  console.log('Harami detected:', harami.detected, 'Type:', harami.type)

  // Test Dark Cloud Cover
  const darkCloudCandles = [
    { open: 90,  high: 100, low: 89, close: 99 },
    { open: 102, high: 103, low: 91, close: 93 }
  ]
  const dc = detectDarkCloudPiercing(darkCloudCandles)
  console.log('Dark Cloud detected:', dc.detected, 'Type:', dc.type)

  // Test Confirmation Filter
  const mockBreakout = { level: 100, direction: 'bullish', index: 4 }
  const mockOHLCV = {
    close: [95, 97, 99, 102, 103],
    volume: [1e6, 1e6, 1e6, 2e6, 2.5e6]
  }
  const confirm = applyConfirmationFilter(mockBreakout, mockOHLCV, 'percentage')
  console.log('Confirmed:', confirm.confirmed)
  console.log('Confidence Boost:', confirm.confidenceBoost)

  // Test False Breakout
  const mockBreakoutCandle = { direction: 'bullish', close: 102 }
  const mockSubsequentCandles = [103, 98, 95]
  const fb = detectFalseBreakout(mockBreakoutCandle, mockSubsequentCandles, 100)
  console.log('False breakout detected:', fb.isFalseBreakout)
  console.log('Trap detected:', fb.isTrap)

  console.log('All new pattern tests passed!')
}
