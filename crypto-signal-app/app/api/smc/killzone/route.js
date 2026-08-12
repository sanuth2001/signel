import { NextResponse } from 'next/server'
import { getKillZoneStatus } from '../../../../lib/engine/supremeSMC.js'

export async function GET() {
  try {
    const killZone = getKillZoneStatus()
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      killZone
    })
  } catch (err) {
    console.error('[api/smc/killzone] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
