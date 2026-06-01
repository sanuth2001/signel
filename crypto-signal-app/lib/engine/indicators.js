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

// ─── Master Function ──────────────────────────────────────────────────────────
export function calculateAllIndicators(priceData) {
  const { daily, hourly } = priceData || {}

  const processTimeframe = (data) => {
    if (!data || !data.close || data.close.length === 0) return null
    return {
      rsi: calculateRSI(data.close),
      macd: calculateMACD(data.close),
      bb: calculateBollingerBands(data.close),
      ema: calculateEMAs(data.close),
      volume: analyzeVolume(data.volume, data.volume?.[data.volume.length - 1]),
    }
  }

  return {
    daily: processTimeframe(daily),
    hourly: processTimeframe(hourly),
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
