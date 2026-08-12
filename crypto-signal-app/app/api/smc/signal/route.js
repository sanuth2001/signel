import { NextResponse } from 'next/server'
import { generateSupremeSignal } from '../../../../lib/smc/supremeSignalGenerator.js'
import { analyzeSupremeSMC } from '../../../../lib/engine/supremeSMC.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const coin = searchParams.get('coin') || 'BTC'

    const signal = await generateSupremeSignal(coin)

    if (signal.signal === 'BUY' || signal.signal === 'SELL') {
      return NextResponse.json({
        success: true,
        status: 'signal_generated',
        signal
      })
    }

    return NextResponse.json({
      success: true,
      status: 'watching',
      signal: signal.signal,
      reason: signal.reason || 'Waiting for Supreme SMC 3+ setup confluence alignment',
      killZone: signal.killZone || null
    })
  } catch (err) {
    console.error('[api/smc/signal] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
