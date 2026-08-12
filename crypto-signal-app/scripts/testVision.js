import fs from 'fs'
import path from 'path'
import { generateChartImage } from '../lib/utils/chartCapture.js'
import { analyzeChartWithVision } from '../lib/claude/visionAnalysis.js'

// Load .env.local manually
try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        process.env[key] = value
      }
    }
  }
} catch (e) {
  console.warn('Could not load .env.local:', e.message)
}

async function test() {
  console.log('Starting Vision test...')

  // Generate mock OHLCV data with clear bull flag:
  // 30 candles up strongly
  // 10 candles tight consolidation
  // currentPrice in consolidation zone
  const mockOHLCV = {
    timestamps: [],
    open: [],
    high: [],
    low: [],
    close: [],
    volume: []
  }

  let price = 62000
  let ts = Date.now() - 40 * 3600000

  // 30 candles up strongly (bull impulse)
  for (let i = 0; i < 30; i++) {
    ts += 3600000
    const o = price
    const c = price * (1 + 0.005 + Math.random() * 0.008) // strong green candle
    const h = Math.max(o, c) * (1 + Math.random() * 0.002)
    const l = Math.min(o, c) * (1 - Math.random() * 0.002)
    const v = 50000 + Math.random() * 20000

    mockOHLCV.timestamps.push(ts)
    mockOHLCV.open.push(o)
    mockOHLCV.high.push(h)
    mockOHLCV.low.push(l)
    mockOHLCV.close.push(c)
    mockOHLCV.volume.push(v)
    price = c
  }

  // 10 candles tight consolidation (flag)
  for (let i = 0; i < 10; i++) {
    ts += 3600000
    const o = price
    const c = price * (1 - 0.001 - (Math.random() - 0.5) * 0.002) // flag pullback
    const h = Math.max(o, c) * (1 + Math.random() * 0.001)
    const l = Math.min(o, c) * (1 - Math.random() * 0.001)
    const v = 15000 + Math.random() * 5000 // lower volume on consolidation

    mockOHLCV.timestamps.push(ts)
    mockOHLCV.open.push(o)
    mockOHLCV.high.push(h)
    mockOHLCV.low.push(l)
    mockOHLCV.close.push(c)
    mockOHLCV.volume.push(v)
    price = c
  }

  const mockIndicators = {
    rsi: { value: 62 },
    macd: { crossover: 'bullish' },
    ema: { trend: 'uptrend', ema20History: Array(40).fill(price * 0.98), ema50History: Array(40).fill(price * 0.95), ema200History: Array(40).fill(price * 0.9) },
    bb: { history: Array(40).fill({ upper: price * 1.03, middle: price, lower: price * 0.97 }) }
  }

  // Step 1: Generate chart image
  console.log('Generating chart image...')
  const image = await generateChartImage(mockOHLCV, mockIndicators, '4H')

  if (!image) {
    console.log('Canvas not available — testing with placeholder')
    return
  }

  console.log('Chart image generated:', image.length, 'chars')

  // Step 2: Send to Claude Vision
  console.log('Sending to Claude Vision...')
  const result = await analyzeChartWithVision(
    image,
    'BTC',
    '4H',
    price,
    { rsi: { value: 62 }, macd: { crossover: 'bullish' }, ema: { trend: 'uptrend' } }
  )

  console.log('\n--- Claude Vision Results ---')
  console.log('Pattern detected:', result?.primaryPattern?.name)
  console.log('Pattern Status:  ', result?.primaryPattern?.status)
  console.log('Pattern Quality: ', result?.primaryPattern?.quality)
  console.log('Visual bias:     ', result?.visualBias?.direction)
  console.log('Bias confidence: ', result?.visualBias?.confidence + '%')
  console.log('Chart clarity:   ', result?.chartClarity)
  console.log('Confidence boost:', result?.confidenceBoost)
  console.log('Trader action:   ', result?.traderAction?.action)
  console.log('Summary:         ', result?.visualSummary)
  console.log('\nVision test passed!')
}

test().catch(console.error)
