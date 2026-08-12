import { COINS } from '../../../lib/utils/constants.js'

// Server-side cache: avoids hammering CoinGecko on every request
// TTL: 60 seconds (matches the client poll interval)
let cache = null
let cacheTime = 0
const CACHE_TTL_MS = 60_000

export async function GET() {
  const now = Date.now()

  // Return cached payload if still fresh
  if (cache && now - cacheTime < CACHE_TTL_MS) {
    return Response.json(cache, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  }

  const ids = Object.values(COINS).map(c => c.id).join(',')
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Next.js server-side fetch: revalidate every 60 s
      next: { revalidate: 60 },
    })

    if (res.status === 429) {
      console.warn('[prices] CoinGecko rate-limited (429). Serving stale cache or empty payload.')
      // Return stale cache if available, otherwise empty
      const payload = cache ?? { prices: {}, rateLimited: true }
      return Response.json(payload, { status: 200 })
    }

    if (!res.ok) {
      throw new Error(`CoinGecko responded ${res.status}`)
    }

    const data = await res.json()
    const prices = {}

    Object.entries(COINS).forEach(([sym, c]) => {
      const info = data[c.id]
      if (info) {
        prices[sym] = {
          price: info.usd,
          change24h: info.usd_24h_change ?? 0,
        }
      }
    })

    const payload = { prices, rateLimited: false, updatedAt: new Date().toISOString() }
    cache = payload
    cacheTime = now

    return Response.json(payload, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  } catch (err) {
    console.error('[prices] Failed to fetch multi-coin prices:', err.message)
    // Return stale cache rather than an error to keep the UI running
    const fallback = cache ?? { prices: {}, rateLimited: false, error: err.message }
    return Response.json(fallback, { status: 200 })
  }
}
