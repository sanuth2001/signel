import { COINS } from '../../../lib/utils/constants.js'
import logger from '../../../lib/utils/logger.js'

export async function GET(request) {
  // Optional security key check
  const { searchParams } = new URL(request.url)
  const authKey = searchParams.get('key')
  const expectedKey = process.env.CRON_AUTH_KEY

  if (expectedKey && authKey !== expectedKey) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const coinsToRefresh = Object.keys(COINS)

  console.log(`[cron] Triggering webhook signal refresh for: ${coinsToRefresh.join(', ')}`)
  
  // Fire sequential fetches asynchronously to not block the cron HTTP response
  const runRefreshes = async () => {
    for (const coin of coinsToRefresh) {
      try {
        await fetch(`${baseUrl}/api/signal?coin=${coin}`)
        // Sleep to avoid rate limits
        await new Promise(r => setTimeout(r, 4000))
      } catch (e) {
        logger.error(`Cron refresh failed for ${coin}: ${e.message}`)
      }
    }
  }

  runRefreshes()

  return Response.json({
    success: true,
    message: `Triggered signal refresh for ${coinsToRefresh.length} coins.`,
  })
}
