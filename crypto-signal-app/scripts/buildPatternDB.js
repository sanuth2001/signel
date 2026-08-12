/**
 * Historical Pattern Database Builder — Real Market Data Scanner
 *
 * Fetches 500 daily candles from Binance for all supported coins,
 * runs a sliding-window pattern scan across every 30-candle window,
 * measures actual forward move after each detected pattern,
 * and saves calibrated stats to pattern_db.json.
 *
 * Usage:  node scripts/buildPatternDB.js
 * Output: pattern_db.json (project root)
 */

import axios from 'axios'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { detectPatterns } from '../lib/engine/patterns.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const OUT_FILE  = join(ROOT, 'pattern_db.json')

// ─── Coins to scan ────────────────────────────────────────────────────────────
const COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'LINK', 'ARB', 'MATIC', 'DOT']

// ─── Pattern names we track ───────────────────────────────────────────────────
const TRACKED_PATTERNS = [
  'Bull Flag',
  'Bear Flag',
  'Double Bottom',
  'Double Top',
  'Head and Shoulders Top',
  'Ascending Triangle',
  'Descending Triangle',
  'Symmetric Triangle',
  'Cup and Handle',
  'Pipe Bottom',
  'Island Reversal',
]

// ─── Fetch 500 daily candles from Binance ────────────────────────────────────
async function fetchDailyOHLCV(coin, limit = 500) {
  try {
    const symbol = `${coin}USDT`
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${limit}`
    console.log(`  [fetch] ${symbol} (${limit} daily candles)...`)
    const res = await axios.get(url, { timeout: 10000 })
    const data = res.data
    if (!data || data.length < 50) {
      console.warn(`  [warn] ${coin}: only ${data?.length} candles returned`)
      return null
    }
    const ohlcv = {
      open:   data.map(k => parseFloat(k[1])),
      high:   data.map(k => parseFloat(k[2])),
      low:    data.map(k => parseFloat(k[3])),
      close:  data.map(k => parseFloat(k[4])),
      volume: data.map(k => parseFloat(k[5])),
    }
    console.log(`  [ok] ${coin}: ${ohlcv.close.length} candles fetched`)
    return ohlcv
  } catch (e) {
    console.warn(`  [error] Failed to fetch ${coin}: ${e.message}`)
    return null
  }
}

// ─── Measure forward move after a pattern detection ──────────────────────────
// Returns: { actualMove, isWin, candlesToMove }
function measureForwardMove(fullClose, detectionIdx, direction, windowSize = 30) {
  const lookforward = 20
  const entryPrice  = fullClose[detectionIdx + windowSize - 1]
  if (!entryPrice) return null

  const futureSlice = fullClose.slice(detectionIdx + windowSize, detectionIdx + windowSize + lookforward)
  if (futureSlice.length < 5) return null

  const maxPrice = Math.max(...futureSlice)
  const minPrice = Math.min(...futureSlice)
  const lastPrice = futureSlice[futureSlice.length - 1]

  const upMove   = ((maxPrice - entryPrice) / entryPrice) * 100
  const downMove = ((minPrice - entryPrice) / entryPrice) * 100

  let actualMove, isWin, candlesToMove
  if (direction === 'bullish' || direction === 'reversal') {
    actualMove     = upMove
    const downside = Math.abs(downMove)
    isWin          = upMove > 3 && upMove > downside
    candlesToMove  = futureSlice.findIndex(p => ((p - entryPrice) / entryPrice * 100) >= 3) + 1
    if (candlesToMove === 0) candlesToMove = lookforward
  } else if (direction === 'bearish') {
    actualMove     = downMove
    const upside   = upMove
    isWin          = Math.abs(downMove) > 3 && Math.abs(downMove) > upside
    candlesToMove  = futureSlice.findIndex(p => ((entryPrice - p) / entryPrice * 100) >= 3) + 1
    if (candlesToMove === 0) candlesToMove = lookforward
  } else {
    // Neutral/symmetric — take whichever move is bigger
    actualMove    = Math.abs(upMove) > Math.abs(downMove) ? upMove : downMove
    isWin         = Math.abs(actualMove) > 4
    candlesToMove = Math.min(
      futureSlice.findIndex(p => Math.abs((p - entryPrice) / entryPrice * 100) >= 4) + 1,
      lookforward
    )
    if (candlesToMove === 0) candlesToMove = lookforward
  }

  return { actualMove: parseFloat(actualMove.toFixed(2)), isWin, candlesToMove }
}

// ─── Scan a single coin's OHLCV data ─────────────────────────────────────────
function scanCoin(ohlcv) {
  const { open, high, low, close, volume } = ohlcv
  const numCandles = close.length
  const windowSize = 30
  const results    = {}

  // Initialize accumulators
  for (const name of TRACKED_PATTERNS) {
    results[name] = {
      detections:     0,
      wins:           0,
      totalMove:      0,
      totalCandles:   0,
      falseBreakouts: 0,
      throwbacks:     0,
    }
  }

  for (let i = 0; i <= numCandles - windowSize - 20; i++) {
    const sub = {
      open:   open.slice(i, i + windowSize),
      high:   high.slice(i, i + windowSize),
      low:    low.slice(i, i + windowSize),
      close:  close.slice(i, i + windowSize),
      volume: volume.slice(i, i + windowSize),
    }

    let detectedPatterns = []

    try {
      const res = detectPatterns(sub)
      if (!res) continue

      // Primary pattern
      if (res.primaryPattern?.pattern && TRACKED_PATTERNS.includes(res.primaryPattern.pattern)) {
        const dir = res.primaryPattern.direction || 'bullish'
        detectedPatterns.push({ name: res.primaryPattern.pattern, direction: dir })

        // Check for false breakout (price broke out but reversed)
        if (res.confirmation?.confirmed && res.falseBreakout?.isFalseBreakout) {
          results[res.primaryPattern.pattern].falseBreakouts++
        }
        // Check for throwback (price returned to breakout level)
        if (res.throwback?.throwbackDetected) {
          results[res.primaryPattern.pattern].throwbacks++
        }
      }

      // Pipe Bottom
      if (res.pipeBottom?.detected) {
        detectedPatterns.push({ name: 'Pipe Bottom', direction: 'bullish' })
      }

      // Island Reversal
      if (res.islandReversal?.detected) {
        const dir = res.islandReversal.signal === 'BUY' ? 'bullish' : 'bearish'
        detectedPatterns.push({ name: 'Island Reversal', direction: dir })
      }
    } catch (_) {
      continue
    }

    // Measure forward moves for each detected pattern
    for (const { name, direction } of detectedPatterns) {
      if (!results[name]) continue
      const fwd = measureForwardMove(close, i, direction, windowSize)
      if (!fwd) continue

      results[name].detections++
      if (fwd.isWin) results[name].wins++
      results[name].totalMove    += Math.abs(fwd.actualMove)
      results[name].totalCandles += fwd.candlesToMove
    }
  }

  return results
}

// ─── Merge results from multiple coins ───────────────────────────────────────
function mergeResults(allResults) {
  const merged = {}
  for (const name of TRACKED_PATTERNS) {
    merged[name] = { detections: 0, wins: 0, totalMove: 0, totalCandles: 0, falseBreakouts: 0, throwbacks: 0 }
  }
  for (const coinResults of allResults) {
    for (const name of TRACKED_PATTERNS) {
      if (!coinResults[name]) continue
      merged[name].detections     += coinResults[name].detections
      merged[name].wins           += coinResults[name].wins
      merged[name].totalMove      += coinResults[name].totalMove
      merged[name].totalCandles   += coinResults[name].totalCandles
      merged[name].falseBreakouts += coinResults[name].falseBreakouts
      merged[name].throwbacks     += coinResults[name].throwbacks
    }
  }
  return merged
}

// ─── Compute final calibrated stats ──────────────────────────────────────────
function computeStats(merged) {
  const stats = {}
  for (const name of TRACKED_PATTERNS) {
    const r = merged[name]
    if (!r || r.detections === 0) {
      console.log(`  [skip] ${name}: no detections — keeping defaults`)
      continue
    }
    stats[name] = {
      detections:           r.detections,
      completionRate:       parseFloat((r.wins / r.detections).toFixed(4)),
      winRatePercent:       parseFloat(((r.wins / r.detections) * 100).toFixed(1)),
      avgMovePercent:       parseFloat((r.totalMove / r.detections).toFixed(2)),
      avgCandlesToComplete: Math.round(r.totalCandles / r.detections),
      falseBreakoutRate:    r.wins > 0 ? parseFloat((r.falseBreakouts / r.wins).toFixed(4)) : 0,
      throwbackRate:        r.wins > 0 ? parseFloat((r.throwbacks / r.wins).toFixed(4)) : 0,
    }
    console.log(`  [stat] ${name}: ${r.detections} detections | win rate ${stats[name].winRatePercent}% | avg move ${stats[name].avgMovePercent}% | avg candles ${stats[name].avgCandlesToComplete}`)
  }
  return stats
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function buildPatternDB() {
  console.log('\n' + '═'.repeat(60))
  console.log('  PATTERN DATABASE BUILDER — Real Binance Historical Data')
  console.log('═'.repeat(60))
  console.log(`  Coins: ${COINS.join(', ')}`)
  console.log(`  Candles per coin: 500 daily`)
  console.log(`  Window size: 30 candles | Lookforward: 20 candles`)
  console.log('═'.repeat(60) + '\n')

  const allResults = []
  let coinsSucceeded = 0

  for (const coin of COINS) {
    console.log(`\n📊 Scanning ${coin}...`)
    const ohlcv = await fetchDailyOHLCV(coin, 500)
    if (!ohlcv) {
      console.warn(`  [skip] ${coin}: no data`)
      continue
    }
    const coinResults = scanCoin(ohlcv)
    allResults.push(coinResults)
    coinsSucceeded++

    // Brief pause to avoid Binance rate limit
    await new Promise(r => setTimeout(r, 300))
  }

  if (coinsSucceeded === 0) {
    console.error('\n❌ No coins scanned — check your internet connection.')
    process.exit(1)
  }

  console.log(`\n\n${'═'.repeat(60)}`)
  console.log(`  Merging results from ${coinsSucceeded} coins...`)
  console.log('═'.repeat(60))

  const merged = mergeResults(allResults)
  const stats  = computeStats(merged)

  // ─── Summary table ────────────────────────────────────────────────────────
  const totalDetections = Object.values(stats).reduce((s, r) => s + r.detections, 0)

  const output = {
    meta: {
      builtAt:        new Date().toISOString(),
      coinsScanned:   coinsSucceeded,
      coinList:       COINS.slice(0, coinsSucceeded),
      totalWindows:   totalDetections,
      candlesPerCoin: 500,
      windowSize:     30,
      lookforward:    20,
    },
    patternStats: stats,
  }

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2))

  console.log('\n' + '═'.repeat(60))
  console.log(`  ✅ Pattern DB saved → pattern_db.json`)
  console.log(`  📈 Total pattern detections: ${totalDetections}`)
  console.log(`  🪙 Coins successfully scanned: ${coinsSucceeded}/${COINS.length}`)
  console.log(`  🕐 Built at: ${output.meta.builtAt}`)
  console.log('═'.repeat(60) + '\n')

  console.log('Pattern win rates:')
  for (const [name, s] of Object.entries(stats)) {
    const bar = '█'.repeat(Math.round(s.winRatePercent / 10)).padEnd(10, '░')
    console.log(`  ${name.padEnd(26)} ${bar} ${s.winRatePercent}%  (${s.detections} samples)`)
  }
  console.log()
}

buildPatternDB().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
