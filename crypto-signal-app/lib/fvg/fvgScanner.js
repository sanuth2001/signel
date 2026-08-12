import { scanAllTimeframeFVGs, detectFVGEntry } from '../engine/fvg.js'
import { generateFVGSignal } from './fvgSignalGenerator.js'
import { sendFVGApproachingAlert, sendFVGEntryAlert } from '../notifications/telegram.js'
import { updateFVGMap } from '../database/db.js'

let activeScannerInterval = null
let latestFVGMapState = {}
let latestWatchlistState = []
const alertedFVGs = new Set() // Prevent duplicate spam

/**
 * Continuous Background FVG Scanner
 * Scans coins for approaching and entering FVG zones every interval.
 */
export async function scanSingleCoin(coin) {
  try {
    const fvgScan = await scanAllTimeframeFVGs(coin)
    updateFVGMap(coin, fvgScan.allFVGs)

    const approaching = fvgScan.nearFVGs.filter(f => !f.priceInZone && Math.abs(f.distanceFromCurrent) <= 1.0)
    const entering = fvgScan.activeFVGs

    // Trigger alerts for approaching FVGs
    for (const fvg of approaching) {
      const alertKey = `app_${coin}_${fvg.id}`
      if (!alertedFVGs.has(alertKey)) {
        alertedFVGs.add(alertKey)
        await sendFVGApproachingAlert(coin, fvg, fvgScan.currentPrice).catch(() => {})
      }
    }

    // Trigger alerts and generate signals for entering FVGs
    for (const fvg of entering) {
      const alertKey = `ent_${coin}_${fvg.id}`
      if (!alertedFVGs.has(alertKey)) {
        alertedFVGs.add(alertKey)
        await sendFVGEntryAlert(coin, fvg, fvgScan.currentPrice).catch(() => {})

        // Generate full FVG signal immediately
        generateFVGSignal(coin).catch(err => {
          console.error(`[fvgScanner] Error generating signal for ${coin}:`, err.message)
        })
      }
    }

    return fvgScan
  } catch (err) {
    console.error(`[fvgScanner] Error scanning ${coin}:`, err.message)
    return null
  }
}

export async function runFVGScanner(coins = ['BTC', 'ETH', 'SOL', 'BNB'], intervalSeconds = 30) {
  console.log(`[fvgScanner] Starting FVG background scanner for ${coins.join(', ')} every ${intervalSeconds}s...`)

  const scanAll = async () => {
    const results = await Promise.all(coins.map(coin => scanSingleCoin(coin)))

    const allCombined = []
    const watchlist = []

    results.forEach(res => {
      if (res && res.allFVGs) {
        allCombined.push(...res.allFVGs)
        watchlist.push(...res.nearFVGs)
      }
    })

    // Sort by priority score
    latestFVGMapState = {
      coins,
      timestamp: new Date().toISOString(),
      allFVGs: allCombined.sort((a, b) => b.quality - a.quality),
      activeFVGs: allCombined.filter(f => f.priceInZone),
      approachingFVGs: watchlist
    }

    latestWatchlistState = watchlist
  }

  // Initial immediate run
  await scanAll()

  if (activeScannerInterval) {
    clearInterval(activeScannerInterval)
  }

  activeScannerInterval = setInterval(scanAll, intervalSeconds * 1000)
  return latestFVGMapState
}

export function stopFVGScanner() {
  if (activeScannerInterval) {
    clearInterval(activeScannerInterval)
    activeScannerInterval = null
    console.log('[fvgScanner] FVG background scanner stopped.')
  }
}

export function getActiveFVGMap() {
  return latestFVGMapState
}

export function getFVGWatchlist() {
  return latestWatchlistState
}

// ─── CLI TEST RUNNER ──────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  console.log('\n🧪 Testing Multi-TF FVG Scanner...')
  scanAllTimeframeFVGs('BTC').then(fvgScan => {
    console.log(`✅ Coin: ${fvgScan.coin}`)
    console.log(`✅ Current Price: $${fvgScan.currentPrice}`)
    console.log(`✅ Total FVGs detected: ${fvgScan.summary.totalFVGs}`)
    console.log(`✅ Fresh FVGs: ${fvgScan.freshFVGs.length}`)
    console.log(`✅ Active (Price inside FVG): ${fvgScan.activeFVGs.length}`)
    console.log(`✅ Near FVGs (within 1.5%): ${fvgScan.nearFVGs.length}`)
    console.log(`✅ Stacked FVGs (Multi-TF): ${fvgScan.stackedFVGs.length}`)

    console.log('\nSample Timeframe Counts:')
    Object.keys(fvgScan.timeframes).forEach(tf => {
      console.log(`   - ${tf}: ${fvgScan.timeframes[tf].length} FVGs`)
    })

    console.log('\n🎉 Multi-TF Scanner Test Passed!\n')
    process.exit(0)
  }).catch(err => {
    console.error('❌ Scanner test failed:', err)
    process.exit(1)
  })
}
