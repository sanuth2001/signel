import { getAllSignals } from '../../../lib/database/db.js'
import { generateStrategyInsights } from '../../../lib/claude/memory.js'

export async function GET() {
  try {
    const allSignals = getAllSignals()
    const insights = await generateStrategyInsights(allSignals)
    return Response.json({ insights, totalSignals: allSignals.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
