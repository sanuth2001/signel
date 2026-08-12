import { NextResponse } from 'next/server'
import { analyzeSupremeSMC } from '../../../../lib/engine/supremeSMC.js'
import { scanAllTimeframeFVGs } from '../../../../lib/engine/fvg.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coin = searchParams.get('coin') || 'BTC'

    const fvgScan = await scanAllTimeframeFVGs(coin).catch(() => null)
    const ohlcv4h = fvgScan?.timeframes?.['4h'] || []
    const currentPrice = fvgScan?.currentPrice || 68000

    const analysis = await analyzeSupremeSMC(ohlcv4h, currentPrice, coin)

    return NextResponse.json({
      success: true,
      coin,
      currentPrice,
      analysis
    })
  } catch (err) {
    console.error('[api/smc/analysis] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
