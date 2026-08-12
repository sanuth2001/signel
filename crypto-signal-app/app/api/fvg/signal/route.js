import { NextResponse } from 'next/server'
import { generateFVGSignal } from '../../../../lib/fvg/fvgSignalGenerator.js'
import { scanAllTimeframeFVGs } from '../../../../lib/engine/fvg.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coin = searchParams.get('coin') || 'BTC'

    const signal = await generateFVGSignal(coin)

    if (signal.signal === 'BUY' || signal.signal === 'SELL') {
      return NextResponse.json({
        success: true,
        status: 'signal_generated',
        signal
      })
    }

    const fvgScan = await scanAllTimeframeFVGs(coin).catch(() => null)
    return NextResponse.json({
      success: true,
      status: 'watching',
      signal: signal.signal,
      reason: signal.reason || signal.message || 'Waiting for price to enter an A-TIER or S-TIER FVG zone with full SMC confirmations',
      nearestFVG: fvgScan?.summary?.nearestBullishFVG || fvgScan?.summary?.nearestBearishFVG || null,
      fvgScan
    })
  } catch (err) {
    console.error('[api/fvg/signal] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
