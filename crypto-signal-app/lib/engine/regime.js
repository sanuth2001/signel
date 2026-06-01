export function detectRegime(priceData, indicators, onchainData) {
  const { daily, hourly } = priceData || {}
  const dInd = indicators?.daily || {}
  const hInd = indicators?.hourly || {}

  if (!daily || !daily.close || daily.close.length < 10) {
    return { regime: 'ranging', details: 'Insufficient data', score: {} }
  }

  const currentPrice = daily.close[daily.close.length - 1]
  const ema200 = dInd.ema?.ema200 || currentPrice
  const ema50 = dInd.ema?.ema50 || currentPrice
  const rsi = dInd.rsi?.value || 50
  const bbWidth = dInd.bb?.width || 3
  const volumeRatio = dInd.volume?.ratio || 1

  // Recent candles
  const recentClose = daily.close.slice(-10)
  const recentHigh = daily.high?.slice(-10) || recentClose
  const recentLow = daily.low?.slice(-10) || recentClose

  const higherHighs = recentHigh.every((h, i) => i === 0 || h >= recentHigh[i - 1] * 0.995)
  const higherLows = recentLow.every((l, i) => i === 0 || l >= recentLow[i - 1] * 0.995)
  const lowerHighs = recentHigh.every((h, i) => i === 0 || h <= recentHigh[i - 1] * 1.005)
  const lowerLows = recentLow.every((l, i) => i === 0 || l <= recentLow[i - 1] * 1.005)

  // Price change in last 4 hours (hourly candles)
  const h4Change = hourly?.close?.length >= 4
    ? Math.abs((hourly.close[hourly.close.length - 1] - hourly.close[hourly.close.length - 5]) / hourly.close[hourly.close.length - 5]) * 100
    : 0

  // Low liquidity: weekend UTC hours
  const now = new Date()
  const utcDay = now.getUTCDay() // 0=Sun, 6=Sat
  const utcHour = now.getUTCHours()
  const isWeekendNight = (utcDay === 0 || utcDay === 6) && (utcHour >= 20 || utcHour < 8)

  const scores = {
    trending_up: 0,
    trending_down: 0,
    ranging: 0,
    high_volatility: 0,
    low_liquidity: 0,
  }

  // Trending Up
  if (currentPrice > ema200) scores.trending_up += 2
  if (rsi >= 45 && rsi <= 70) scores.trending_up++
  if (higherHighs && higherLows) scores.trending_up += 2
  if (volumeRatio > 1.2) scores.trending_up++

  // Trending Down
  if (currentPrice < ema200) scores.trending_down += 2
  if (rsi >= 30 && rsi <= 55) scores.trending_down++
  if (lowerHighs && lowerLows) scores.trending_down += 2

  // Ranging
  if (Math.abs(currentPrice - ema50) / ema50 < 0.02) scores.ranging += 2
  if (rsi >= 40 && rsi <= 60) scores.ranging++
  if (bbWidth < 3) scores.ranging += 2
  if (volumeRatio < 0.9) scores.ranging++

  // High Volatility
  if (h4Change > 5) scores.high_volatility += 3
  if (volumeRatio > 3) scores.high_volatility += 2
  const fearChange = Math.abs((onchainData?.fearGreed?.value || 50) - 50)
  if (fearChange > 30) scores.high_volatility++

  // Low Liquidity
  if (isWeekendNight) scores.low_liquidity += 3
  if (volumeRatio < 0.5) scores.low_liquidity += 2

  const regime = Object.entries(scores).reduce((max, [k, v]) => v > max[1] ? [k, v] : max, ['ranging', 0])[0]

  return { regime, scores, currentPrice, ema200, ema50, rsi, bbWidth, volumeRatio, h4Change, isWeekendNight }
}

export function isRegimeTradeable(regimeData) {
  const { regime, h4Change, bbWidth, volumeRatio } = regimeData || {}

  const regimeConfig = {
    trending_up: { tradeable: true, accuracy: 82, recommendedAction: 'Enable BUY signals, tighten SELL threshold', expectedDuration: 'Current regime active' },
    trending_down: { tradeable: true, accuracy: 78, recommendedAction: 'Enable SELL signals, tighten BUY threshold', expectedDuration: 'Current regime active' },
    ranging: { tradeable: false, accuracy: 55, recommendedAction: 'WAIT for trending regime — only extreme RSI allowed', expectedDuration: '2-6 hours typically' },
    high_volatility: { tradeable: false, accuracy: 45, recommendedAction: 'Reduce position size, widen stops, or skip', expectedDuration: '1-3 hours typically' },
    low_liquidity: { tradeable: false, accuracy: 40, recommendedAction: 'Do NOT trade — wide spreads, low reliability', expectedDuration: 'Until market hours resume' },
  }

  const config = regimeConfig[regime] || regimeConfig.ranging

  const reasons = {
    trending_up: 'Uptrend confirmed — signals are reliable in this condition',
    trending_down: 'Downtrend confirmed — short signals are reliable',
    ranging: 'Market is ranging — trend signals unreliable in choppy conditions',
    high_volatility: `High volatility detected (${h4Change?.toFixed(1)}% in 4h) — signals unreliable`,
    low_liquidity: 'Low liquidity period — wide spreads distort signals',
  }

  return {
    tradeable: config.tradeable,
    regime,
    reason: reasons[regime] || 'Unknown regime',
    recommendedAction: config.recommendedAction,
    expectedDuration: config.expectedDuration,
    accuracy: config.accuracy,
  }
}

if (process.argv[2] === 'test') {
  const mockPriceData = {
    daily: {
      close: Array.from({ length: 30 }, (_, i) => 67000 + i * 100),
      high: Array.from({ length: 30 }, (_, i) => 67100 + i * 100),
      low: Array.from({ length: 30 }, (_, i) => 66900 + i * 100),
      volume: Array.from({ length: 30 }, () => 1e9),
    },
    hourly: {
      close: Array.from({ length: 24 }, (_, i) => 69000 + i * 10),
    },
  }
  const mockIndicators = {
    daily: {
      ema: { ema200: 63000, ema50: 66000 },
      rsi: { value: 58 },
      bb: { width: 3.5 },
      volume: { ratio: 1.3 },
    },
    hourly: {},
  }
  const regime = detectRegime(mockPriceData, mockIndicators, { fearGreed: { value: 55 } })
  console.log('Regime:', regime.regime)
  console.log(JSON.stringify(isRegimeTradeable(regime), null, 2))
}
