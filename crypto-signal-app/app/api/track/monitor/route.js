// GET /api/track/monitor
// Manually triggers monitoring for all currently tracked signals.
// Called by the frontend auto-refresh and background job.

import { NextResponse } from 'next/server'
import { monitorAllTrackedSignals } from '../../../../lib/tracking/signalTracker.js'
import { getActiveTrackedSignals } from '../../../../lib/database/db.js'

export async function GET() {
  try {
    const active = getActiveTrackedSignals()
    if (!active.length) {
      return NextResponse.json({ updated: 0, results: [], message: 'No active tracked signals' })
    }

    const results = await monitorAllTrackedSignals()
    return NextResponse.json({
      updated:   results.length,
      total:     active.length,
      timestamp: new Date().toISOString(),
      results:   results.map(r => r ? {
        signalId:      r.signalId,
        coin:          r.currentPrice ? undefined : 'N/A',
        currentPrice:  r.currentPrice,
        healthScore:   r.healthScore,
        healthGrade:   r.healthGrade,
        smcBias:       r.smc?.smcBias,
        event:         r.timelineEvent?.event,
        recommendation: r.recommendation,
        invalidated:   r.invalidation?.isInvalid || false,
      } : null).filter(Boolean),
    })
  } catch (err) {
    console.error('[monitor GET] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
