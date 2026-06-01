export function calculateCVD(candles) {
  if (!candles || !candles.open || candles.open.length === 0) {
    return { cvd: [], trend: 'flat', divergence: false, signal: 'NEUTRAL', description: 'No data available' }
  }

  const { open, close, volume } = candles
  const cvdValues = []
  let cumulative = 0

  for (let i = 0; i < open.length; i++) {
    const delta = close[i] > open[i] ? (volume[i] || 0) : close[i] < open[i] ? -(volume[i] || 0) : 0
    cumulative += delta
    cvdValues.push(cumulative)
  }

  // Trend: compare last 10 CVD values
  const recent = cvdValues.slice(-10)
  const cvdStart = recent[0]
  const cvdEnd = recent[recent.length - 1]
  const cvdChange = cvdEnd - cvdStart

  let trend = 'flat'
  if (cvdChange > Math.abs(cvdStart) * 0.05) trend = 'rising'
  else if (cvdChange < -Math.abs(cvdStart) * 0.05) trend = 'falling'

  // Divergence: price up but CVD down (or vice versa)
  const priceStart = close[close.length - 10] || close[0]
  const priceEnd = close[close.length - 1]
  const priceUp = priceEnd > priceStart
  const cvdUp = cvdChange > 0
  const divergence = priceUp !== cvdUp

  let signal = 'NEUTRAL'
  if (trend === 'rising' && !divergence) signal = 'BUY'
  else if (trend === 'falling' && !divergence) signal = 'SELL'
  else if (divergence && priceUp) signal = 'SELL' // price up but CVD down = fake move
  else if (divergence && !priceUp) signal = 'BUY'  // price down but CVD up = accumulation

  const description = divergence
    ? `CVD divergence detected: price ${priceUp ? 'rising' : 'falling'} but CVD ${cvdUp ? 'rising' : 'falling'} — ${signal === 'SELL' ? 'potential fake breakout' : 'hidden accumulation'}`
    : `CVD is ${trend} — confirming ${trend === 'rising' ? 'buying' : trend === 'falling' ? 'selling' : 'neutral'} pressure`

  return { cvd: cvdValues, trend, divergence, signal, description }
}

if (process.argv[2] === 'test') {
  const mockCandles = {
    open: Array.from({ length: 50 }, (_, i) => 67000 + i * 10),
    close: Array.from({ length: 50 }, (_, i) => 67010 + i * 10 + (Math.random() - 0.4) * 200),
    volume: Array.from({ length: 50 }, () => 1e9 * (0.5 + Math.random())),
  }
  console.log(JSON.stringify(calculateCVD(mockCandles), null, 2))
}
