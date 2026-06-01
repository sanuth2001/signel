import { getHistory, getAccuracyStats } from '../../../lib/database/db.js'

export async function GET() {
  try {
    const signals = getHistory(50)
    const stats = getAccuracyStats()
    return Response.json({ signals, stats })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
