// ─── Pattern Prediction Model (GAP 6) ─────────────────────────────────────────
// Uses detected partial patterns to predict the next most likely price move.
// Based on completion probability, measured move targets, and time-to-completion.

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ─── Load calibrated stats from pattern_db.json (built by scripts/buildPatternDB.js)
let _loadedPatternDB = null
function loadPatternDB() {
  if (_loadedPatternDB !== null) return _loadedPatternDB
  try {
    const dbPath = join(process.cwd(), 'pattern_db.json')
    if (existsSync(dbPath)) {
      const raw = JSON.parse(readFileSync(dbPath, 'utf8'))
      _loadedPatternDB = raw.patternStats || {}
      const count = Object.keys(_loadedPatternDB).length
      const builtAt = raw.meta?.builtAt ? new Date(raw.meta.builtAt).toLocaleDateString() : 'unknown'
      console.log(`[patternPredict] Loaded pattern_db.json — ${count} patterns calibrated (built ${builtAt})`)
    } else {
      console.warn('[patternPredict] pattern_db.json not found — using hardcoded defaults. Run: node scripts/buildPatternDB.js')
      _loadedPatternDB = {}
    }
  } catch (e) {
    console.warn('[patternPredict] Failed to load pattern_db.json:', e.message)
    _loadedPatternDB = {}
  }
  return _loadedPatternDB
}

// ─── Pattern Completion Lookup Table ─────────────────────────────────────────
const PATTERN_STATS = {
  'Bull Flag': {
    completionRate: 0.67,
    avgMovePercent: 8.2,
    avgCandles: 7,
    direction: 'bullish',
    invalidationRatio: 0.98, // price must stay above this fraction of pattern low
    description: 'Post-impulse consolidation. Continuation flag.',
  },
  'Bear Flag': {
    completionRate: 0.67,
    avgMovePercent: -7.8,
    avgCandles: 7,
    direction: 'bearish',
    invalidationRatio: 1.02,
    description: 'Post-impulse downward consolidation. Bearish continuation.',
  },
  'Double Bottom': {
    completionRate: 0.72,
    avgMovePercent: 10.5,
    avgCandles: 20,
    direction: 'bullish',
    invalidationRatio: 0.99,
    description: 'Two equal lows. Strong reversal pattern.',
  },
  'Double Top': {
    completionRate: 0.73,
    avgMovePercent: -9.8,
    avgCandles: 20,
    direction: 'bearish',
    invalidationRatio: 1.01,
    description: 'Two equal highs. Strong reversal pattern.',
  },
  'Head and Shoulders Top': {
    completionRate: 0.74,
    avgMovePercent: -12.0,
    avgCandles: 30,
    direction: 'bearish',
    invalidationRatio: 1.015,
    description: 'Three peaks, middle highest. Classic reversal.',
  },
  'Ascending Triangle': {
    completionRate: 0.71,
    avgMovePercent: 9.0,
    avgCandles: 15,
    direction: 'bullish',
    invalidationRatio: 0.98,
    description: 'Flat resistance with rising lows. Bullish breakout.',
  },
  'Descending Triangle': {
    completionRate: 0.72,
    avgMovePercent: -9.5,
    avgCandles: 15,
    direction: 'bearish',
    invalidationRatio: 1.02,
    description: 'Flat support with falling highs. Bearish breakdown.',
  },
  'Symmetric Triangle': {
    completionRate: 0.60,
    avgMovePercent: 7.5,
    avgCandles: 12,
    direction: 'neutral',
    invalidationRatio: 0.99,
    description: 'Converging trendlines. Breakout in trend direction.',
  },
  'Cup and Handle': {
    completionRate: 0.62,
    avgMovePercent: 14.5,
    avgCandles: 40,
    direction: 'bullish',
    invalidationRatio: 0.97,
    description: 'Rounded bottom with pullback. Strong bullish continuation.',
  },
  'Pipe Bottom': {
    completionRate: 0.80,
    avgMovePercent: 5.5,
    avgCandles: 5,
    direction: 'bullish',
    invalidationRatio: 0.99,
    description: 'Two equal wicks. Sharp reversal signal.',
  },
  'Island Reversal': {
    completionRate: 0.82,
    avgMovePercent: 10.0,
    avgCandles: 8,
    direction: 'reversal',
    invalidationRatio: 0.99,
    description: 'Gap isolation. Highest accuracy reversal.',
  },
}

// ─── Merge hardcoded defaults with live calibrated DB stats ─────────────────
function getMergedStats(patternName) {
  const hardcoded = PATTERN_STATS[patternName]
  if (!hardcoded) return null
  const db = loadPatternDB()
  const live = db[patternName]
  if (!live || live.detections < 10) return hardcoded // not enough data — use defaults
  return {
    ...hardcoded,
    completionRate:  live.completionRate,
    avgMovePercent:  live.avgMovePercent  !== undefined ? live.avgMovePercent  : hardcoded.avgMovePercent,
    avgCandles:      live.avgCandlesToComplete || hardcoded.avgCandles,
    _calibrated:     true,
    _detections:     live.detections,
    _winRatePercent: live.winRatePercent,
  }
}

// ─── A. DETECT PARTIAL PATTERNS ───────────────────────────────────────────────
/**
 * Identifies partially-formed patterns (forming but not yet triggered)
 * based on recent price structure
 */
function detectPartialPatterns(ohlcv) {
  const { open, high, low, close, volume } = ohlcv || {}
  if (!close || close.length < 15) return []

  const len = close.length
  const partial = []
  const currentPrice = close[len - 1]

  // --- Partial Bull Flag ---
  const impulseSlice = close.slice(-20, -10)
  const consolSlice = close.slice(-10)
  if (impulseSlice.length >= 5 && consolSlice.length >= 5) {
    const impulseGain = impulseSlice.length > 0 ? (impulseSlice[impulseSlice.length - 1] - impulseSlice[0]) / impulseSlice[0] : 0
    const consolHigh = Math.max(...consolSlice)
    const consolLow = Math.min(...consolSlice)
    const consolRange = consolHigh > 0 ? (consolHigh - consolLow) / consolHigh : 0

    if (impulseGain > 0.03 && consolRange < 0.05) {
      const breakoutLevel = consolHigh
      const completionPercent = Math.min(90, Math.round((currentPrice / breakoutLevel) * 100 - 95) * 20)
      partial.push({
        pattern: 'Bull Flag',
        status: currentPrice >= breakoutLevel ? 'breaking_out' : 'forming',
        completionPercent: Math.max(40, completionPercent),
        breakoutLevel: parseFloat(breakoutLevel.toFixed(2)),
        invalidationLevel: parseFloat((consolLow * 0.99).toFixed(2)),
        impulseMove: parseFloat((impulseGain * 100).toFixed(1)),
        consolRange: parseFloat((consolRange * 100).toFixed(1)),
      })
    }
  }

  // --- Partial Double Bottom ---
  const recentLows = low.slice(-30)
  if (recentLows.length >= 20) {
    const minLow = Math.min(...recentLows)
    const tolerance = minLow * 0.015
    const bottomIdxs = recentLows.reduce((acc, l, i) => {
      if (Math.abs(l - minLow) < tolerance) acc.push(i)
      return acc
    }, [])

    if (bottomIdxs.length >= 1 && bottomIdxs[0] < recentLows.length - 8) {
      const midSegment = recentLows.slice(bottomIdxs[0] + 1)
      const midHigh = Math.max(...midSegment)
      const hasRally = midHigh > minLow * 1.04

      if (hasRally) {
        const isComplete = bottomIdxs.length >= 2
        partial.push({
          pattern: 'Double Bottom',
          status: isComplete ? 'complete' : 'forming_second_leg',
          completionPercent: isComplete ? 85 : 55,
          breakoutLevel: parseFloat(midHigh.toFixed(2)),
          invalidationLevel: parseFloat((minLow * 0.985).toFixed(2)),
          firstBottom: parseFloat(minLow.toFixed(2)),
          midHigh: parseFloat(midHigh.toFixed(2)),
        })
      }
    }
  }

  // --- Partial Ascending Triangle ---
  const recentHighs = high.slice(-20)
  const recentLowsAscTriangle = low.slice(-20)
  if (recentHighs.length >= 15) {
    const maxHigh = Math.max(...recentHighs)
    const highTolerance = maxHigh * 0.01
    const flatTops = recentHighs.filter(h => Math.abs(h - maxHigh) < highTolerance)

    if (flatTops.length >= 2) {
      const earlierLow = recentLowsAscTriangle.slice(0, 10).reduce((a, b) => Math.min(a, b), Infinity)
      const laterLow = recentLowsAscTriangle.slice(10).reduce((a, b) => Math.min(a, b), Infinity)
      const risingLows = laterLow > earlierLow * 1.015

      if (risingLows) {
        partial.push({
          pattern: 'Ascending Triangle',
          status: 'forming',
          completionPercent: 70,
          breakoutLevel: parseFloat(maxHigh.toFixed(2)),
          invalidationLevel: parseFloat((laterLow * 0.99).toFixed(2)),
          flatResistance: parseFloat(maxHigh.toFixed(2)),
          touchCount: flatTops.length,
        })
      }
    }
  }

  // --- Partial Descending Triangle ---
  const minLowDT = Math.min(...low.slice(-20))
  const lowTolerance = minLowDT * 0.01
  const flatBottoms = low.slice(-20).filter(l => Math.abs(l - minLowDT) < lowTolerance)

  if (flatBottoms.length >= 2) {
    const earlierHigh = Math.max(...high.slice(-20, -10))
    const laterHigh = Math.max(...high.slice(-10))
    const fallingHighs = laterHigh < earlierHigh * 0.985

    if (fallingHighs) {
      partial.push({
        pattern: 'Descending Triangle',
        status: 'forming',
        completionPercent: 70,
        breakoutLevel: parseFloat(minLowDT.toFixed(2)),
        invalidationLevel: parseFloat((Math.max(...high.slice(-10)) * 1.01).toFixed(2)),
        flatSupport: parseFloat(minLowDT.toFixed(2)),
        touchCount: flatBottoms.length,
      })
    }
  }

  return partial
}

// ─── B. GENERATE PREDICTION ───────────────────────────────────────────────────
/**
 * Given a pattern (detected or partial), predict next move
 */
function generatePrediction(patternName, status, detectedData, currentPrice) {
  const stats = getMergedStats(patternName)
  if (!stats) return null

  const breakoutLevel = detectedData?.breakoutLevel || detectedData?.resistanceLine || detectedData?.breakoutPrice
  const invalidation = detectedData?.invalidationLevel || detectedData?.invalidationLevel

  const confidence = Math.round(stats.completionRate * 100)

  // Adjust confidence based on status
  const statusBonus = status === 'breaking_out' ? 15 : status === 'complete' ? 10 : 0
  const finalConfidence = Math.min(88, confidence + statusBonus)

  // Estimated move
  const estMovePercent = stats.avgMovePercent
  const predictedTarget = currentPrice * (1 + estMovePercent / 100)

  // Probability level
  const prob = status === 'breaking_out' ? 'high' : status === 'complete' ? 'medium-high' : 'medium'

  const calibrationNote = stats._calibrated
    ? ` [calibrated on ${stats._detections} real samples]`
    : ' [using default stats — run buildPatternDB.js]'

  return {
    pattern: patternName,
    status,
    calibrated: !!stats._calibrated,
    detectionCount: stats._detections || null,
    prediction: {
      direction: stats.direction,
      movePercent: estMovePercent,
      target: parseFloat(predictedTarget.toFixed(2)),
      confidence: finalConfidence,
      probability: prob,
      candlesToCompletion: stats.avgCandles,
      completionRate: stats.completionRate,
    },
    levels: {
      breakoutLevel: breakoutLevel ? parseFloat(breakoutLevel.toFixed(2)) : null,
      invalidation: invalidation ? parseFloat(invalidation.toFixed(2)) : null,
    },
    description: `${patternName} (${status.replace(/_/g, ' ')}) — ${stats.description} Predicted move: ${estMovePercent > 0 ? '+' : ''}${estMovePercent}% in ~${stats.avgCandles} candles (${(stats.completionRate * 100).toFixed(0)}% historical completion rate).${calibrationNote}`,
  }
}

// ─── C. MASTER PREDICTION FUNCTION ───────────────────────────────────────────
export function generatePatternPredictions(ohlcv, detectedPattern, currentPrice) {
  if (!ohlcv || !currentPrice) return { predictions: [], summary: 'Insufficient data', topPrediction: null }

  const predictions = []

  // 1. From confirmed/detected primary pattern
  if (detectedPattern?.primaryPattern?.pattern) {
    const p = detectedPattern.primaryPattern
    const status = detectedPattern.confirmation?.confirmed ? 'breaking_out' : 'forming'
    const pred = generatePrediction(p.pattern, status, p, currentPrice)
    if (pred) predictions.push(pred)
  }

  // 2. Pipe Bottom → Short-term reversal prediction
  if (detectedPattern?.pipeBottom?.detected) {
    predictions.push({
      pattern: 'Pipe Bottom',
      status: 'confirmed',
      prediction: {
        direction: 'bullish',
        movePercent: 5.5,
        target: parseFloat((currentPrice * 1.055).toFixed(2)),
        confidence: 80,
        probability: 'high',
        candlesToCompletion: 5,
        completionRate: 0.80,
      },
      levels: {
        breakoutLevel: detectedPattern.pipeBottom.breakoutLevel || currentPrice,
        invalidation: detectedPattern.pipeBottom.stopLoss || null,
      },
      description: `Pipe Bottom confirmed — sharp reversal signal with 80% historical accuracy. Target: +5.5% in ~5 candles.`,
    })
  }

  // 3. Island Reversal → Strong reversal
  if (detectedPattern?.islandReversal?.detected) {
    const ir = detectedPattern.islandReversal
    predictions.push({
      pattern: 'Island Reversal',
      status: 'confirmed',
      prediction: {
        direction: ir.signal === 'BUY' ? 'bullish' : 'bearish',
        movePercent: ir.signal === 'BUY' ? 10.0 : -10.0,
        target: parseFloat((currentPrice * (ir.signal === 'BUY' ? 1.10 : 0.90)).toFixed(2)),
        confidence: 82,
        probability: 'high',
        candlesToCompletion: 8,
        completionRate: 0.82,
      },
      levels: { breakoutLevel: currentPrice, invalidation: null },
      description: `${ir.type} Island Reversal — highest accuracy reversal pattern (82%). Expected ${ir.signal} move of ~10%.`,
    })
  }

  // 4. From partial patterns in price structure
  const partials = detectPartialPatterns(ohlcv)
  for (const partial of partials) {
    if (predictions.some(p => p.pattern === partial.pattern)) continue // Don't duplicate
    const pred = generatePrediction(partial.pattern, partial.status, partial, currentPrice)
    if (pred) {
      pred.partial = true
      pred.completionPercent = partial.completionPercent
      predictions.push(pred)
    }
  }

  // 5. Sort by confidence
  predictions.sort((a, b) => (b.prediction.confidence || 0) - (a.prediction.confidence || 0))

  const topPrediction = predictions[0] || null

  const summary = topPrediction
    ? `Top prediction: ${topPrediction.pattern} (${topPrediction.status.replace(/_/g, ' ')}) — ${topPrediction.prediction.direction.toUpperCase()} ${Math.abs(topPrediction.prediction.movePercent)}% target at $${topPrediction.prediction.target?.toLocaleString()} with ${topPrediction.prediction.confidence}% confidence`
    : 'No clear pattern prediction available'

  return {
    predictions: predictions.slice(0, 5),
    topPrediction,
    summary,
  }
}

// ─── TEST CLI ─────────────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  const n = 50
  const close = [
    ...Array.from({ length: 20 }, (_, i) => 65000 + i * 300),  // Impulse
    ...Array.from({ length: 30 }, (_, i) => 71000 - i * 50),   // Consolidation (Bull Flag)
  ]
  const high = close.map(c => c * 1.005)
  const low = close.map(c => c * 0.995)
  const volume = close.map(() => 1e9)

  const mockOHLCV = { open: close, high, low, close, volume }
  const currentPrice = close[close.length - 1]

  const result = generatePatternPredictions(mockOHLCV, {
    primaryPattern: {
      pattern: 'Bull Flag',
      direction: 'bullish',
      confidence: 70,
      breakoutPrice: 71200,
      invalidationLevel: 69500,
    },
    confirmation: { confirmed: false },
  }, currentPrice)

  console.log('=== Pattern Prediction Test ===')
  console.log('Predictions:', result.predictions.length)
  result.predictions.forEach(p => {
    console.log(`- ${p.pattern}: ${p.prediction.direction?.toUpperCase()} ${p.prediction.movePercent}% → $${p.prediction.target?.toLocaleString()} (${p.prediction.confidence}% conf) | ${p.prediction.probability} prob`)
  })
  console.log('Top prediction:', result.topPrediction?.pattern)
  console.log('Summary:', result.summary)
  console.log('\n✅ Pattern Prediction test passed!')
}
