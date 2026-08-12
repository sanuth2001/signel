import { NextResponse } from 'next/server'
import { analyzeSupremeSMC } from '../../../../lib/engine/supremeSMC.js'
import { scanAllTimeframeFVGs } from '../../../../lib/engine/fvg.js'
import { detectAllSetups } from '../../../../lib/smc/setupDetector.js'
import { checkMultiSetupConfluence } from '../../../../lib/smc/confluenceChecker.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coin = searchParams.get('coin') || 'BTC'

    const fvgScan = await scanAllTimeframeFVGs(coin).catch(() => null)
    const ohlcv4h = fvgScan?.timeframes?.['4h'] || []
    const currentPrice = fvgScan?.currentPrice || 68000

    const analysis = await analyzeSupremeSMC(ohlcv4h, currentPrice, coin)
    const setups = detectAllSetups(analysis, ohlcv4h, currentPrice)
    const confluence = checkMultiSetupConfluence(setups.activeSetups)

    return NextResponse.json({
      success: true,
      coin,
      currentPrice,
      activeSetups: setups.activeSetups,
      primarySetup: setups.primarySetup,
      totalActive: setups.totalActive,
      bestGrade: setups.bestGrade,
      confluence
    })
  } catch (err) {
    console.error('[api/smc/setups] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
