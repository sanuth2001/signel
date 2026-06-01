import { getSignalById, updateOutcome, savePostMortem } from '../../../lib/database/db.js'
import { analyzePostMortem } from '../../../lib/claude/postmortem.js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, outcome, closePrice } = body

    if (!id || !outcome || !closePrice) {
      return Response.json({ error: 'id, outcome, and closePrice are required' }, { status: 400 })
    }

    const signal = getSignalById(id)
    if (!signal) return Response.json({ error: 'Signal not found' }, { status: 404 })

    const pnlPercent = signal.entryPrice
      ? parseFloat((((closePrice - signal.entryPrice) / signal.entryPrice) * 100 * (signal.signal === 'SELL' ? -1 : 1)).toFixed(2))
      : null

    updateOutcome(id, outcome, closePrice, pnlPercent)

    let postMortem = null
    if (outcome === 'loss') {
      postMortem = await analyzePostMortem({ ...signal, outcome, pnlPercent, closePrice }, { closePrice })
      savePostMortem(id, postMortem)
    }

    const updated = getSignalById(id)
    return Response.json({ success: true, signal: updated, postMortem })
  } catch (err) {
    console.error('Outcome update error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
