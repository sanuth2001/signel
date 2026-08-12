// POST /api/track — start or stop tracking a signal
// GET  /api/track?id=N — get current tracking snapshot

import { NextResponse } from 'next/server'
import {
  getSignalById,
  startTracking,
  stopTracking,
  getTimeline,
  getActiveTrackedSignals,
  getLastSMCSnapshot,
} from '../../../lib/database/db.js'
import { monitorSignal } from '../../../lib/tracking/signalTracker.js'
import { analyzeSMC, toOHLCV } from '../../../lib/engine/smartMoneyConcepts.js'
import { calculateSignalHealth, detectSignalInvalidation } from '../../../lib/tracking/signalTracker.js'

// ─── POST /api/track ──────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { signalId, action } = body

    if (!signalId || !action) {
      return NextResponse.json({ error: 'signalId and action required' }, { status: 400 })
    }

    const signal = getSignalById(signalId)
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    if (action === 'start') {
      if (signal.outcome !== 'pending') {
        return NextResponse.json({ error: 'Can only track pending signals' }, { status: 400 })
      }
      startTracking(signalId)

      // Run initial monitor immediately (non-blocking — fire and forget)
      monitorSignal(signalId).catch(e => console.error('[track] Initial monitor error:', e.message))

      return NextResponse.json({
        success: true,
        message: 'Tracking started',
        signalId,
        coin: signal.coin,
        signal: signal.signal,
      })
    }

    if (action === 'stop') {
      stopTracking(signalId)
      return NextResponse.json({ success: true, message: 'Tracking stopped', signalId })
    }

    return NextResponse.json({ error: 'action must be "start" or "stop"' }, { status: 400 })
  } catch (err) {
    console.error('[track POST] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── GET /api/track?id=N ──────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      // Return all currently tracked signals
      const active = getActiveTrackedSignals()
      return NextResponse.json({ trackedSignals: active, count: active.length })
    }

    const signalId = parseInt(id)
    const signal   = getSignalById(signalId)
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
    }

    const timeline    = getTimeline(signalId, 20)
    const lastEvent   = timeline.length > 0 ? timeline[timeline.length - 1] : null
    const smcSnapshot = getLastSMCSnapshot(signalId)

    // Compute progress % from DB fields if available
    let progressPercent = 0
    if (signal.entryPrice && signal.target && signal.stopLoss) {
      const isLong  = signal.signal === 'BUY'
      const entry   = signal.entryPrice
      const target  = signal.target
      const lastPrice = timeline.length > 0 ? timeline[timeline.length - 1].price : entry
      const rewardDist = Math.abs(target - entry)
      const currentProgress = isLong ? lastPrice - entry : entry - lastPrice
      progressPercent = rewardDist > 0 ? Math.max(0, Math.min(100, (currentProgress / rewardDist) * 100)) : 0
    }

    return NextResponse.json({
      signalId,
      isTracking:      !!signal.isTracking,
      coin:            signal.coin,
      signalType:      signal.signal,
      entryPrice:      signal.entryPrice,
      stopLoss:        signal.stopLoss,
      target:          signal.target,
      outcome:         signal.outcome,
      progressPercent: parseFloat(progressPercent.toFixed(1)),
      healthScore:     signal.currentHealth || null,
      healthGrade:     signal.healthGrade   || null,
      smcBias:         signal.smcBias       || null,
      chochDetected:   !!signal.chochDetected,
      orderBlockStatus: lastEvent?.orderBlockStatus || smcSnapshot?.nearestOB || 'OB Support Holding',
      fvgStatus:        smcSnapshot?.nearestFVG || 'FVG Zone Intact',
      liquidityStatus:  lastEvent?.liquidityStatus || smcSnapshot?.liquidityRisk || 'Liquidity Normal',
      invalidationReason: signal.invalidationReason || null,
      invalidatedAt:   signal.invalidatedAt || null,
      lastUpdated:     signal.lastTracked   || null,
      timeline:        timeline.slice(-20), // last 20 events
    })
  } catch (err) {
    console.error('[track GET] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
