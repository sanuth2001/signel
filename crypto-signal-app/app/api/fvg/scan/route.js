import { NextResponse } from 'next/server'
import { scanAllTimeframeFVGs } from '../../../../lib/engine/fvg.js'
import { updateFVGMap } from '../../../../lib/database/db.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coin = searchParams.get('coin') || 'BTC'

    const fvgScan = await scanAllTimeframeFVGs(coin)
    try {
      updateFVGMap(coin, fvgScan.allFVGs)
    } catch (e) {
      console.warn('[api/fvg/scan] DB update warning:', e.message)
    }

    return NextResponse.json({
      success: true,
      coin,
      currentPrice: fvgScan.currentPrice,
      summary: fvgScan.summary,
      allFVGs: fvgScan.allFVGs,
      activeFVGs: fvgScan.activeFVGs,
      nearFVGs: fvgScan.nearFVGs,
      stackedFVGs: fvgScan.stackedFVGs,
      timeframes: fvgScan.timeframes,
      fvgMap: fvgScan.allFVGs
    })
  } catch (err) {
    console.error('[api/fvg/scan] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
