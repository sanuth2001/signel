import { monitorAllTrackedSignals } from '../tracking/signalTracker.js'
import { cleanupOldSignals } from '../database/db.js'

let trackingIntervalId = null
let lastCleanupTime    = 0
const CLEANUP_INTERVAL = 7 * 24 * 3600 * 1000 // 1 week

/**
 * Start the signal tracking background loop.
 * Runs monitorAllTrackedSignals() every 30 seconds.
 * Runs cleanupOldSignals(90) once per week.
 * Safe to call multiple times — will not start duplicate intervals.
 */
export function startAutoRefresh() {
  if (trackingIntervalId) return // already running

  console.log('[autoRefresh] Starting signal tracking monitor (30s interval)…')

  // Run once immediately
  monitorAllTrackedSignals().catch(e =>
    console.error('[autoRefresh] Initial monitor error:', e.message)
  )

  trackingIntervalId = setInterval(async () => {
    try {
      const results = await monitorAllTrackedSignals()
      if (results.length > 0) {
        console.log(`[autoRefresh] Monitored ${results.length} tracked signal(s)`)
      }

      // Weekly DB cleanup
      const now = Date.now()
      if (now - lastCleanupTime > CLEANUP_INTERVAL) {
        lastCleanupTime = now
        try {
          const cleaned = cleanupOldSignals(90)
          if (cleaned.deletedSignals > 0) {
            console.log(`[autoRefresh] Weekly cleanup: removed ${cleaned.deletedSignals} old signals`)
          }
        } catch (e) {
          console.error('[autoRefresh] Cleanup error:', e.message)
        }
      }
    } catch (e) {
      console.error('[autoRefresh] Monitor cycle error:', e.message)
    }
  }, 30_000)

  // Prevent Node from keeping process alive solely for this timer in serverless
  if (trackingIntervalId?.unref) trackingIntervalId.unref()
}

export function stopAutoRefresh() {
  if (trackingIntervalId) {
    clearInterval(trackingIntervalId)
    trackingIntervalId = null
    console.log('[autoRefresh] Signal tracking monitor stopped.')
  }
}
