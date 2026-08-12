import { getSignalById, updateOutcome, savePostMortem } from '../../../lib/database/db.js'
import { analyzePostMortem } from '../../../lib/claude/postmortem.js'
import { sendOutcomeConfirmation } from '../../../lib/notifications/telegram.js'

// Win milestone tracking
const WIN_MILESTONES = [3, 5, 10, 25, 50]

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

    // Win milestone notification
    let winMilestone = null
    if (outcome === 'win') {
      try {
        const { getDb } = await import('../../../lib/database/db.js')
        const wins = getDb().prepare('SELECT COUNT(*) as count FROM signals WHERE outcome = "win"').get()
        const winCount = wins.count
        if (WIN_MILESTONES.includes(winCount)) {
          winMilestone = winCount
        }
      } catch (e) {}
    }

    // Telegram notification for outcome (Prompt 34)
    if (pnlPercent !== null) {
      sendOutcomeConfirmation(signal, outcome, pnlPercent).catch(e => console.warn('[telegram] outcome notify failed:', e.message))
    }

    const updated = getSignalById(id)
    return Response.json({ success: true, signal: updated, postMortem, winMilestone })
  } catch (err) {
    console.error('Outcome update error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
