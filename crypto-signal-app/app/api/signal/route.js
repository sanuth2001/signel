// ─── Main Signal Pipeline ─────────────────────────────────────────────────────
import { fetchPriceData } from '../../../lib/fetchers/price.js'
import { fetchOnchainData, fetchBTCDominance } from '../../../lib/fetchers/onchain.js'
import { fetchOrderBook } from '../../../lib/fetchers/orderbook.js'
import { fetchSentimentData } from '../../../lib/fetchers/sentiment.js'
import { fetchSocialVelocity } from '../../../lib/fetchers/sentiment.js'
import { trackSmartMoney } from '../../../lib/fetchers/smartmoney.js'
import { calculateAllIndicators } from '../../../lib/engine/indicators.js'
import { detectPatterns } from '../../../lib/engine/patterns.js'
import { detectCandlePattern } from '../../../lib/engine/candlePatterns.js'
import { runConfluenceAnalysis, detectSignalConflicts } from '../../../lib/engine/confluence.js'
import { detectRegime, isRegimeTradeable, compareRegimes, applyDominanceFilter } from '../../../lib/engine/regime.js'
import { analyzeFibonacci } from '../../../lib/engine/fibonacci.js'
import { analyzeWyckoff } from '../../../lib/engine/wyckoff.js'
import { analyzeVPVR } from '../../../lib/engine/vpvr.js'
import { generatePatternPredictions } from '../../../lib/engine/patternPredict.js'
import { analyzeScalping } from '../../../lib/engine/scalping.js'
import { analyzeSignal } from '../../../lib/claude/signal.js'
import { saveSignal, saveRegimeHistory, getLastRegime, getRegimeHistory, getHistory } from '../../../lib/database/db.js'
import { generateAllChartImages } from '../../../lib/utils/chartCapture.js'
import { analyzeAllTimeframes, compareVisionWithMath } from '../../../lib/claude/visionAnalysis.js'
import { analyzeSession } from '../../../lib/engine/sessions.js'
import { fetchOpenInterestData } from '../../../lib/fetchers/openinterest.js'
import { sendTelegramSignal, sendDroughtAlert } from '../../../lib/notifications/telegram.js'
import { validateEnv } from '../../../lib/utils/validateEnv.js'
import { logger } from '../../../lib/utils/logger.js'

import { incrementApiCalls } from '../health/route.js'

let envValidated = false

export async function GET(request) {
  incrementApiCalls()
  const { searchParams } = new URL(request.url)
  const coin = (searchParams.get('coin') || 'BTC').toUpperCase()

  try {
    // Validate env once on first request
    if (!envValidated) {
      validateEnv()
      envValidated = true

      // Bootstrap background auto-refresh in server environments
      if (typeof window === 'undefined' && !global.autoRefreshStarted) {
        global.autoRefreshStarted = true
        import('../../../lib/jobs/autoRefresh.js').then(m => {
          m.startAutoRefresh()
        }).catch(e => console.error('[autoRefresh] Failed to start:', e.message))
      }
    }

    console.log(`\n${'='.repeat(60)}\n[signal] Starting analysis for ${coin}\n${'='.repeat(60)}`)

    // ─── STEP 1: Fetch Price Data ───────────────────────────────────────────
    const priceData = await fetchPriceData(coin)

    // Check for volume drought (Prompt 23)
    if (priceData.volumeDrought) {
      return Response.json({
        success: true,
        coin,
        signal: 'HOLD',
        confidence: 0,
        reasoning: priceData.volumeDroughtReason,
        droughtReason: priceData.volumeDroughtReason,
        waitingFor: { conditions: ['Volume to recover above minimum threshold'], missingConditions: ['Sufficient trading volume'] },
        regimeHistory: getRegimeHistory(coin, 10),
      })
    }

    // ─── STEP 2: Parallel Fetches ───────────────────────────────────────────
    const [onchainData, orderBook, sentimentData, dominanceData, smartMoney, openInterest] = await Promise.allSettled([
      fetchOnchainData(coin, priceData.currentPrice),
      fetchOrderBook(coin),
      fetchSentimentData(coin, priceData.currentPrice),
      fetchBTCDominance(),
      trackSmartMoney(coin),
      fetchOpenInterestData(coin, priceData.currentPrice),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null))

    // ─── STEP 3: Indicators ─────────────────────────────────────────────────
    const indicators = calculateAllIndicators(priceData)
    console.log('[signal] Indicators computed')

    // ─── STEP 3b: Fibonacci Levels ───────────────────────────────────────────────
    const fibonacci = analyzeFibonacci(priceData.daily, priceData.currentPrice)
    console.log('[signal] Fibonacci computed:', fibonacci?.swingPoints?.trend || 'n/a')

    // ─── STEP 4: Chart Pattern ──────────────────────────────────────────────
    const pattern = detectPatterns(priceData)

    // ─── STEP 4b: Candle Pattern (Prompt 21) ────────────────────────────────
    const hourlyCandles = buildCandles(priceData.hourly)
    const candlePattern = detectCandlePattern(hourlyCandles.slice(-5), pattern?.keyLevels || {})
    console.log('[signal] Candle pattern:', candlePattern?.pattern || 'none')

    // ─── STEP 4c: Wyckoff Analysis (GAP 2) ───────────────────────────────────
    let wyckoff = { wyckoffDetected: false }
    try {
      wyckoff = analyzeWyckoff(priceData.daily, priceData.currentPrice)
      if (wyckoff.wyckoffDetected) {
        console.log(`[signal] Wyckoff: ${wyckoff.type} | Phase ${wyckoff.currentPhase?.phase} | Spring: ${wyckoff.events?.spring?.detected}`)
      } else {
        console.log('[signal] Wyckoff: No structure detected')
      }
    } catch (err) {
      console.warn('[signal] Wyckoff analysis error:', err.message)
    }

    // ─── STEP 4d: VPVR — Volume Profile (GAP 4) ─────────────────────────────
    let vpvr = null
    try {
      vpvr = analyzeVPVR(priceData.daily, priceData.currentPrice)
      console.log('[signal] VPVR:', vpvr?.profile?.summary || 'no data')
    } catch (err) {
      console.warn('[signal] VPVR error:', err.message)
    }

    // ─── STEP 4e: Pattern Prediction (GAP 6) ──────────────────────────
    let patternPrediction = null
    try {
      patternPrediction = generatePatternPredictions(priceData.daily, pattern, priceData.currentPrice)
      if (patternPrediction?.topPrediction) {
        console.log('[signal] Pattern Prediction:', patternPrediction.topPrediction.pattern, '|', patternPrediction.topPrediction.prediction.direction)
      }
    } catch (err) {
      console.warn('[signal] Pattern Prediction error:', err.message)
    }

    // ─── STEP 4f: Scalping Analysis (GAP 7) ──────────────────────────
    let scalpSignals = null
    try {
      scalpSignals = analyzeScalping(priceData, priceData.currentPrice)
      if (scalpSignals?.consensus) {
        console.log('[signal] Scalp consensus:', scalpSignals.consensus, '(' + scalpSignals.consensusConfidence + '%)')
      }
    } catch (err) {
      console.warn('[signal] Scalping error:', err.message)
    }

    // ─── STEP 5: CVD (placeholder — optional fetch) ─────────────────────────
    const cvdData = null

    // ─── STEP 5c: Generate chart images and vision analysis ─────────────────
    let visionAnalysis = null
    try {
      console.log('[signal] Generating chart images server-side...')
      const chartImages = await generateAllChartImages(
        priceData,
        indicators,
        pattern
      )

      if (chartImages) {
        console.log('[signal] Running multi-timeframe Claude Vision analysis...')
        visionAnalysis = await analyzeAllTimeframes(
          chartImages,
          coin,
          priceData.currentPrice,
          indicators
        )
        console.log('[signal] Vision analysis complete')
      }
    } catch (err) {
      console.warn('Vision analysis failed:', err.message)
      visionAnalysis = null
    }

    const patternComparison = visionAnalysis
      ? compareVisionWithMath(visionAnalysis, pattern, indicators)
      : null

    // ─── STEP 6: Confluence ─────────────────────────────────────────────────
    const confluence = runConfluenceAnalysis(indicators.daily, indicators.hourly, onchainData)

    // ─── STEP 6b: Session Analysis ───────────────────────────────────────────
    const signalHistory = getHistory(50)
    const sessionAnalysis = analyzeSession(signalHistory)

    // ─── STEP 7: Signal Conflicts (Prompt 27) ─────────────────────────────────────────
    const conflicts = detectSignalConflicts(indicators, null, pattern, candlePattern, onchainData, orderBook, indicators.divergences, fibonacci, openInterest, sessionAnalysis, visionAnalysis, patternComparison)

    // ─── STEP 8: Regime Detection ────────────────────────────────────────────
    const regime = detectRegime(priceData, indicators, onchainData)
    const tradeability = isRegimeTradeable(regime, orderBook)  // Prompt 23: pass orderBook

    // Track regime changes (Prompt 35)
    const lastRegimeData = getLastRegime(coin)
    const regimeChange = compareRegimes(regime.regime, lastRegimeData?.regime)
    saveRegimeHistory(coin, regime.regime)

    const currentRegimeDb = getLastRegime(coin)
    tradeability.startTime = currentRegimeDb?.startTime || new Date().toISOString()

    // Add session block check (Prompt 27 / Session Analysis)
    if (sessionAnalysis.adjustment.block) {
      logger.signal(coin, 'WAIT', 0)
      return Response.json({
        success: true,
        coin,
        status: "drought",
        reason: sessionAnalysis.adjustment.reason,
        droughtReason: sessionAnalysis.adjustment.reason,
        recommendation: "Wait for active trading session",
        nextActiveSession: sessionAnalysis.current.nextSession,
        nextSessionIn: sessionAnalysis.current.minutesUntilNextSession + " minutes",
        signal: "WAIT",
        sessionAnalysis,
        regimeHistory: getRegimeHistory(coin, 10),
      })
    }

    // ─── STEP 9: Thin Market Block (Prompt 23) ────────────────────────────────
    if (!tradeability.tradeable && tradeability.thinMarket) {
      logger.signal(coin, 'HOLD', 0)
      return Response.json({
        success: true,
        coin,
        signal: 'HOLD',
        confidence: 0,
        reasoning: tradeability.reason,
        droughtReason: tradeability.reason,
        regime: tradeability.regime,
        tradeability,
        waitingFor: { conditions: ['Order book depth to normalize'], missingConditions: ['Normal market depth'] },
        regimeHistory: getRegimeHistory(coin, 10),
      })
    }

    // ─── STEP 10: Social Velocity (Prompt 36) ────────────────────────────────
    let socialVelocity = null
    try {
      socialVelocity = await fetchSocialVelocity(coin)
    } catch (e) {
      console.warn('[signal] Social velocity fetch failed:', e.message)
    }

    // ─── STEP 11: Claude AI Analysis ───────────────────────────────────────────────
    const rawSignal = await analyzeSignal({
      coin,
      currentPrice: priceData.currentPrice,
      indicators,
      onchainData,
      orderBook,
      confluence,
      pattern,
      candlePattern,
      conflicts,
      liquidations: sentimentData?.liquidations,
      sentiment: sentimentData,
      regime,
      dominance: coin !== 'BTC' ? dominanceData : null,
      socialVelocity,
      smartMoney,
      divergences: indicators.divergences,
      fibonacci,
      openInterest,
      sessionAnalysis,
      visionAnalysis,
      patternComparison,
      wyckoff,
      vpvr,
      patternPrediction,
      scalpSignals,
    })
    console.log(`[signal] Claude → ${rawSignal.signal} (${rawSignal.confidence}%)`)

    // ─── STEP 12: Apply Thin Market Confidence Adjustment ───────────────────
    if (tradeability.confidenceAdjustment) {
      rawSignal.confidence = Math.max(0, (rawSignal.confidence || 0) + tradeability.confidenceAdjustment)
      rawSignal.warnings = rawSignal.warnings || []
      rawSignal.warnings.push(tradeability.thinMarketWarning)
    }

    // Append warnings from confluence / conflicts (e.g. funding rate alerts)
    if (conflicts.warnings?.length > 0) {
      rawSignal.warnings = rawSignal.warnings || []
      conflicts.warnings.forEach(w => {
        if (!rawSignal.warnings.includes(w)) rawSignal.warnings.push(w)
      })
    }

    // ─── STEP 13: Apply BTC Dominance Filter (Prompt 25) ────────────────────
    const adjustedSignal = applyDominanceFilter(coin, rawSignal, dominanceData)

    // ─── STEP 14: Ensure Directional Signal & Confluence Alignment ─────────────────────
    if (adjustedSignal.signal !== 'BUY' && adjustedSignal.signal !== 'SELL') {
      adjustedSignal.signal = conflicts.dominantSide === 'bearish' ? 'SELL' : 'BUY'
    }

    // Alignment Safety: If very strong candle pattern + dominant confluence oppose signal, align signal to dominant confluence
    if (candlePattern?.strength === 'very strong') {
      if (candlePattern.direction === 'bullish' && adjustedSignal.signal === 'SELL' && conflicts.dominantSide === 'bullish') {
        adjustedSignal.signal = 'BUY'
        adjustedSignal.warnings = adjustedSignal.warnings || []
        adjustedSignal.warnings.push(`⚠️ Signal aligned to BUY due to Very Strong Bullish Engulfing pattern and dominant bullish confluence`)
      } else if (candlePattern.direction === 'bearish' && adjustedSignal.signal === 'BUY' && conflicts.dominantSide === 'bearish') {
        adjustedSignal.signal = 'SELL'
        adjustedSignal.warnings = adjustedSignal.warnings || []
        adjustedSignal.warnings.push(`⚠️ Signal aligned to SELL due to Very Strong Bearish pattern and dominant bearish confluence`)
      }
    }

    // ─── STEP 15: Persist ────────────────────────────────────────────────────
    let savedId = null
    if (adjustedSignal.signal !== 'HOLD' || (adjustedSignal.confidence || 0) > 0) {
      try {
        savedId = saveSignal({
          coin,
          timestamp: new Date().toISOString(),
          signal: adjustedSignal.signal,
          confidence: adjustedSignal.confidence,
          reasoning: adjustedSignal.reasoning,
          risk: adjustedSignal.risk,
          stopLoss: adjustedSignal.stopLoss,
          target: adjustedSignal.target,
          entryPrice: priceData.currentPrice,
          regime: regime.regime,
          confluenceScore: confluence.confidence,
          divergence: JSON.stringify(indicators.divergences),
          openInterest: JSON.stringify(openInterest),
          session: sessionAnalysis.current.name,
          visionAnalysis: visionAnalysis ? JSON.stringify({
            daily: {
              pattern: visionAnalysis.daily?.primaryPattern?.name,
              bias: visionAnalysis.daily?.visualBias?.direction,
              confidence: visionAnalysis.daily?.visualBias?.confidence,
              visualSummary: visionAnalysis.daily?.visualSummary
            },
            h4: {
              pattern: visionAnalysis.h4?.primaryPattern?.name,
              bias: visionAnalysis.h4?.visualBias?.direction,
              visualSummary: visionAnalysis.h4?.visualSummary
            },
            hourly: {
              pattern: visionAnalysis.hourly?.primaryPattern?.name,
              bias: visionAnalysis.hourly?.visualBias?.direction,
              visualSummary: visionAnalysis.hourly?.visualSummary
            },
            agreement: visionAnalysis.agreement,
            multiTFSummary: visionAnalysis.multiTFSummary,
            visionConfirmed: patternComparison?.visionConfirmed,
            agreementLevel: patternComparison?.agreementLevel,
            totalConfidenceBoost: visionAnalysis.totalConfidenceBoost
          }) : null,
          wyckoff: wyckoff.wyckoffDetected ? JSON.stringify({
            type: wyckoff.type,
            phase: wyckoff.currentPhase?.phase,
            phaseName: wyckoff.currentPhase?.name,
            signal: wyckoff.signal,
            tradingRange: wyckoff.tradingRange,
            springDetected: wyckoff.events?.spring?.detected,
            lpsDetected: wyckoff.events?.lps?.detected,
          }) : null
        })
        logger.signal(coin, adjustedSignal.signal, adjustedSignal.confidence)
      } catch (e) {
        console.error('[signal] DB save failed:', e.message)
        logger.error('DB save failed', { coin, error: e.message })
      }
    }

    // ─── STEP 16: Telegram Notification (Prompt 34) ──────────────────────────
    if (adjustedSignal.signal !== 'HOLD' && (adjustedSignal.confidence || 0) >= 75) {
      sendTelegramSignal(
        { ...adjustedSignal, entryPrice: priceData.currentPrice, regime: regime.regime },
        coin,
        priceData
      ).catch(e => console.warn('[telegram] Error:', e.message))
    } else if (adjustedSignal.signal === 'HOLD') {
      sendDroughtAlert(adjustedSignal.droughtReason, adjustedSignal.waitingFor?.conditions?.[0]).catch(() => {})
    }

    const price = priceData.currentPrice || 100
    const isLong = adjustedSignal.signal === 'BUY'

    const scalpSetup = adjustedSignal.scalpSetup && adjustedSignal.scalpSetup.target !== adjustedSignal.target
      ? adjustedSignal.scalpSetup
      : {
          entryPrice: price,
          stopLoss: isLong ? parseFloat((price * 0.992).toFixed(2)) : parseFloat((price * 1.008).toFixed(2)),
          target: isLong ? parseFloat((price * 1.015).toFixed(2)) : parseFloat((price * 0.985).toFixed(2)),
          pnlPercent: isLong ? '+1.50%' : '-1.50%',
          riskRewardRatio: 1.87,
          timeHorizon: '1h - 4h',
        }

    const swingSetup = adjustedSignal.swingSetup
      ? adjustedSignal.swingSetup
      : {
          entryPrice: price,
          stopLoss: adjustedSignal.stopLoss || (isLong ? parseFloat((price * 0.965).toFixed(2)) : parseFloat((price * 1.035).toFixed(2))),
          target: adjustedSignal.target || (isLong ? parseFloat((price * 1.055).toFixed(2)) : parseFloat((price * 0.945).toFixed(2))),
          pnlPercent: isLong ? '+5.50%' : '-5.50%',
          riskRewardRatio: 2.15,
          timeHorizon: '24h - 72h',
        }

    // ─── STEP 17: Build Response ──────────────────────────────────────────────
    return Response.json({
      success: true,
      coin,
      currentPrice: priceData.currentPrice,
      priceChange24h: priceData.priceChange24h,
      signal: adjustedSignal.signal,
      confidence: adjustedSignal.confidence,
      reasoning: adjustedSignal.reasoning,
      risk: adjustedSignal.risk,
      stopLoss: adjustedSignal.stopLoss,
      target: adjustedSignal.target,
      riskRewardRatio: adjustedSignal.riskRewardRatio,
      timeHorizon: adjustedSignal.timeHorizon,
      keyRisk: adjustedSignal.keyRisk,
      droughtReason: adjustedSignal.droughtReason,
      waitingFor: adjustedSignal.waitingFor,
      warnings: adjustedSignal.warnings,
      entryPrice: priceData.currentPrice,
      scalpSetup,
      swingSetup,
      regime: regime.regime,
      regimeChange: regimeChange.changed ? regimeChange : null,
      tradeability,
      regimeHistory: getRegimeHistory(coin, 10),
      confluenceScore: confluence.confidence,
      confluenceDir: confluence.direction,
      agreement: confluence.agreement,
      candlePattern,
      sessionAnalysis,
      visionAnalysis,
      patternComparison,
      conflicts: {
        bullishSignals: conflicts.bullishSignals,
        bearishSignals: conflicts.bearishSignals,
        conflictLevel: conflicts.conflictLevel,
        dominantSide: conflicts.dominantSide,
      },
      pattern: pattern ? {
        pattern: pattern.pattern,
        direction: pattern.direction,
        confidence: pattern.confidence,
        breakoutTarget: pattern.breakoutTarget,
        invalidationLevel: pattern.invalidationLevel,
      } : null,
      indicators: {
        rsi: indicators.daily?.rsi?.value,
        macd: indicators.daily?.macd?.crossover,
        bbPosition: indicators.daily?.bb?.position,
        trend: indicators.daily?.ema?.trend,
        volumeRatio: indicators.daily?.volume?.ratio,
      },
      onchain: {
        fearGreed: onchainData?.fearGreed,
        funding: onchainData?.funding,
        exchangeFlow: onchainData?.exchangeFlow,
        whaleTransactions: onchainData?.whaleTransactions,
        overallSignal: onchainData?.overallOnchainSignal,
      },
      onchainData: {
        fearGreed: onchainData?.fearGreed,
        funding: onchainData?.funding,
        exchangeFlow: onchainData?.exchangeFlow,
        whaleTransactions: onchainData?.whaleTransactions,
        overallSignal: onchainData?.overallOnchainSignal,
      },
      orderBook: {
        buyWall: orderBook?.buyWall,
        sellWall: orderBook?.sellWall,
        bidAskRatio: orderBook?.bidAskRatio,
        signal: orderBook?.signal,
        marketDepthScore: orderBook?.marketDepthScore,
      },
      smartMoney: smartMoney ? {
        netFlow: smartMoney.netFlow,
        signal: smartMoney.signal,
        walletsAccumulating: smartMoney.walletsAccumulating,
        description: smartMoney.description,
      } : null,
      dominance: coin !== 'BTC' ? dominanceData : null,
      socialVelocity: socialVelocity ? {
        velocityRatio: socialVelocity.velocityRatio,
        trend: socialVelocity.trend,
        earlyWarning: socialVelocity.earlyWarning,
        description: socialVelocity.description,
      } : null,
      divergences: indicators.divergences,
      fibonacci,
      openInterest,
      wyckoff: wyckoff.wyckoffDetected ? wyckoff : null,
      vpvr: vpvr ? {
        poc: vpvr.profile.poc,
        vaHigh: vpvr.profile.vaHigh,
        vaLow: vpvr.profile.vaLow,
        hvn: vpvr.profile.hvn,
        lvn: vpvr.profile.lvn,
        position: vpvr.position,
        levels: vpvr.levels,
      } : null,
      patternPrediction,
      scalpSignals,
      savedId,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[signal] Fatal error:', err.message)
    logger.error('Signal pipeline fatal error', { coin, error: err.message })
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ─── Build candle objects from price data ─────────────────────────────────────
function buildCandles(data) {
  if (!data?.timestamps?.length) return []
  return data.timestamps.map((ts, i) => ({
    timestamp: ts,
    open: data.open[i],
    high: data.high[i],
    low: data.low[i],
    close: data.close[i],
    volume: data.volume?.[i] || 0,
  }))
}
