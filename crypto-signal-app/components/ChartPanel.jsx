'use client'
import { useEffect, useRef } from 'react'

export default function ChartPanel({ ohlcv, indicators, signal, selectedTimeframe = '1D' }) {
  const chartRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!ohlcv?.close?.length || typeof window === 'undefined') return

    let chart = null

    const initChart = async () => {
      const LightweightCharts = await import('lightweight-charts')
      const { createChart, CrosshairMode, LineStyle, CandlestickSeries, LineSeries } = LightweightCharts

      if (!containerRef.current) return

      // Clean up previous instance
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
          } else if (candles.length > 0) {
            line.setData([
              { time: candles[0].time, value: indicators.ema[cfg.key] },
              { time: candles[candles.length - 1].time, value: indicators.ema[cfg.key] },
            ])
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
        } else if (candles.length > 0) {
          const { upper, lower } = indicators.bb
          bbUpper.setData([{ time: candles[0].time, value: upper }, { time: candles[candles.length - 1].time, value: upper }])
          bbLower.setData([{ time: candles[0].time, value: lower }, { time: candles[candles.length - 1].time, value: lower }])
        }
      }

      // Signal lines
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
  }, [ohlcv, indicators, signal])

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Price Chart</h3>
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
  )
}
