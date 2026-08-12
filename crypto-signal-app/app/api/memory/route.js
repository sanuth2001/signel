import { getAllSignals } from '../../../lib/database/db.js'
import { generateStrategyInsights, generateWeeklyReport } from '../../../lib/claude/memory.js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    const allSignals = getAllSignals()

    if (type === 'weekly') {
      const report = await generateWeeklyReport(allSignals)
      return Response.json({ report, totalSignals: allSignals.length })
    }

    const insights = await generateStrategyInsights(allSignals)
    return Response.json({ insights, totalSignals: allSignals.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
