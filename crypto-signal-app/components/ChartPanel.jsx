'use client'
import { useEffect, useRef, useState } from 'react'

// EMA helper
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

// RSI helper
function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50
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
  return Math.round(100 - 100 / (1 + rs))
}

function getTimeframeSignal(closes, rsi) {
  if (!closes || closes.length < 20) return 'HOLD'
  const current = closes[closes.length - 1]
  const ema20Arr = calcEMA(closes, 20)
  const ema50Arr = calcEMA(closes, Math.min(50, closes.length))
  const ema20 = ema20Arr[ema20Arr.length - 1]
  const ema50 = ema50Arr[ema50Arr.length - 1]

  if (current > ema20 && ema20 > ema50 && rsi >= 48) return 'BUY'
  if (current < ema20 && ema20 < ema50 && rsi <= 52) return 'SELL'
  return 'HOLD'
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

function MiniChart({ ohlcv, title, badge, rsi, signal }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ohlcv?.close?.length || typeof window === 'undefined') return

    let chart = null

    const initChart = async () => {
      const { createChart, CrosshairMode, LineStyle, CandlestickSeries, LineSeries } = await import('lightweight-charts')
      
      if (!containerRef.current) return

      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }

      chart = createChart(containerRef.current, {
        layout: { background: { color: '#0f172a' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#334155' },
        timeScale: { borderColor: '#334155', timeVisible: true },
        width: containerRef.current.clientWidth,
        height: 220,
      })

      chartRef.current = chart

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      })

      const candles = ohlcv.timestamps.map((ts, i) => ({
        time: Math.floor(ts / 1000),
        open: ohlcv.open[i],
        high: ohlcv.high[i],
        low: ohlcv.low[i],
        close: ohlcv.close[i],
      })).filter(c => c.open && c.high && c.low && c.close)
        .sort((a, b) => a.time - b.time)

      if (candles.length > 0) candleSeries.setData(candles)

      const closes = ohlcv.close
      const ema20Arr = calcEMA(closes, 20)
      const ema200Arr = calcEMA(closes, Math.min(200, closes.length))

      if (candles.length > 0) {
        const ema20Series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceLineVisible: false })
        const ema20Data = candles.map((c, idx) => {
          const val = ema20Arr[idx]
          return val !== null && val !== undefined ? { time: c.time, value: val } : null
        }).filter(d => d !== null)
        ema20Series.setData(ema20Data)

        if (ema200Arr.length > 0) {
          const ema200Series = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, priceLineVisible: false })
          const ema200Data = candles.map((c, idx) => {
            const val = ema200Arr[idx]
            return val !== null && val !== undefined ? { time: c.time, value: val } : null
          }).filter(d => d !== null)
          ema200Series.setData(ema200Data)
        }
      }

      if (signal && candles.length > 0) {
        if (signal.entryPrice) {
          const entryLine = chart.addSeries(LineSeries, { color: '#eab308', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false })
          entryLine.setData([{ time: candles[0].time, value: signal.entryPrice }, { time: candles[candles.length - 1].time, value: signal.entryPrice }])
        }
        if (signal.stopLoss) {
          const slLine = chart.addSeries(LineSeries, { color: '#ef444480', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false })
          slLine.setData([{ time: candles[0].time, value: signal.stopLoss }, { time: candles[candles.length - 1].time, value: signal.stopLoss }])
        }
        if (signal.target) {
          const tgtLine = chart.addSeries(LineSeries, { color: '#22c55e80', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false })
          tgtLine.setData([{ time: candles[0].time, value: signal.target }, { time: candles[candles.length - 1].time, value: signal.target }])
        }
      }

      chart.timeScale().fitContent()
    }

    initChart()

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [ohlcv, signal])

  return (
    <div className="flex flex-col bg-gray-900/60 border border-gray-700/30 rounded-xl overflow-hidden p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">{title}</span>
        <span className="text-xs font-semibold">{badge}</span>
      </div>
      <div ref={containerRef} className="w-full h-[220px]" />
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>RSI ({rsi})</span>
          <span className={rsi > 70 ? 'text-red-400 font-bold' : rsi < 30 ? 'text-green-400 font-bold' : 'text-gray-400'}>
            {rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${rsi}%`,
              backgroundColor: rsi > 70 ? '#ef4444' : rsi < 30 ? '#22c55e' : '#3b82f6'
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function ChartPanel({ ohlcv, indicators, signal, selectedTimeframe = '1D', signalData }) {
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const [viewMode, setViewMode] = useState('single')
  const [showFib, setShowFib] = useState(true)
  const [showVisionLevels, setShowVisionLevels] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('chart_view_mode')
    if (saved) setViewMode(saved)
    const fibSaved = localStorage.getItem('chart_show_fib')
    if (fibSaved !== null) setShowFib(fibSaved === 'true')
    const visSaved = localStorage.getItem('chart_show_vision')
    if (visSaved !== null) setShowVisionLevels(visSaved === 'true')
  }, [])

  const handleToggleMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('chart_view_mode', mode)
  }

  const handleToggleFib = () => {
    setShowFib(prev => {
      const next = !prev
      localStorage.setItem('chart_show_fib', String(next))
      return next
    })
  }

  const handleToggleVision = () => {
    setShowVisionLevels(prev => {
      const next = !prev
      localStorage.setItem('chart_show_vision', String(next))
      return next
    })
  }

  // Aggregate daily, 4H, and 1H data
  const daily = signalData?.priceData?.daily || ohlcv
  const hourly = signalData?.priceData?.hourly
  const h4Data = aggregateTo4H(hourly)

  const dRsi = Math.round(indicators?.rsi?.value || calcRSI(daily?.close))
  const h4Rsi = Math.round(calcRSI(h4Data?.close))
  const h1Rsi = Math.round(calcRSI(hourly?.close))

  const dSignal = getTimeframeSignal(daily?.close, dRsi)
  const h4Signal = getTimeframeSignal(h4Data?.close, h4Rsi)
  const h1Signal = getTimeframeSignal(hourly?.close, h1Rsi)

  const getBadge = (sig, weight) => {
    const color = sig === 'BUY' ? 'text-green-400' : sig === 'SELL' ? 'text-red-400' : 'text-yellow-400'
    const emoji = sig === 'BUY' ? '🟢' : sig === 'SELL' ? '🔴' : '🟡'
    return <span className={color}>{emoji} {sig} ({weight}x)</span>
  }

  // Bullish/bearish points calculation
  const bullPoints = (dSignal === 'BUY' ? 3 : 0) + (h4Signal === 'BUY' ? 2 : 0) + (h1Signal === 'BUY' ? 1 : 0)
  const bearPoints = (dSignal === 'SELL' ? 3 : 0) + (h4Signal === 'SELL' ? 2 : 0) + (h1Signal === 'SELL' ? 1 : 0)
  
  const dominant = bullPoints >= bearPoints ? 'bullish' : 'bearish'
  const dominantPoints = dominant === 'bullish' ? bullPoints : bearPoints
  const confluencePercent = Math.round((dominantPoints / 6) * 100)
  const agreeCount = (dSignal === (dominant === 'bullish' ? 'BUY' : 'SELL') ? 1 : 0) +
                     (h4Signal === (dominant === 'bullish' ? 'BUY' : 'SELL') ? 1 : 0) +
                     (h1Signal === (dominant === 'bullish' ? 'BUY' : 'SELL') ? 1 : 0)

  useEffect(() => {
    if (viewMode !== 'single' || !ohlcv?.close?.length || typeof window === 'undefined') return

    let chart = null

    const initChart = async () => {
      const LightweightCharts = await import('lightweight-charts')
      const { createChart, CrosshairMode, LineStyle, CandlestickSeries, LineSeries, HistogramSeries } = LightweightCharts

      if (!containerRef.current) return

      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }

      chart = createChart(containerRef.current, {
        layout: { background: { color: '#0a0f1a' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#374151' },
        timeScale: { borderColor: '#374151', timeVisible: true },
        width: containerRef.current.clientWidth,
        height: 340,
      })

      chartRef.current = chart

      // Candlestick series
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      })

      const candles = ohlcv.timestamps.map((ts, i) => ({
        time: Math.floor(ts / 1000),
        open: ohlcv.open[i],
        high: ohlcv.high[i],
        low: ohlcv.low[i],
        close: ohlcv.close[i],
      })).filter(c => c.open && c.high && c.low && c.close)
        .sort((a, b) => a.time - b.time)

      if (candles.length > 0) candleSeries.setData(candles)

      // EMA overlays
      if (indicators?.ema) {
        const emaConfigs = [
          { key: 'ema20', historyKey: 'ema20History', color: '#3b82f6', title: 'EMA20' },
          { key: 'ema50', historyKey: 'ema50History', color: '#f97316', title: 'EMA50' },
          { key: 'ema200', historyKey: 'ema200History', color: '#ef4444', title: 'EMA200' },
        ]
        for (const cfg of emaConfigs) {
          const historyArr = indicators.ema[cfg.historyKey]
          if (!historyArr && !indicators.ema[cfg.key]) continue

          const line = chart.addSeries(LineSeries, { color: cfg.color, lineWidth: 1.5, title: cfg.title, priceLineVisible: false })
          if (historyArr && candles.length > 0) {
            const lineData = candles.map((c, idx) => {
              const val = historyArr[idx]
              return val !== null && val !== undefined ? { time: c.time, value: val } : null
            }).filter(d => d !== null)
            line.setData(lineData)
          }
        }
      }

      // Bollinger Bands
      if (indicators?.bb) {
        const bbUpper = chart.addSeries(LineSeries, { color: 'rgba(99,102,241,0.35)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, title: 'BB Upper' })
        const bbLower = chart.addSeries(LineSeries, { color: 'rgba(99,102,241,0.35)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, title: 'BB Lower' })
        
        const historyArr = indicators.bb.history
        if (historyArr && candles.length > 0) {
          const upperData = candles.map((c, idx) => {
            const val = historyArr[idx]?.upper
            return val !== null && val !== undefined ? { time: c.time, value: val } : null
          }).filter(d => d !== null)
          const lowerData = candles.map((c, idx) => {
            const val = historyArr[idx]?.lower
            return val !== null && val !== undefined ? { time: c.time, value: val } : null
          }).filter(d => d !== null)
          
          bbUpper.setData(upperData)
          bbLower.setData(lowerData)
        }
      }

      // Volume histogram series
      if (ohlcv?.volume && candles.length > 0) {
        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: '', // overlay volume on price panel
        })
        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        })
        const volumeData = candles.map((c, i) => {
          const prevClose = i > 0 ? candles[i - 1].close : c.open
          return {
            time: c.time,
            value: ohlcv.volume[i] || 0,
            color: c.close >= prevClose ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          }
        })
        volumeSeries.setData(volumeData)
      }

      // Signal lines overlays
      if (signal && candles.length > 0) {
        if (signal.entryPrice) {
          const entryLine = chart.addSeries(LineSeries, { color: '#eab308', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, title: 'Entry' })
          entryLine.setData([{ time: candles[0].time, value: signal.entryPrice }, { time: candles[candles.length - 1].time, value: signal.entryPrice }])
        }
        if (signal.stopLoss) {
          const slLine = chart.addSeries(LineSeries, { color: '#ef444480', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, title: 'SL' })
          slLine.setData([{ time: candles[0].time, value: signal.stopLoss }, { time: candles[candles.length - 1].time, value: signal.stopLoss }])
        }
        if (signal.target) {
          const tgtLine = chart.addSeries(LineSeries, { color: '#22c55e80', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, title: 'Target' })
          tgtLine.setData([{ time: candles[0].time, value: signal.target }, { time: candles[candles.length - 1].time, value: signal.target }])
        }
      }

      // Fibonacci level overlays
      const fibonacci = signalData?.fibonacci
      if (showFib && fibonacci?.retracements?.levels && candles.length > 0) {
        const fibConfigs = [
          { key: 'level_618', label: '0.618 Golden', color: 'rgba(234,179,8,0.7)',   style: LineStyle.Solid  },
          { key: 'level_500', label: '0.500',        color: 'rgba(249,115,22,0.65)', style: LineStyle.Solid  },
          { key: 'level_382', label: '0.382',        color: 'rgba(234,234,26,0.6)',  style: LineStyle.Solid  },
          { key: 'level_786', label: '0.786',        color: 'rgba(239,68,68,0.55)',  style: LineStyle.Solid  },
          { key: 'level_236', label: '0.236',        color: 'rgba(59,130,246,0.55)', style: LineStyle.Solid  },
        ]
        const { levels } = fibonacci.retracements
        for (const cfg of fibConfigs) {
          const price = levels[cfg.key]
          if (!price) continue
          const fibLine = chart.addSeries(LineSeries, { color: cfg.color, lineWidth: 1, lineStyle: cfg.style, priceLineVisible: false, title: cfg.label })
          fibLine.setData([{ time: candles[0].time, value: price }, { time: candles[candles.length - 1].time, value: price }])
        }
        // Extension targets
        const extConfigs = [
          { price: fibonacci.extensions?.primaryTarget,      label: 'Target 1.618', color: 'rgba(34,197,94,0.65)',  style: LineStyle.Dashed  },
          { price: fibonacci.extensions?.conservativeTarget, label: 'Target 1.272', color: 'rgba(34,197,94,0.45)',  style: LineStyle.Dotted  },
        ]
        for (const cfg of extConfigs) {
          if (!cfg.price) continue
          const extLine = chart.addSeries(LineSeries, { color: cfg.color, lineWidth: 1, lineStyle: cfg.style, priceLineVisible: false, title: cfg.label })
          extLine.setData([{ time: candles[0].time, value: cfg.price }, { time: candles[candles.length - 1].time, value: cfg.price }])
        }
      }

      // Vision trendlines overlay
      const visionAnalysis = signalData?.visionAnalysis
      let visionTf = 'daily'
      if (selectedTimeframe === '4H') visionTf = 'h4'
      if (selectedTimeframe === '1H') visionTf = 'hourly'

      const tfVision = visionAnalysis?.[visionTf]
      if (showVisionLevels && tfVision?.trendlines && candles.length > 0) {
        const supportLines = tfVision.trendlines.supportLines || []
        const resistanceLines = tfVision.trendlines.resistanceLines || []

        supportLines.forEach((line) => {
          const price = parseFloat(line.price)
          if (!isNaN(price) && price > 0) {
            const lineSeriesObj = chart.addSeries(LineSeries, {
              color: '#a855f7',
              lineWidth: 1.5,
              lineStyle: LineStyle.Dashed,
              priceLineVisible: false,
              title: `👁️ Vision Support (${line.touches}T)`
            })
            lineSeriesObj.setData([{ time: candles[0].time, value: price }, { time: candles[candles.length - 1].time, value: price }])
          }
        })

        resistanceLines.forEach((line) => {
          const price = parseFloat(line.price)
          if (!isNaN(price) && price > 0) {
            const lineSeriesObj = chart.addSeries(LineSeries, {
              color: '#f97316',
              lineWidth: 1.5,
              lineStyle: LineStyle.Dashed,
              priceLineVisible: false,
              title: `👁️ Vision Resist (${line.touches}T)`
            })
            lineSeriesObj.setData([{ time: candles[0].time, value: price }, { time: candles[candles.length - 1].time, value: price }])
          }
        })
      }

      // ─── Fidelity Method Chart Overlays ───
      const patternData = signalData?.pattern || signal?.patternData || {}
      const markers = []

      // 1. Primary Pattern Label Marker
      if (signal?.pattern && candles.length > 0) {
        markers.push({
          time: candles[candles.length - 1].time,
          position: 'aboveBar',
          color: signal.pattern.direction === 'bullish' ? '#22c55e' : '#ef4444',
          shape: signal.pattern.direction === 'bullish' ? 'arrowUp' : 'arrowDown',
          text: signal.pattern.pattern || 'Pattern Detected',
        })
      }

      // 2. NR4 Marker & Triggers
      if (patternData.narrowRange?.detected && candles.length > 0) {
        const nr = patternData.narrowRange
        markers.push({
          time: candles[candles.length - 1].time,
          position: 'belowBar',
          color: '#eab308',
          shape: 'square',
          text: 'NR4 - Watch Breakout',
        })
        if (nr.buyTrigger) {
          const nrBuy = chart.addSeries(LineSeries, { color: '#22c55e80', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, title: 'NR4 Buy Trigger' })
          nrBuy.setData([{ time: candles[0].time, value: nr.buyTrigger }, { time: candles[candles.length - 1].time, value: nr.buyTrigger }])
        }
        if (nr.sellTrigger) {
          const nrSell = chart.addSeries(LineSeries, { color: '#ef444480', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, title: 'NR4 Sell Trigger' })
          nrSell.setData([{ time: candles[0].time, value: nr.sellTrigger }, { time: candles[candles.length - 1].time, value: nr.sellTrigger }])
        }
      }

      // 3. Gap Visualization Lines & Labels
      if (patternData.gaps?.gaps?.length > 0 && candles.length > 0) {
        const recentGaps = patternData.gaps.gaps.slice(-3)
        recentGaps.forEach((g) => {
          const color = g.type === 'gap_up' ? '#3b82f6' : '#ef4444'
          const gapLine = chart.addSeries(LineSeries, { color, lineWidth: 1.5, lineStyle: LineStyle.Solid, priceLineVisible: false, title: g.type === 'gap_up' ? 'Gap Up' : 'Gap Down' })
          gapLine.setData([{ time: candles[Math.max(0, g.candleIndex - 1)]?.time || candles[0].time, value: g.gapHigh }, { time: candles[candles.length - 1].time, value: g.gapHigh }])
        })
      }

      // 4. Throwback Zone Overlay
      if (patternData.throwback?.throwbackDetected && patternData.throwback?.throwbackLevel && candles.length > 0) {
        const tbLine = chart.addSeries(LineSeries, { color: '#facc15', lineWidth: 2, lineStyle: LineStyle.Dotted, priceLineVisible: false, title: 'Throwback Entry Zone' })
        tbLine.setData([{ time: candles[0].time, value: patternData.throwback.throwbackLevel }, { time: candles[candles.length - 1].time, value: patternData.throwback.throwbackLevel }])
        markers.push({
          time: candles[candles.length - 1].time,
          position: 'belowBar',
          color: '#facc15',
          shape: 'circle',
          text: `Throwback Entry @ $${patternData.throwback.throwbackLevel}`,
        })
      }

      // 5. False Breakout Marker
      if (patternData.falseBreakout?.isFalseBreakout && candles.length > 0) {
        markers.push({
          time: candles[candles.length - 1].time,
          position: 'aboveBar',
          color: '#ef4444',
          shape: 'arrowDown',
          text: patternData.falseBreakout.isTrap ? '🚨 TRAP / REVERSE SIGNAL' : '⚠️ False Breakout',
        })
      }

      // 6. Island Reversal Marker
      if (patternData.islandReversal?.detected && candles.length > 0) {
        const island = patternData.islandReversal
        markers.push({
          time: candles[candles.length - 1].time,
          position: 'aboveBar',
          color: island.signal === 'BUY' ? '#22c55e' : '#ef4444',
          shape: 'square',
          text: `⚠️ ISLAND REVERSAL (${island.type})`,
        })
      }

      if (markers.length > 0) {
        candleSeries.setMarkers(markers)
      }

      chart.timeScale().fitContent()
    }

    initChart()

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [ohlcv, indicators, signal, viewMode, showFib, showVisionLevels, signalData?.fibonacci, signalData?.visionAnalysis])

  return (
    <div className="space-y-4">
      {/* View Mode Toggle Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900/80 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Market Analysis Charts</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleVision}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${showVisionLevels ? 'bg-purple-900/30 border-purple-700/40 text-purple-400' : 'bg-gray-800 border-gray-700/50 text-gray-400 hover:text-gray-200'}`}
            title="Toggle Vision levels"
          >
            👁️ Vision {showVisionLevels ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleToggleFib}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${showFib ? 'bg-yellow-600/20 border-yellow-600/40 text-yellow-400' : 'bg-gray-800 border-gray-700/50 text-gray-400 hover:text-gray-200'}`}
            title="Toggle Fibonacci levels"
          >
            📐 Fib {showFib ? 'ON' : 'OFF'}
          </button>
          <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700/50">
            <button
              onClick={() => handleToggleMode('single')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'single' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              📊 Single View
            </button>
            <button
              onClick={() => handleToggleMode('3-panel')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === '3-panel' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              🔲 3-Panel View
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">{selectedTimeframe} Chart</h3>
            <div className="flex gap-1 text-xs">
              <span className="flex items-center gap-1 text-blue-400"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> EMA20</span>
              <span className="flex items-center gap-1 text-orange-400 ml-2"><span className="w-3 h-0.5 bg-orange-500 inline-block" /> EMA50</span>
              <span className="flex items-center gap-1 text-red-400 ml-2"><span className="w-3 h-0.5 bg-red-500 inline-block" /> EMA200</span>
            </div>
          </div>
          <div ref={containerRef} className="w-full" style={{ minHeight: 340 }}>
            {!ohlcv?.close?.length && (
              <div className="flex items-center justify-center h-80 text-gray-500 text-sm">
                Generate a signal to see the chart
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Confluence stats badge above grid */}
          <div className="p-4 bg-gray-900/60 border border-gray-700/30 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Multi-Timeframe Agreement</span>
                <span className="text-sm font-semibold text-gray-200">
                  Agreement: <span className={dominant === 'bullish' ? 'text-green-400' : 'text-red-400'}>{agreeCount}/3 timeframes {dominant}</span>
                </span>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 flex-1 max-w-xs">
                <div className="flex justify-between w-full text-xs text-gray-400">
                  <span>Confluence weight:</span>
                  <span className="font-bold">{confluencePercent}%</span>
                </div>
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${confluencePercent}%`,
                      backgroundColor: dominant === 'bullish' ? '#22c55e' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grid layout containing 1D, 4H, and 1H charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1D Chart */}
            <div className="block">
              <MiniChart
                ohlcv={daily}
                title="1D - Macro Trend"
                badge={getBadge(dSignal, 3)}
                rsi={dRsi}
                signal={signal}
                timeframe="1D"
              />
            </div>

            {/* 4H Chart */}
            <div className="hidden md:block">
              <MiniChart
                ohlcv={h4Data}
                title="4H - Setup"
                badge={getBadge(h4Signal, 2)}
                rsi={h4Rsi}
                signal={signal}
                timeframe="4H"
              />
            </div>

            {/* 1H Chart */}
            <div className="hidden lg:block">
              <MiniChart
                ohlcv={hourly}
                title="1H - Entry"
                badge={getBadge(h1Signal, 1)}
                rsi={h1Rsi}
                signal={signal}
                timeframe="1H"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
