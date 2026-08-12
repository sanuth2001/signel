// ─── EMA Helper ───────────────────────────────────────────────────────────────
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

// ─── RSI ──────────────────────────────────────────────────────────────────────
export function calculateRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) {
    return { value: 50, signal: 'NEUTRAL', zone: 'neutral', strength: 'weak' }
  }

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
  const value = parseFloat((100 - 100 / (1 + rs)).toFixed(2))

  const zone = value < 30 ? 'oversold' : value > 70 ? 'overbought' : 'neutral'
  const signal = value < 30 ? 'BUY' : value > 70 ? 'SELL' : 'NEUTRAL'
  const strength = (value < 25 || value > 75) ? 'strong' : (value < 35 || value > 65) ? 'medium' : 'weak'

  return { value, signal, zone, strength }
}

// ─── MACD ─────────────────────────────────────────────────────────────────────
export function calculateMACD(closes, fast = 12, slow = 26, signalPeriod = 9) {
  if (!closes || closes.length < slow + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0, crossover: 'none', trend: 'neutral', signalDir: 'NEUTRAL', strength: 'weak' }
  }

  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)

  const macdLine = emaFast.map((v, i) => (v !== null && emaSlow[i] !== null) ? v - emaSlow[i] : null).filter(v => v !== null)
  const signalLine = calcEMA(macdLine, signalPeriod)
  const histogram = macdLine.map((v, i) => signalLine[i] !== null ? v - signalLine[i] : null)

  const lastMACD = macdLine[macdLine.length - 1]
  const lastSignal = signalLine[signalLine.length - 1]
  const lastHist = histogram[histogram.length - 1]
  const prevHist = histogram[histogram.length - 2]

  let crossover = 'none'
  if (prevHist !== null && lastHist !== null) {
    if (prevHist < 0 && lastHist > 0) crossover = 'bullish'
    else if (prevHist > 0 && lastHist < 0) crossover = 'bearish'
  }

  const trend = lastMACD > 0 ? 'up' : 'down'
  const signalDir = crossover === 'bullish' ? 'BUY' : crossover === 'bearish' ? 'SELL' : lastMACD > 0 ? 'BUY' : 'SELL'
  const strength = Math.abs(lastHist) > Math.abs(lastMACD) * 0.2 ? 'strong' : 'medium'

  return {
    macd: parseFloat(lastMACD?.toFixed(2) || 0),
    signal: parseFloat(lastSignal?.toFixed(2) || 0),
    histogram: parseFloat(lastHist?.toFixed(2) || 0),
    crossover,
    trend,
    signalDir,
    strength,
  }
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────
export function calculateBollingerBands(closes, period = 20, stdDevMult = 2) {
  if (!closes || closes.length < period) {
    const last = closes?.[closes.length - 1] || 67000
    return {
      upper: last * 1.03,
      middle: last,
      lower: last * 0.97,
      position: 'middle',
      squeeze: false,
      signal: 'NEUTRAL',
      width: 3,
      history: Array(closes?.length || 0).fill({ upper: last * 1.03, middle: last, lower: last * 0.97 })
    }
  }

  const history = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      history.push({ upper: null, middle: null, lower: null })
      continue
    }
    const slice = closes.slice(i - period + 1, i + 1)
    const sma = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period
    const stdDev = Math.sqrt(variance)
    history.push({
      upper: parseFloat((sma + stdDevMult * stdDev).toFixed(2)),
      middle: parseFloat(sma.toFixed(2)),
      lower: parseFloat((sma - stdDevMult * stdDev).toFixed(2)),
    })
  }

  const last = history[history.length - 1]
  const current = closes[closes.length - 1]
  const width = parseFloat(((last.upper - last.lower) / last.middle * 100).toFixed(2))

  const posRatio = (current - last.lower) / (last.upper - last.lower)
  const position = posRatio < 0.25 ? 'lower' : posRatio > 0.75 ? 'upper' : 'middle'
  const squeeze = width < 2
  const signal = position === 'lower' ? 'BUY' : position === 'upper' ? 'SELL' : 'NEUTRAL'

  return {
    upper: last.upper,
    middle: last.middle,
    lower: last.lower,
    position,
    squeeze,
    signal,
    width,
    history,
  }
}

// ─── EMAs ─────────────────────────────────────────────────────────────────────
export function calculateEMAs(closes) {
  if (!closes || closes.length < 20) {
    const last = closes?.[closes.length - 1] || 67000
    const mockArr = Array(closes?.length || 0).fill(last)
    return {
      ema20: last,
      ema50: last,
      ema200: last,
      trend: 'neutral',
      goldenCross: false,
      deathCross: false,
      signal: 'NEUTRAL',
      ema20History: mockArr,
      ema50History: mockArr,
      ema200History: mockArr
    }
  }

  const ema20arr = calcEMA(closes, 20)
  const ema50arr = calcEMA(closes, Math.min(50, closes.length))
  const ema200arr = calcEMA(closes, Math.min(200, closes.length))

  const ema20 = parseFloat((ema20arr[ema20arr.length - 1] || closes[closes.length - 1]).toFixed(2))
  const ema50 = parseFloat((ema50arr[ema50arr.length - 1] || closes[closes.length - 1]).toFixed(2))
  const ema200 = parseFloat((ema200arr[ema200arr.length - 1] || closes[closes.length - 1]).toFixed(2))

  const prevEma50 = ema50arr[ema50arr.length - 2]
  const prevEma200 = ema200arr[ema200arr.length - 2]
  const goldenCross = prevEma50 !== null && prevEma200 !== null && prevEma50 < prevEma200 && ema50 > ema200
  const deathCross = prevEma50 !== null && prevEma200 !== null && prevEma50 > prevEma200 && ema50 < ema200

  const current = closes[closes.length - 1]
  const trend = current > ema200 ? 'uptrend' : current > ema50 ? 'weak_uptrend' : 'downtrend'
  const signal = goldenCross ? 'BUY' : deathCross ? 'SELL' : current > ema50 ? 'BUY' : 'SELL'

  return {
    ema20,
    ema50,
    ema200,
    trend,
    goldenCross,
    deathCross,
    signal,
    ema20History: ema20arr,
    ema50History: ema50arr,
    ema200History: ema200arr
  }
}

// ─── Volume Analysis ──────────────────────────────────────────────────────────
export function analyzeVolume(volumes, currentVolume) {
  if (!volumes || volumes.length < 5) {
    return { current: currentVolume || 0, average: 0, spike: false, ratio: 1, signal: 'NEUTRAL', description: 'Insufficient data' }
  }
  const slice = volumes.slice(-20)
  const average = slice.reduce((a, b) => a + b, 0) / slice.length
  const current = currentVolume || volumes[volumes.length - 1]
  const ratio = parseFloat((current / (average || 1)).toFixed(2))
  const spike = ratio > 1.5

  const signal = spike && ratio > 2 ? 'BUY' : ratio < 0.5 ? 'SELL' : 'NEUTRAL'
  return {
    current: Math.floor(current),
    average: Math.floor(average),
    spike,
    ratio,
    signal,
    description: spike ? `${ratio.toFixed(1)}x average volume — strong confirmation` : `Volume ${ratio.toFixed(1)}x average — ${ratio < 0.7 ? 'below average' : 'normal'}`,
  }
}

// ─── Pivot Highs & Lows ───────────────────────────────────────────────────────
function findPivotHighs(values, lookback = 5) {
  const pivots = []
  // Only consider up to values.length - lookback so we have future data to confirm
  for (let i = lookback; i < values.length - lookback; i++) {
    const v = values[i]
    let isPivot = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      if (values[j] >= v) { isPivot = false; break }
    }
    if (isPivot) pivots.push({ index: i, value: v, confirmed: true })
  }
  return pivots
}

function findPivotLows(values, lookback = 5) {
  const pivots = []
  for (let i = lookback; i < values.length - lookback; i++) {
    const v = values[i]
    let isPivot = true
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      if (values[j] <= v) { isPivot = false; break }
    }
    if (isPivot) pivots.push({ index: i, value: v, confirmed: true })
  }
  return pivots
}

// ─── RSI Series Helper ────────────────────────────────────────────────────────
function calcRSISeries(closes, period = 14) {
  if (!closes || closes.length < period + 1) return []
  const result = Array(period).fill(null)
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(parseFloat((100 - 100 / (1 + rs0)).toFixed(2)))
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)))
  }
  return result
}

// ─── MACD Histogram Series Helper ─────────────────────────────────────────────
function calcMACDHistSeries(closes, fast = 12, slow = 26, signalPeriod = 9) {
  if (!closes || closes.length < slow + signalPeriod) return []
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macdLine = emaFast.map((v, i) => (v !== null && emaSlow[i] !== null) ? v - emaSlow[i] : null).filter(v => v !== null)
  const signalLine = calcEMA(macdLine, signalPeriod)
  return macdLine.map((v, i) => signalLine[i] !== null ? parseFloat((v - signalLine[i]).toFixed(4)) : null)
}

// ─── Divergence Strength ──────────────────────────────────────────────────────
function calcDivergenceStrength(p1, p2, osc1, osc2, lastIdx, oscillatorDiff) {
  const candlesAgo = lastIdx - Math.max(p1.index, p2.index)
  const oscDiff = Math.abs(osc1.value - osc2.value)
  const clearPivots = oscDiff > (oscillatorDiff || 5)
  if (clearPivots && candlesAgo < 10) return 'strong'
  if (clearPivots && candlesAgo < 20) return 'medium'
  return 'weak'
}

// ─── RSI Divergence ───────────────────────────────────────────────────────────
export function detectRSIDivergence(closes, rsiValues) {
  const nullResult = { type: null, strength: null, signal: null, pricePoint1: null, pricePoint2: null, rsiPoint1: null, rsiPoint2: null, candlesAgo: null, description: null, confidenceBoost: 0 }

  // Work on last 50 candles
  const window = 50
  const priceSlice = closes.slice(-window)
  const rsiSlice   = (rsiValues || []).slice(-window)
  if (priceSlice.length < 20 || rsiSlice.filter(v => v !== null).length < 10) return nullResult

  const priceHighs = findPivotHighs(priceSlice)
  const priceLows  = findPivotLows(priceSlice)
  const rsiHighs   = findPivotHighs(rsiSlice.map(v => v ?? 50))
  const rsiLows    = findPivotLows(rsiSlice.map(v => v ?? 50))

  if (priceHighs.length < 2 && priceLows.length < 2) return nullResult

  const lastIdx = priceSlice.length - 1
  const baseOffset = closes.length - window

  // --- Bearish divergence check (using price highs + rsi highs) ---
  if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
    const ph1 = priceHighs[priceHighs.length - 2]
    const ph2 = priceHighs[priceHighs.length - 1]
    const rh1 = rsiHighs.reduce((best, r) => Math.abs(r.index - ph1.index) < Math.abs(best.index - ph1.index) ? r : best, rsiHighs[0])
    const rh2 = rsiHighs.reduce((best, r) => Math.abs(r.index - ph2.index) < Math.abs(best.index - ph2.index) ? r : best, rsiHighs[rsiHighs.length - 1])

    // Regular bearish: price higher high + rsi lower high
    if (ph2.value > ph1.value && rh2.value < rh1.value) {
      const strength = calcDivergenceStrength(ph1, ph2, rh1, rh2, lastIdx, 5)
      const candlesAgo = lastIdx - ph2.index
      return {
        type: 'regular_bearish',
        strength,
        signal: 'SELL',
        pricePoint1: { index: baseOffset + ph1.index, value: ph1.value },
        pricePoint2: { index: baseOffset + ph2.index, value: ph2.value },
        rsiPoint1:   { index: baseOffset + rh1.index, value: rh1.value },
        rsiPoint2:   { index: baseOffset + rh2.index, value: rh2.value },
        candlesAgo,
        description: `Price making higher high ($${ph2.value.toFixed(2)} vs $${ph1.value.toFixed(2)}) but RSI making lower high (${rh2.value.toFixed(1)} vs ${rh1.value.toFixed(1)}) — momentum fading, potential reversal down`,
        confidenceBoost: 15,
      }
    }

    // Hidden bearish: price lower high + rsi higher high
    if (ph2.value < ph1.value && rh2.value > rh1.value) {
      const strength = calcDivergenceStrength(ph1, ph2, rh1, rh2, lastIdx, 5)
      const candlesAgo = lastIdx - ph2.index
      return {
        type: 'hidden_bearish',
        strength,
        signal: 'SELL',
        pricePoint1: { index: baseOffset + ph1.index, value: ph1.value },
        pricePoint2: { index: baseOffset + ph2.index, value: ph2.value },
        rsiPoint1:   { index: baseOffset + rh1.index, value: rh1.value },
        rsiPoint2:   { index: baseOffset + rh2.index, value: rh2.value },
        candlesAgo,
        description: `Price making lower high ($${ph2.value.toFixed(2)} vs $${ph1.value.toFixed(2)}) but RSI making higher high (${rh2.value.toFixed(1)} vs ${rh1.value.toFixed(1)}) — bearish trend continuation expected`,
        confidenceBoost: 10,
      }
    }
  }

  // --- Bullish divergence check (using price lows + rsi lows) ---
  if (priceLows.length >= 2 && rsiLows.length >= 2) {
    const pl1 = priceLows[priceLows.length - 2]
    const pl2 = priceLows[priceLows.length - 1]
    const rl1 = rsiLows.reduce((best, r) => Math.abs(r.index - pl1.index) < Math.abs(best.index - pl1.index) ? r : best, rsiLows[0])
    const rl2 = rsiLows.reduce((best, r) => Math.abs(r.index - pl2.index) < Math.abs(best.index - pl2.index) ? r : best, rsiLows[rsiLows.length - 1])

    // Regular bullish: price lower low + rsi higher low
    if (pl2.value < pl1.value && rl2.value > rl1.value) {
      const strength = calcDivergenceStrength(pl1, pl2, rl1, rl2, lastIdx, 5)
      const candlesAgo = lastIdx - pl2.index
      return {
        type: 'regular_bullish',
        strength,
        signal: 'BUY',
        pricePoint1: { index: baseOffset + pl1.index, value: pl1.value },
        pricePoint2: { index: baseOffset + pl2.index, value: pl2.value },
        rsiPoint1:   { index: baseOffset + rl1.index, value: rl1.value },
        rsiPoint2:   { index: baseOffset + rl2.index, value: rl2.value },
        candlesAgo,
        description: `Price making lower low ($${pl2.value.toFixed(2)} vs $${pl1.value.toFixed(2)}) but RSI making higher low (${rl2.value.toFixed(1)} vs ${rl1.value.toFixed(1)}) — selling pressure fading, potential reversal up`,
        confidenceBoost: 15,
      }
    }

    // Hidden bullish: price higher low + rsi lower low
    if (pl2.value > pl1.value && rl2.value < rl1.value) {
      const strength = calcDivergenceStrength(pl1, pl2, rl1, rl2, lastIdx, 5)
      const candlesAgo = lastIdx - pl2.index
      return {
        type: 'hidden_bullish',
        strength,
        signal: 'BUY',
        pricePoint1: { index: baseOffset + pl1.index, value: pl1.value },
        pricePoint2: { index: baseOffset + pl2.index, value: pl2.value },
        rsiPoint1:   { index: baseOffset + rl1.index, value: rl1.value },
        rsiPoint2:   { index: baseOffset + rl2.index, value: rl2.value },
        candlesAgo,
        description: `Price making higher low ($${pl2.value.toFixed(2)} vs $${pl1.value.toFixed(2)}) while RSI making lower low (${rl2.value.toFixed(1)} vs ${rl1.value.toFixed(1)}) — bullish trend continuation signal`,
        confidenceBoost: 10,
      }
    }
  }

  return nullResult
}

// ─── MACD Divergence ──────────────────────────────────────────────────────────
export function detectMACDDivergence(closes, macdHistogram) {
  const nullResult = { type: null, strength: null, signal: null, pricePoint1: null, pricePoint2: null, rsiPoint1: null, rsiPoint2: null, candlesAgo: null, description: null, confidenceBoost: 0 }

  const window = 50
  const priceSlice = closes.slice(-window)
  const histSlice  = (macdHistogram || []).slice(-window)
  if (priceSlice.length < 20 || histSlice.filter(v => v !== null).length < 10) return nullResult

  const priceHighs = findPivotHighs(priceSlice)
  const priceLows  = findPivotLows(priceSlice)
  const histHighs  = findPivotHighs(histSlice.map(v => v ?? 0))
  const histLows   = findPivotLows(histSlice.map(v => v ?? 0))

  if (priceHighs.length < 2 && priceLows.length < 2) return nullResult

  const lastIdx = priceSlice.length - 1
  const baseOffset = closes.length - window

  // --- Bearish ---
  if (priceHighs.length >= 2 && histHighs.length >= 2) {
    const ph1 = priceHighs[priceHighs.length - 2]
    const ph2 = priceHighs[priceHighs.length - 1]
    const hh1 = histHighs.reduce((best, r) => Math.abs(r.index - ph1.index) < Math.abs(best.index - ph1.index) ? r : best, histHighs[0])
    const hh2 = histHighs.reduce((best, r) => Math.abs(r.index - ph2.index) < Math.abs(best.index - ph2.index) ? r : best, histHighs[histHighs.length - 1])

    if (ph2.value > ph1.value && hh2.value < hh1.value) {
      const strength = calcDivergenceStrength(ph1, ph2, hh1, hh2, lastIdx, 0.001)
      return { type: 'regular_bearish', strength, signal: 'SELL', pricePoint1: { index: baseOffset + ph1.index, value: ph1.value }, pricePoint2: { index: baseOffset + ph2.index, value: ph2.value }, rsiPoint1: { index: baseOffset + hh1.index, value: hh1.value }, rsiPoint2: { index: baseOffset + hh2.index, value: hh2.value }, candlesAgo: lastIdx - ph2.index, description: `MACD regular bearish divergence — price higher high while histogram declining ($${ph2.value.toFixed(2)} vs $${ph1.value.toFixed(2)}), momentum stalling`, confidenceBoost: 18 }
    }
    if (ph2.value < ph1.value && hh2.value > hh1.value) {
      const strength = calcDivergenceStrength(ph1, ph2, hh1, hh2, lastIdx, 0.001)
      return { type: 'hidden_bearish', strength, signal: 'SELL', pricePoint1: { index: baseOffset + ph1.index, value: ph1.value }, pricePoint2: { index: baseOffset + ph2.index, value: ph2.value }, rsiPoint1: { index: baseOffset + hh1.index, value: hh1.value }, rsiPoint2: { index: baseOffset + hh2.index, value: hh2.value }, candlesAgo: lastIdx - ph2.index, description: `MACD hidden bearish divergence — lower price high with rising histogram, bearish continuation likely`, confidenceBoost: 12 }
    }
  }

  // --- Bullish ---
  if (priceLows.length >= 2 && histLows.length >= 2) {
    const pl1 = priceLows[priceLows.length - 2]
    const pl2 = priceLows[priceLows.length - 1]
    const hl1 = histLows.reduce((best, r) => Math.abs(r.index - pl1.index) < Math.abs(best.index - pl1.index) ? r : best, histLows[0])
    const hl2 = histLows.reduce((best, r) => Math.abs(r.index - pl2.index) < Math.abs(best.index - pl2.index) ? r : best, histLows[histLows.length - 1])

    if (pl2.value < pl1.value && hl2.value > hl1.value) {
      const strength = calcDivergenceStrength(pl1, pl2, hl1, hl2, lastIdx, 0.001)
      return { type: 'regular_bullish', strength, signal: 'BUY', pricePoint1: { index: baseOffset + pl1.index, value: pl1.value }, pricePoint2: { index: baseOffset + pl2.index, value: pl2.value }, rsiPoint1: { index: baseOffset + hl1.index, value: hl1.value }, rsiPoint2: { index: baseOffset + hl2.index, value: hl2.value }, candlesAgo: lastIdx - pl2.index, description: `MACD regular bullish divergence — price lower low while histogram rising ($${pl2.value.toFixed(2)} vs $${pl1.value.toFixed(2)}), selling exhausted`, confidenceBoost: 18 }
    }
    if (pl2.value > pl1.value && hl2.value < hl1.value) {
      const strength = calcDivergenceStrength(pl1, pl2, hl1, hl2, lastIdx, 0.001)
      return { type: 'hidden_bullish', strength, signal: 'BUY', pricePoint1: { index: baseOffset + pl1.index, value: pl1.value }, pricePoint2: { index: baseOffset + pl2.index, value: pl2.value }, rsiPoint1: { index: baseOffset + hl1.index, value: hl1.value }, rsiPoint2: { index: baseOffset + hl2.index, value: hl2.value }, candlesAgo: lastIdx - pl2.index, description: `MACD hidden bullish divergence — price holding higher lows while histogram dips, bullish continuation likely`, confidenceBoost: 12 }
    }
  }

  return nullResult
}

// ─── Combined Divergence Check ────────────────────────────────────────────────
export function checkAllDivergences(closes, indicators) {
  if (!closes || closes.length < 30) {
    return { rsiDivergence: { type: null, confidenceBoost: 0 }, macdDivergence: { type: null, confidenceBoost: 0 }, confirmed: false, finalSignal: null, finalStrength: null, finalBoost: 0, summary: 'Insufficient data for divergence analysis' }
  }

  // Build RSI and MACD histogram series
  const rsiSeries  = calcRSISeries(closes)
  const macdHist   = indicators?.macdHistogram || calcMACDHistSeries(closes)

  const rsiDiv  = detectRSIDivergence(closes, rsiSeries)
  const macdDiv = detectMACDDivergence(closes, macdHist)

  const bothDetected = rsiDiv.type !== null && macdDiv.type !== null
  const sameType     = bothDetected && rsiDiv.type === macdDiv.type
  const confirmed    = sameType

  let finalSignal   = null
  let finalStrength = null
  let finalBoost    = 0
  let summary       = 'No divergence detected'

  if (confirmed) {
    finalSignal   = rsiDiv.signal
    finalStrength = 'very strong'
    finalBoost    = 25
    const typeLabel = rsiDiv.type.replace(/_/g, ' ')
    summary = `RSI and MACD both showing ${typeLabel} divergence — high probability ${finalSignal === 'BUY' ? 'reversal / continuation up' : 'reversal / continuation down'}`
  } else if (rsiDiv.type !== null) {
    finalSignal   = rsiDiv.signal
    finalStrength = rsiDiv.strength
    finalBoost    = rsiDiv.confidenceBoost
    summary = `RSI ${rsiDiv.type.replace(/_/g, ' ')} divergence detected (MACD unconfirmed)`
  } else if (macdDiv.type !== null) {
    finalSignal   = macdDiv.signal
    finalStrength = macdDiv.strength
    finalBoost    = macdDiv.confidenceBoost
    summary = `MACD ${macdDiv.type.replace(/_/g, ' ')} divergence detected (RSI unconfirmed)`
  }

  return {
    rsiDivergence:  rsiDiv,
    macdDivergence: macdDiv,
    confirmed,
    finalSignal,
    finalStrength,
    finalBoost,
    summary,
  }
}

// ─── Master Function ──────────────────────────────────────────────────────────
export function calculateAllIndicators(priceData) {
  const { daily, hourly } = priceData || {}

  const processTimeframe = (data) => {
    if (!data || !data.close || data.close.length === 0) return null
    const macdResult = calculateMACD(data.close)
    const macdHistSeries = calcMACDHistSeries(data.close)
    return {
      rsi: calculateRSI(data.close),
      macd: macdResult,
      bb: calculateBollingerBands(data.close),
      ema: calculateEMAs(data.close),
      volume: analyzeVolume(data.volume, data.volume?.[data.volume.length - 1]),
      // series for divergence
      _closes: data.close,
      _macdHistSeries: macdHistSeries,
    }
  }

  const dailyIndicators  = processTimeframe(daily)
  const hourlyIndicators = processTimeframe(hourly)

  // Compute divergences per timeframe
  const dailyDivergences  = dailyIndicators  ? checkAllDivergences(dailyIndicators._closes,  { macdHistogram: dailyIndicators._macdHistSeries })  : null
  const hourlyDivergences = hourlyIndicators ? checkAllDivergences(hourlyIndicators._closes, { macdHistogram: hourlyIndicators._macdHistSeries }) : null

  return {
    daily:  dailyIndicators,
    hourly: hourlyIndicators,
    divergences: {
      daily:  dailyDivergences,
      hourly: hourlyDivergences,
    },
  }
}

if (process.argv[2] === 'test') {
  const closes = Array.from({ length: 200 }, (_, i) => 67000 + Math.sin(i * 0.3) * 2000 + (Math.random() - 0.5) * 500)
  const volumes = Array.from({ length: 200 }, () => 1e9 * (0.5 + Math.random()))
  console.log('RSI:', calculateRSI(closes))
  console.log('MACD:', calculateMACD(closes))
  console.log('BB:', calculateBollingerBands(closes))
  console.log('EMAs:', calculateEMAs(closes))
  console.log('Volume:', analyzeVolume(volumes, volumes[volumes.length - 1]))
}

if (process.argv[2] === 'testDivergence') {
  // Generate mock price data with clear regular bullish divergence:
  // Price making lower lows while RSI makes higher lows
  const base = 67000
  const closes = []

  // Initial segment — rising prices
  for (let i = 0; i < 50; i++) closes.push(base + i * 20 + (Math.random() - 0.5) * 100)

  // First low
  for (let i = 0; i < 10; i++) closes.push(base + 1000 - i * 120)
  const firstLowPrice = closes[closes.length - 1]

  // Recovery
  for (let i = 0; i < 15; i++) closes.push(firstLowPrice + i * 80)

  // Second low — lower than first (price lower low)
  const secondLowPrice = firstLowPrice - 400
  for (let i = 0; i < 10; i++) closes.push(firstLowPrice + 1200 - i * 160)
  for (let i = 0; i < 10; i++) closes.push(secondLowPrice + i * 50)

  // Tail
  for (let i = 0; i < 30; i++) closes.push(secondLowPrice + 500 + i * 30 + (Math.random() - 0.5) * 50)

  const result = detectRSIDivergence(closes, calcRSISeries(closes))
  const allDiv = checkAllDivergences(closes, {})

  console.log('\n=== RSI Divergence Test ===')
  console.log('RSI Divergence:', result.type)
  console.log('Signal:', result.signal)
  console.log('Boost:', result.confidenceBoost)
  console.log('Strength:', result.strength)
  console.log('Description:', result.description)
  console.log('\n=== Combined Divergence ===')
  console.log('Confirmed:', allDiv.confirmed)
  console.log('Final Signal:', allDiv.finalSignal)
  console.log('Final Boost:', allDiv.finalBoost)
  console.log('Summary:', allDiv.summary)
}
