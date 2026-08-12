import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let createCanvas = null
try {
  const canvasPkg = require('canvas')
  createCanvas = canvasPkg.createCanvas
} catch (err) {
  console.warn("Canvas not available — vision disabled", err.message)
}

export async function generateChartImage(
  ohlcvData,
  indicators,
  timeframe,
  width = 800,
  height = 400
) {
  if (!createCanvas) {
    console.warn("Canvas not available — vision disabled")
    return null
  }

  try {
    if (!ohlcvData || !ohlcvData.close || ohlcvData.close.length === 0) {
      return null
    }

    // Step 1: Create canvas
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Step 2: Draw dark background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Step 3: Calculate scale (Show last 100 candles)
    const len = ohlcvData.close.length
    const startIndex = Math.max(0, len - 100)

    const open = ohlcvData.open.slice(startIndex)
    const high = ohlcvData.high.slice(startIndex)
    const low = ohlcvData.low.slice(startIndex)
    const close = ohlcvData.close.slice(startIndex)
    const volume = ohlcvData.volume ? ohlcvData.volume.slice(startIndex) : []
    const N = close.length

    const minPrice = Math.min(...low)
    const maxPrice = Math.max(...high)
    const priceRange = maxPrice - minPrice || 1

    const paddingPercent = 0.1
    const yMin = minPrice - priceRange * paddingPercent
    const yMax = maxPrice + priceRange * paddingPercent
    const yRange = yMax - yMin

    // Reserve pixels on right and bottom for labels & scaling
    const labelWidth = 85
    const bottomPadding = 25
    const chartWidth = width - labelWidth
    const chartHeight = height - bottomPadding

    // Reserve bottom 20% of the price area for volume
    const priceAreaHeight = chartHeight * 0.8
    const volumeAreaHeight = chartHeight * 0.2

    function getY(price) {
      const pct = (price - yMin) / yRange
      return priceAreaHeight - pct * priceAreaHeight
    }

    const colWidth = chartWidth / N

    function getX(index) {
      return index * colWidth + colWidth / 2
    }

    // Step 4: Draw grid lines
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1

    // Draw 5 horizontal price levels
    for (let i = 0; i <= 5; i++) {
      const price = yMin + (yRange * i / 5)
      const y = getY(price)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(chartWidth, y)
      ctx.stroke()

      // Draw price label
      ctx.fillStyle = '#666666'
      ctx.font = '10px sans-serif'
      ctx.fillText(price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), chartWidth + 5, y + 3)
    }

    // Draw vertical timeline grids (every 20 bars)
    for (let i = 0; i < N; i += 20) {
      const x = getX(i)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, chartHeight)
      ctx.stroke()
    }

    // Step 5: Draw Bollinger Bands
    const bbHistory = indicators?.bb?.history?.slice(startIndex) || []
    if (bbHistory.length > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.03)'
      ctx.beginPath()
      let first = true
      for (let i = 0; i < bbHistory.length; i++) {
        const val = bbHistory[i]?.upper
        if (val !== undefined && val !== null) {
          const x = getX(i)
          const y = getY(val)
          if (first) {
            ctx.moveTo(x, y)
            first = false
          } else {
            ctx.lineTo(x, y)
          }
        }
      }
      for (let i = bbHistory.length - 1; i >= 0; i--) {
        const val = bbHistory[i]?.lower
        if (val !== undefined && val !== null) {
          const x = getX(i)
          const y = getY(val)
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.fill()

      // Upper band line
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      first = true
      for (let i = 0; i < bbHistory.length; i++) {
        const val = bbHistory[i]?.upper
        if (val !== undefined && val !== null) {
          const x = getX(i)
          const y = getY(val)
          if (first) { ctx.moveTo(x, y); first = false }
          else ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Lower band line
      ctx.beginPath()
      first = true
      for (let i = 0; i < bbHistory.length; i++) {
        const val = bbHistory[i]?.lower
        if (val !== undefined && val !== null) {
          const x = getX(i)
          const y = getY(val)
          if (first) { ctx.moveTo(x, y); first = false }
          else ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    // Step 6: Draw EMA lines
    const ema20 = indicators?.ema?.ema20History?.slice(startIndex) || []
    const ema50 = indicators?.ema?.ema50History?.slice(startIndex) || []
    const ema200 = indicators?.ema?.ema200History?.slice(startIndex) || []

    function drawEma(history, color) {
      if (!history || history.length === 0) return
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.beginPath()
      let first = true
      for (let i = 0; i < history.length; i++) {
        const val = history[i]
        if (val !== undefined && val !== null) {
          const x = getX(i)
          const y = getY(val)
          if (first) { ctx.moveTo(x, y); first = false }
          else ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    drawEma(ema20, '#3b82f6')
    drawEma(ema50, '#f97316')
    drawEma(ema200, '#ef4444')

    // Step 7: Draw candlesticks
    const candleSpacing = colWidth * 0.2
    const bodyWidth = Math.max(2, colWidth - candleSpacing)

    for (let i = 0; i < N; i++) {
      const o = open[i]
      const h = high[i]
      const l = low[i]
      const c = close[i]
      const isBull = c >= o
      const color = isBull ? '#22c55e' : '#ef4444'

      const x = getX(i)
      const yOpen = getY(o)
      const yClose = getY(c)
      const yHigh = getY(h)
      const yLow = getY(l)

      // Wick
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yHigh)
      ctx.lineTo(x, yLow)
      ctx.stroke()

      // Body
      ctx.fillStyle = color
      const yBody = Math.min(yOpen, yClose)
      const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose))
      ctx.fillRect(x - bodyWidth / 2, yBody, bodyWidth, bodyHeight)
    }

    // Step 8: Draw volume bars at bottom
    if (volume.length > 0) {
      const maxVolume = Math.max(...volume) || 1
      for (let i = 0; i < N; i++) {
        const o = open[i]
        const c = close[i]
        const v = volume[i] || 0
        const isBull = c >= o
        const color = isBull ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'

        const x = getX(i)
        const volHeight = (v / maxVolume) * volumeAreaHeight
        const yVol = chartHeight - volHeight

        ctx.fillStyle = color
        ctx.fillRect(x - bodyWidth / 2, yVol, bodyWidth, volHeight)
      }
    }

    // Step 9: Draw current price label on right
    const currentPrice = close[N - 1]
    if (currentPrice !== undefined) {
      const yCurrent = getY(currentPrice)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(chartWidth, yCurrent - 8, labelWidth, 16)
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, chartWidth + 5, yCurrent + 4)
    }

    // Step 10: Draw pattern overlay label at top left if present
    if (indicators?.pattern?.pattern || indicators?.pattern) {
      const patternName = indicators.pattern.pattern || indicators.pattern
      ctx.strokeStyle = '#eab308'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(15, 15, 200, 32)
      ctx.setLineDash([])

      ctx.fillStyle = '#eab308'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`Pattern: ${patternName}`, 25, 35)
    }

    // Label timeframe at top center
    ctx.fillStyle = '#888888'
    ctx.font = '12px sans-serif'
    ctx.fillText(`${timeframe} Timeframe`, width / 2 - 40, 25)

    // Step 11: Convert to base64
    return canvas.toDataURL('image/png').split(',')[1]
  } catch (err) {
    console.error('generateChartImage error:', err)
    return null
  }
}

export async function generateAllChartImages(
  priceData,
  indicators,
  patterns
) {
  if (!createCanvas) {
    console.warn("Canvas not available — vision disabled")
    return null
  }

  try {
    const dailyData = priceData?.daily
    const hourlyData = priceData?.hourly

    if (!dailyData || !hourlyData) {
      console.warn("Price data missing daily or hourly klines")
      return null
    }

    // Aggregate to 4H for the h4 slot
    const h4Data = aggregateTo4H(hourlyData)

    const [dailyImg, h4Img, hourlyImg] = await Promise.all([
      generateChartImage(dailyData, indicators?.daily, '1D'),
      generateChartImage(h4Data, indicators?.hourly, '4H'),
      generateChartImage(hourlyData, indicators?.hourly, '1H')
    ])

    return {
      daily: dailyImg,
      h4: h4Img,
      hourly: hourlyImg,
      generatedAt: new Date().toISOString()
    }
  } catch (err) {
    console.error('generateAllChartImages error:', err)
    return null
  }
}

function aggregateTo4H(hourly) {
  if (!hourly || !hourly.close || hourly.close.length === 0) return null
  const result = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
  const len = hourly.close.length
  for (let i = 0; i < len; i += 4) {
    const tsSlice = hourly.timestamps.slice(i, i + 4)
    const oSlice = hourly.open.slice(i, i + 4)
    const hSlice = hourly.high.slice(i, i + 4)
    const lSlice = hourly.low.slice(i, i + 4)
    const cSlice = hourly.close.slice(i, i + 4)
    const vSlice = hourly.volume.slice(i, i + 4)
    if (cSlice.length === 0) continue

    result.timestamps.push(tsSlice[0])
    result.open.push(oSlice[0])
    result.high.push(Math.max(...hSlice))
    result.low.push(Math.min(...lSlice))
    result.close.push(cSlice[cSlice.length - 1])
    result.volume.push(vSlice.reduce((a, b) => a + b, 0))
  }
  return result
}
