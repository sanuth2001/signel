// Prompt 33 — Backtest API Route
import { runBacktest } from '../../../lib/backtest/engine.js'

let lastRun = 0
const BACKTEST_COOLDOWN = 30000  // 30 seconds between runs

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const coin = (searchParams.get('coin') || 'BTC').toUpperCase()
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '90'), 7), 365)
  const confidenceThreshold = Math.min(Math.max(parseInt(searchParams.get('confidence') || '70'), 50), 95)
  const riskPercent = Math.min(Math.max(parseFloat(searchParams.get('risk') || '2'), 0.5), 10)

  // Light rate limiting
  const now = Date.now()
  if (now - lastRun < BACKTEST_COOLDOWN) {
    return Response.json({ error: 'Please wait 30 seconds between backtests' }, { status: 429 })
  }

  try {
    lastRun = now
    const results = await runBacktest(coin, days, { confidenceThreshold, riskPercent })
    return Response.json({ success: true, ...results })
  } catch (err) {
    console.error('Backtest error:', err.message)
    lastRun = 0
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
