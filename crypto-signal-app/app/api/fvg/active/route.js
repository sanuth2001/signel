import { NextResponse } from 'next/server'
import { scanAllTimeframeFVGs } from '../../../../lib/engine/fvg.js'

export async function GET() {
  try {
    const coins = ['BTC', 'ETH', 'SOL', 'BNB']
    const scans = await Promise.all(
      coins.map(coin => scanAllTimeframeFVGs(coin).catch(() => null))
    )

    let allFVGs = []
    let activeFVGs = []
    let nearFVGs = []
    let stackedFVGs = []

    const coinsSummary = {}

    scans.forEach((scan, idx) => {
      const c = coins[idx]
      if (scan) {
        allFVGs.push(...scan.allFVGs)
        activeFVGs.push(...scan.activeFVGs)
        nearFVGs.push(...scan.nearFVGs)
        stackedFVGs.push(...scan.stackedFVGs)
        coinsSummary[c] = {
          currentPrice: scan.currentPrice,
          priceInFVG: scan.summary.priceInFVG,
          totalFVGs: scan.summary.totalFVGs,
          activeCount: scan.activeFVGs.length,
          nearCount: scan.nearFVGs.length
        }
      }
    })

    // Sort active and near by quality score & size
    allFVGs.sort((a, b) => b.quality - a.quality)
    activeFVGs.sort((a, b) => b.quality - a.quality)
    nearFVGs.sort((a, b) => Math.abs(a.distanceFromCurrent) - Math.abs(b.distanceFromCurrent))

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      monitoredCoins: coins,
      summary: coinsSummary,
      activeFVGs,
      nearFVGs,
      stackedFVGs,
      allFVGs
    })
  } catch (err) {
    console.error('[api/fvg/active] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
