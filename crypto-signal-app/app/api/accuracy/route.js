import { getAccuracyStats, getAllSignals } from '../../../lib/database/db.js'
import { generateStrategyInsights } from '../../../lib/claude/memory.js'

// Cache insights for 24h
let insightsCache = null
let cacheTime = 0
const CACHE_DURATION = 24 * 3600 * 1000

export async function GET() {
  try {
    const stats = getAccuracyStats()

    // Use cached insights if fresh enough
    let insights = insightsCache
    if (!insights || Date.now() - cacheTime > CACHE_DURATION) {
      const allSignals = getAllSignals()
      insights = await generateStrategyInsights(allSignals)
      insightsCache = insights
      cacheTime = Date.now()
    }

    // Breakdown by confidence bands
    const allSignals = getAllSignals()
    const byConfidence = {}
    for (const s of allSignals.filter(x => x.outcome !== 'pending')) {
      const band = s.confidence >= 90 ? '90+' : s.confidence >= 80 ? '80-89' : s.confidence >= 70 ? '70-79' : '<70'
      if (!byConfidence[band]) byConfidence[band] = { wins: 0, total: 0 }
      byConfidence[band].total++
      if (s.outcome === 'win') byConfidence[band].wins++
    }

    return Response.json({
      overall: stats,
      byRegime: stats.byRegime,
      byConfidence,
      insights,
      recommendations: insights?.recommendations || [],
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
