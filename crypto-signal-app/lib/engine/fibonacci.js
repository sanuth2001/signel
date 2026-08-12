// ─── Fibonacci Retracement & Extension Engine ─────────────────────────────────

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
const EXT_RATIOS = [1.272, 1.414, 1.618, 2.0, 2.618]

// ─── Find Swing High and Low ──────────────────────────────────────────────────
export function findSwingPoints(ohlcv, lookback = 50) {
  if (!ohlcv?.high?.length || !ohlcv?.low?.length) return null

  const highs = ohlcv.high
  const lows  = ohlcv.low
  const len   = highs.length
  const start = Math.max(0, len - lookback)

  // Absolute swing high/low in the lookback window
  let swingHighPrice = -Infinity, swingHighIdx = start
  let swingLowPrice  =  Infinity, swingLowIdx  = start

  for (let i = start; i < len; i++) {
    if (highs[i] > swingHighPrice) { swingHighPrice = highs[i]; swingHighIdx = i }
    if (lows[i]  < swingLowPrice)  { swingLowPrice  = lows[i];  swingLowIdx  = i }
  }

  const swingHigh = {
    price: parseFloat(swingHighPrice.toFixed(2)),
    index: swingHighIdx,
    candlesAgo: len - 1 - swingHighIdx,
  }
  const swingLow = {
    price: parseFloat(swingLowPrice.toFixed(2)),
    index: swingLowIdx,
    candlesAgo: len - 1 - swingLowIdx,
  }

  // Trend: whichever swing is more RECENT determines direction
  // If high is more recent → price peaked after the low → downtrend potential
  // If low is more recent  → price bottomed after the high → uptrend potential
  const trend = swingLow.candlesAgo < swingHigh.candlesAgo ? 'uptrend' : 'downtrend'

  return {
    swingHigh,
    swingLow,
    range: parseFloat((swingHighPrice - swingLowPrice).toFixed(2)),
    trend,
  }
}

// ─── Calculate Retracement Levels ─────────────────────────────────────────────
export function calculateFibRetracements(swingHigh, swingLow, trend) {
  const high  = typeof swingHigh === 'object' ? swingHigh.price : swingHigh
  const low   = typeof swingLow  === 'object' ? swingLow.price  : swingLow
  const range = high - low

  const levels = {}

  if (trend === 'uptrend') {
    // Retracing DOWN from high; level_0 = high (100%), level_100 = low (0%)
    levels.level_0   = parseFloat(high.toFixed(2))
    levels.level_236 = parseFloat((high - range * 0.236).toFixed(2))
    levels.level_382 = parseFloat((high - range * 0.382).toFixed(2))
    levels.level_500 = parseFloat((high - range * 0.500).toFixed(2))
    levels.level_618 = parseFloat((high - range * 0.618).toFixed(2))
    levels.level_786 = parseFloat((high - range * 0.786).toFixed(2))
    levels.level_100 = parseFloat(low.toFixed(2))
  } else {
    // Retracing UP from low; level_0 = low, level_100 = high
    levels.level_0   = parseFloat(low.toFixed(2))
    levels.level_236 = parseFloat((low + range * 0.236).toFixed(2))
    levels.level_382 = parseFloat((low + range * 0.382).toFixed(2))
    levels.level_500 = parseFloat((low + range * 0.500).toFixed(2))
    levels.level_618 = parseFloat((low + range * 0.618).toFixed(2))
    levels.level_786 = parseFloat((low + range * 0.786).toFixed(2))
    levels.level_100 = parseFloat(high.toFixed(2))
  }

  const mostImportant = [
    { level: '61.8%', price: levels.level_618, strength: 'very strong' },
    { level: '38.2%', price: levels.level_382, strength: 'strong' },
    { level: '50.0%', price: levels.level_500, strength: 'strong' },
    { level: '78.6%', price: levels.level_786, strength: 'medium' },
    { level: '23.6%', price: levels.level_236, strength: 'medium' },
  ]

  return {
    trend,
    swingHigh: high,
    swingLow: low,
    levels,
    goldenRatio: levels.level_618,
    mostImportant,
  }
}

// ─── Calculate Extension Levels ───────────────────────────────────────────────
export function calculateFibExtensions(swingHigh, swingLow, trend) {
  const high  = typeof swingHigh === 'object' ? swingHigh.price : swingHigh
  const low   = typeof swingLow  === 'object' ? swingLow.price  : swingLow
  const range = high - low

  let targets = []

  if (trend === 'uptrend') {
    targets = [
      { level: '127.2%', price: parseFloat((high + range * 0.272).toFixed(2)), label: 'first target'   },
      { level: '141.4%', price: parseFloat((high + range * 0.414).toFixed(2)), label: 'second target'  },
      { level: '161.8%', price: parseFloat((high + range * 0.618).toFixed(2)), label: 'main target'    },
      { level: '200.0%', price: parseFloat((high + range * 1.000).toFixed(2)), label: 'stretch target' },
      { level: '261.8%', price: parseFloat((high + range * 1.618).toFixed(2)), label: 'max target'     },
    ]
  } else {
    targets = [
      { level: '127.2%', price: parseFloat((low - range * 0.272).toFixed(2)), label: 'first target'   },
      { level: '141.4%', price: parseFloat((low - range * 0.414).toFixed(2)), label: 'second target'  },
      { level: '161.8%', price: parseFloat((low - range * 0.618).toFixed(2)), label: 'main target'    },
      { level: '200.0%', price: parseFloat((low - range * 1.000).toFixed(2)), label: 'stretch target' },
      { level: '261.8%', price: parseFloat((low - range * 1.618).toFixed(2)), label: 'max target'     },
    ]
  }

  return {
    targets,
    primaryTarget:      targets[2]?.price ?? null, // 1.618 always primary
    conservativeTarget: targets[0]?.price ?? null, // 1.272 always conservative
  }
}

// ─── Analyze Price at Fibonacci Level ─────────────────────────────────────────
export function analyzePriceAtFib(currentPrice, fibLevels) {
  if (!currentPrice || !fibLevels?.levels) {
    return { nearestLevel: null, atKeyLevel: false, levelType: null, signal: 'NEUTRAL', confidenceBoost: 0, description: 'Insufficient data' }
  }

  const { levels, trend } = fibLevels
  const PROXIMITY_PCT = 0.005 // 0.5%

  const levelMap = [
    { key: 'level_236', label: '23.6%', boost: { uptrend: 0, downtrend: 0 } },
    { key: 'level_382', label: '38.2%', boost: { uptrend: 8,  downtrend: 8  } },
    { key: 'level_500', label: '50.0%', boost: { uptrend: 10, downtrend: 10 } },
    { key: 'level_618', label: '61.8%', boost: { uptrend: 15, downtrend: 15 } },
    { key: 'level_786', label: '78.6%', boost: { uptrend: 5,  downtrend: 5  } },
    { key: 'level_0',   label: '0%',    boost: { uptrend: 0,  downtrend: 0  } },
    { key: 'level_100', label: '100%',  boost: { uptrend: 0,  downtrend: 0  } },
  ]

  // Find nearest level
  let nearestLevel = null
  let nearestDist  = Infinity

  for (const { key, label, boost } of levelMap) {
    const price = levels[key]
    if (price == null) continue
    const distPct = Math.abs(currentPrice - price) / price
    if (distPct < nearestDist) {
      nearestDist  = distPct
      nearestLevel = { level: label, price, key, distancePct: parseFloat((distPct * 100).toFixed(3)), boost }
    }
  }

  if (!nearestLevel) {
    return { nearestLevel: null, atKeyLevel: false, levelType: null, signal: 'NEUTRAL', confidenceBoost: 0, description: 'No Fibonacci level found' }
  }

  const atKeyLevel     = nearestLevel.distancePct <= 0.5
  const boostValue     = atKeyLevel ? (nearestLevel.boost[trend] || 0) : 0
  const keyLevelLabels = ['38.2%', '50.0%', '61.8%']
  const isKeyLevel     = keyLevelLabels.includes(nearestLevel.level)

  // Signal direction: uptrend → BUY at support, downtrend → SELL at resistance
  let signal = 'NEUTRAL'
  if (atKeyLevel && boostValue > 0) {
    signal = trend === 'uptrend' ? 'BUY' : 'SELL'
  }

  // Level type relative to current price
  let levelType = null
  if (atKeyLevel) {
    levelType = trend === 'uptrend' ? 'support' : 'resistance'
  }

  // Description
  let description = `Price at $${currentPrice.toLocaleString()} — nearest Fibonacci level ${nearestLevel.level} ($${nearestLevel.price.toLocaleString()}, ${nearestLevel.distancePct.toFixed(2)}% away)`
  if (atKeyLevel) {
    if (nearestLevel.level === '61.8%') {
      description = `Price at golden ratio (61.8%) ${levelType} — highest probability ${signal === 'BUY' ? 'bounce zone' : 'reversal zone'}`
    } else if (nearestLevel.level === '50.0%') {
      description = `Price at 50% ${levelType} — strong ${signal === 'BUY' ? 'support' : 'resistance'} level`
    } else if (nearestLevel.level === '38.2%') {
      description = `Price at 38.2% ${levelType} — moderate ${signal === 'BUY' ? 'support' : 'resistance'}`
    } else {
      description = `Price testing ${nearestLevel.level} Fibonacci ${levelType}`
    }
  } else {
    if (trend === 'uptrend') {
      description = `Price above key levels — watch for pullback to ${nearestLevel.level} ($${nearestLevel.price.toLocaleString()}) for entry in uptrend`
    } else {
      description = `Price below key levels — watch for bounce to ${nearestLevel.level} ($${nearestLevel.price.toLocaleString()}) for entry in downtrend`
    }
  }

  return {
    nearestLevel: { level: nearestLevel.level, price: nearestLevel.price, distance: nearestLevel.distancePct },
    atKeyLevel,
    levelType,
    signal,
    confidenceBoost: boostValue,
    description,
  }
}

// ─── Key Levels Nearby (within 2% of current price) ──────────────────────────
function findNearbyLevels(currentPrice, levels) {
  if (!currentPrice || !levels) return []
  const threshold = 0.02
  const labelMap = {
    level_0: '0%', level_236: '23.6%', level_382: '38.2%',
    level_500: '50.0%', level_618: '61.8%', level_786: '78.6%', level_100: '100%',
  }
  return Object.entries(levels)
    .filter(([, price]) => price != null && Math.abs(currentPrice - price) / price <= threshold)
    .map(([key, price]) => ({
      level: labelMap[key] || key,
      price,
      distancePct: parseFloat((Math.abs(currentPrice - price) / price * 100).toFixed(2)),
    }))
    .sort((a, b) => a.distancePct - b.distancePct)
}

// ─── Trade Setup from Fibonacci ───────────────────────────────────────────────
function buildTradeSetup(currentPrice, retracements, extensions, currentPosition) {
  if (!retracements || !extensions) return null

  const { levels, trend } = retracements
  const allLevels = Object.values(levels).filter(p => p != null).sort((a, b) => a - b)

  let entry = currentPosition?.nearestLevel?.price || currentPrice
  let stop  = null
  let tgt   = extensions.primaryTarget

  if (trend === 'uptrend') {
    // Stop is 0.5% below the nearest support level
    const supportLevels = allLevels.filter(p => p < currentPrice)
    const nearestSupport = supportLevels[supportLevels.length - 1] || levels.level_100
    stop = parseFloat((nearestSupport * 0.995).toFixed(2))
  } else {
    // Stop is 0.5% above the nearest resistance level
    const resistanceLevels = allLevels.filter(p => p > currentPrice)
    const nearestResistance = resistanceLevels[0] || levels.level_100
    stop = parseFloat((nearestResistance * 1.005).toFixed(2))
  }

  if (!tgt || !stop || !entry) return null
  const risk   = Math.abs(entry - stop)
  const reward = Math.abs(tgt - entry)
  const rr     = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null

  return { entry, target: tgt, stop, riskReward: rr }
}

// ─── Master Export ─────────────────────────────────────────────────────────────
export function analyzeFibonacci(ohlcv, currentPrice) {
  if (!ohlcv || !currentPrice) return null

  try {
    const swingPoints  = findSwingPoints(ohlcv, 50)
    if (!swingPoints) return null

    const { swingHigh, swingLow, trend, range } = swingPoints
    const retracements   = calculateFibRetracements(swingHigh, swingLow, trend)
    const extensions     = calculateFibExtensions(swingHigh, swingLow, trend)
    const currentPosition = analyzePriceAtFib(currentPrice, retracements)
    const keyLevelsNearby = findNearbyLevels(currentPrice, retracements.levels)
    const tradeSetup      = buildTradeSetup(currentPrice, retracements, extensions, currentPosition)

    // Summary
    let summary = `${trend === 'uptrend' ? 'Uptrend' : 'Downtrend'} — swing high $${swingHigh.price.toLocaleString()} to swing low $${swingLow.price.toLocaleString()} (range: $${range.toLocaleString()}). `
    summary += currentPosition.description

    return {
      swingPoints: { swingHigh, swingLow, range, trend },
      retracements,
      extensions,
      currentPosition,
      keyLevelsNearby,
      summary,
      tradeSetup,
    }
  } catch (err) {
    console.error('[fibonacci] Error:', err.message)
    return null
  }
}

// ─── Test Block ────────────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  // Build mock OHLCV: swing high at index 20 ($71200), swing low at index 40 ($62400)
  const len = 60
  const highs  = []
  const lows   = []
  const closes = []

  for (let i = 0; i < len; i++) {
    if (i === 20) { highs.push(71200); lows.push(70800); closes.push(71000) }
    else if (i === 40) { highs.push(62800); lows.push(62400); closes.push(62500) }
    else if (i < 20) { const p = 65000 + i * 200; highs.push(p + 100); lows.push(p - 100); closes.push(p) }
    else if (i < 40) { const p = 71000 - (i - 20) * 420; highs.push(p + 100); lows.push(p - 100); closes.push(p) }
    else { const p = 62500 + (i - 40) * 80; highs.push(p + 100); lows.push(p - 100); closes.push(p) }
  }

  const timestamps = Array.from({ length: len }, (_, i) => Date.now() - (len - i) * 86400000)
  const currentPrice = 65800

  const result = analyzeFibonacci({ high: highs, low: lows, close: closes, timestamps, open: closes, volume: Array(len).fill(1e9) }, currentPrice)

  console.log('\n=== Fibonacci Test ===')
  console.log('Trend:', result.swingPoints.trend)
  console.log('Swing High:', result.swingPoints.swingHigh.price)
  console.log('Swing Low:', result.swingPoints.swingLow.price)
  console.log('Golden Ratio Level:', result.retracements.goldenRatio)
  console.log('Current Position:', result.currentPosition.description)
  console.log('Signal:', result.currentPosition.signal)
  console.log('Boost:', result.currentPosition.confidenceBoost)
  console.log('Primary Target:', result.extensions.primaryTarget)
  console.log('Conservative Target:', result.extensions.conservativeTarget)
  console.log('Nearby Levels:', result.keyLevelsNearby)
  console.log('Trade Setup:', result.tradeSetup)
  console.log('Summary:', result.summary)
  console.log('\nTest passed!')
}
