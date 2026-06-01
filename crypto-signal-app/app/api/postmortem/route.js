import { getSignalById, savePostMortem } from '../../../lib/database/db.js'
import { analyzePostMortem } from '../../../lib/claude/postmortem.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id'))
    if (!id) return Response.json({ error: 'id query param required' }, { status: 400 })

    const signal = getSignalById(id)
    if (!signal) return Response.json({ error: 'Signal not found' }, { status: 404 })

    // Return existing post-mortem if available
    if (signal.postMortem) {
      return Response.json({ signal, postMortem: JSON.parse(signal.postMortem) })
    }

    // Only generate for completed trades
    if (signal.outcome === 'pending') {
      return Response.json({ signal, postMortem: null, message: 'Signal still pending — record outcome first' })
    }

    const postMortem = await analyzePostMortem(signal, { closePrice: signal.closePrice })
    savePostMortem(id, postMortem)

    return Response.json({ signal: { ...signal, postMortem: JSON.stringify(postMortem) }, postMortem })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
