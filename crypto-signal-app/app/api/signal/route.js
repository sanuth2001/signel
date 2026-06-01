import { fetchPriceData } from '../../../lib/fetchers/price.js'
import { fetchOnchainData } from '../../../lib/fetchers/onchain.js'
import { fetchOrderBook } from '../../../lib/fetchers/orderbook.js'
import { fetchSentimentData } from '../../../lib/fetchers/sentiment.js'
import { calculateAllIndicators } from '../../../lib/engine/indicators.js'
import { calculateCVD } from '../../../lib/engine/cvd.js'
import { detectPatterns } from '../../../lib/engine/patterns.js'
import { runConfluenceAnalysis } from '../../../lib/engine/confluence.js'
import { detectRegime, isRegimeTradeable } from '../../../lib/engine/regime.js'
import { analyzeSignal, formatSignalForDisplay } from '../../../lib/claude/signal.js'
import { saveSignal } from '../../../lib/database/db.js'

// Rate limiting: prevent more than 1 call per minute
let lastCallTime = 0
const RATE_LIMIT_MS = 60000

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const coin = (searchParams.get('coin') || 'BTC').toUpperCase()

  // Rate limit check
  const now = Date.now()
  if (now - lastCallTime < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastCallTime)) / 1000)
    return Response.json({ status: 'rate_limited', message: `Wait ${waitSec}s before requesting another signal`, waitSeconds: waitSec }, { status: 429 })
  }

  // 30-second timeout
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Signal pipeline timeout after 30s')), 30000)
  )

  try {
    const pipeline = async () => {
      // Step 1: Price data
      const priceData = await fetchPriceData(coin)

      // Step 2: External data in parallel
      const [onchainData, orderBook, sentimentData] = await Promise.all([
        fetchOnchainData(coin),
        fetchOrderBook(coin),
        fetchSentimentData(coin, priceData.currentPrice),
      ])

      // Step 3: Calculate indicators
      const indicators = calculateAllIndicators(priceData)

      // Step 4: CVD
      const cvd = calculateCVD(priceData.hourly)

      // Step 5: Chart patterns
      const pattern = detectPatterns(priceData.daily)

      // Step 6: Confluence
      const confluence = runConfluenceAnalysis(indicators.daily, indicators.hourly, onchainData)

      // Step 7: Regime detection
      const regime = detectRegime(priceData, indicators, onchainData)
      const tradeableCheck = isRegimeTradeable(regime)

      // Step 8: Block if not tradeable
      if (!tradeableCheck.tradeable) {
        return Response.json({
          status: 'drought',
          regime: tradeableCheck.regime,
          reason: tradeableCheck.reason,
          recommendedAction: tradeableCheck.recommendedAction,
          expectedDuration: tradeableCheck.expectedDuration,
          signal: 'WAIT',
          confidence: 0,
          coin,
          priceData: {
            ...priceData,
            current: priceData.currentPrice,
            change24h: priceData.priceChange24h,
          },
          onchainData,
          confluence,
          regime: tradeableCheck,
        })
      }

      // Step 9: Claude AI analysis
      const rawSignal = await analyzeSignal({
        coin,
        currentPrice: priceData.currentPrice,
        indicators,
        onchainData,
        orderBook,
        confluence,
        pattern,
        regime,
        liquidations: sentimentData.liquidations,
        sentiment: sentimentData,
      })

      // Step 10: Format signal
      const signal = formatSignalForDisplay(rawSignal, { coin, priceData, regime, confluence })

      // Step 11: Save to database
      const id = saveSignal({
        ...signal,
        entryPrice: priceData.currentPrice,
        regime: regime.regime,
        confluenceScore: confluence.weightedScore,
        indicators: JSON.stringify(indicators),
        onchainData: JSON.stringify(onchainData),
      })

      // Step 12: Return full response
      lastCallTime = Date.now()
      return Response.json({
        status: 'signal',
        id,
        ...signal,
        priceData: {
          ...priceData,
          current: priceData.currentPrice,
          change24h: priceData.priceChange24h,
        },
        indicators,
        onchainData,
        orderBook,
        cvd,
        pattern,
        confluence,
        regime: tradeableCheck,
        sentiment: sentimentData,
      })
    }

    lastCallTime = Date.now() // Mark as called to prevent concurrent spam
    return await Promise.race([pipeline(), timeoutPromise])
  } catch (err) {
    console.error('Signal pipeline error:', err.message)
    lastCallTime = 0 // Reset on error so user can retry
    return Response.json({ status: 'error', message: err.message }, { status: 500 })
  }
}
