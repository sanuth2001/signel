// Signal Tracker Engine
// Real-time monitoring, health scoring, invalidation detection, timeline management

import {
  analyzeSMC,
  detectCHoCH,
  analyzeMarketStructure,
  detectOrderBlocks,
  detectLiquidity,
  toOHLCV,
} from '../engine/smartMoneyConcepts.js'
import {
  getSignalById,
  getActiveTrackedSignals,
  updateSignalTracking,
  updateOutcome,
  stopTracking,
  addTimelineEvent,
  getTimeline,
  markSignalInvalidated as dbMarkInvalidated,
  saveSMCSnapshot,
} from '../database/db.js'
import { sendTrackingUpdate, sendInvalidationAlert, sendHealthDropAlert, sendOutcomeConfirmation } from '../notifications/telegram.js'
import axios from 'axios'

// ─── Price + OHLCV Fetchers ───────────────────────────────────────────────────

export async function fetchCurrentPrice(coin) {
  try {
    const symbol = `${coin.toUpperCase()}USDT`
    const res    = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { timeout: 5000 }
    )
    const price = parseFloat(res.data?.price)
    return isNaN(price) ? null : price
  } catch (e) {
    console.warn(`[signalTracker] Price fetch failed for ${coin}: ${e.message}`)
    return null
  }
}

export async function fetchRecentOHLCV(coin, interval = '1h', limit = 100) {
  try {
    const symbol = `${coin.toUpperCase()}USDT`
    const res    = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { timeout: 6000 }
    )
    // Binance kline format: [openTime, open, high, low, close, volume, ...]
    return res.data.map(k => ({
      timestamp: k[0],
      open:      parseFloat(k[1]),
      high:      parseFloat(k[2]),
      low:       parseFloat(k[3]),
      close:     parseFloat(k[4]),
      volume:    parseFloat(k[5]),
    }))
  } catch (e) {
    console.warn(`[signalTracker] OHLCV fetch failed for ${coin}: ${e.message}`)
    return null
  }
}

// ─── A. Signal Health Score ───────────────────────────────────────────────────

const healthHistory = new Map() // signalId → previous health score

export function calculateSignalHealth(signal, currentPrice, ohlcv) {
  if (!signal || !currentPrice || !ohlcv || ohlcv.length < 5) {
    return {
      healthScore: 50, healthGrade: 'FAIR',
      recommendation: 'Hold — insufficient data',
      components: {}
    }
  }

  const isLong     = signal.signal === 'BUY'
  const direction  = isLong ? 'long' : 'short'
  const entry      = signal.entryPrice || 0
  const stop       = signal.stopLoss   || 0
  const target     = signal.target     || 0

  const riskDist   = Math.abs(entry - stop)
  const rewardDist = Math.abs(target - entry)

  // 1. Price Progress (25 pts)
  let progressScore = 15
  let progressDesc  = ''
  if (riskDist > 0 && rewardDist > 0) {
    const currentProgress = isLong ? currentPrice - entry : entry - currentPrice
    if (currentProgress >= 0) {
      // In profit or at entry: 15 base + up to 10 points as trade reaches target
      const targetRatio = Math.min(1, currentProgress / rewardDist)
      progressScore = Math.round(15 + targetRatio * 10)
      progressDesc  = `+${(targetRatio * 100).toFixed(1)}% toward target`
    } else {
      // In drawdown toward stop loss: 15 base down to 0 at stop loss
      const drawdownRatio = Math.min(1, Math.abs(currentProgress) / riskDist)
      progressScore = Math.round(Math.max(0, 15 * (1 - drawdownRatio)))
      progressDesc  = `${(drawdownRatio * 100).toFixed(1)}% toward stop loss`
    }
  } else {
    progressScore = 15
    progressDesc  = 'Price levels unavailable'
  }

  // 2. Market Structure (25 pts)
  const structure = analyzeMarketStructure(ohlcv)
  let structureScore = 15
  let structureDesc  = `Structure: ${structure.structure}`
  if (isLong) {
    if (structure.structure === 'bullish') { structureScore = 25; structureDesc = 'Bullish HH+HL — aligned ✅' }
    if (structure.structure === 'ranging') { structureScore = 15; structureDesc = 'Ranging — neutral' }
    if (structure.structure === 'bearish') { structureScore = 8;  structureDesc = 'Bearish structure — opposing ⚠️' }
  } else {
    if (structure.structure === 'bearish') { structureScore = 25; structureDesc = 'Bearish LH+LL — aligned ✅' }
    if (structure.structure === 'ranging') { structureScore = 15; structureDesc = 'Ranging — neutral' }
    if (structure.structure === 'bullish') { structureScore = 8;  structureDesc = 'Bullish structure — opposing ⚠️' }
  }

  // 3. CHoCH Status (25 pts)
  const choch = detectCHoCH(ohlcv, structure, direction)
  let chochScore = 25
  let chochDesc  = 'No CHoCH — signal intact ✅'
  if (choch.detected) {
    if (choch.severity === 'mild')     { chochScore = 15; chochDesc = `Mild CHoCH — monitor closely` }
    if (choch.severity === 'moderate') { chochScore = 5;  chochDesc = `Moderate CHoCH — consider reducing` }
    if (choch.severity === 'severe')   { chochScore = 0;  chochDesc = `Severe CHoCH — exit recommended ⚠️` }
  }

  // 4. Order Block Support (15 pts)
  const obs = detectOrderBlocks(ohlcv, entry)
  let obScore = 8
  let obDesc  = 'No order block data'
  if (obs.signalSupportOB) {
    if (!obs.signalSupportOB.mitigated) {
      const aboveOB = isLong
        ? currentPrice > obs.signalSupportOB.zone.low
        : currentPrice < obs.signalSupportOB.zone.high
      if (aboveOB) { obScore = 15; obDesc = `OB at $${obs.signalSupportOB.price.toLocaleString()} holding ✅` }
      else          { obScore = 0;  obDesc = `OB broken — support lost ⚠️` }
    } else {
      obScore = 0
      obDesc  = 'OB mitigated — no support'
    }
  }

  // 5. Liquidity Risk (10 pts)
  const liq = detectLiquidity(ohlcv, currentPrice)
  let liqScore = 10
  let liqDesc  = `Liquidity risk: ${liq.riskToSignal}`
  const relevantSweep = isLong ? liq.nearestSSL : liq.nearestBSL
  if (liq.riskToSignal === 'medium') { liqScore = 7;  liqDesc = `Medium risk — ${isLong ? 'SSL' : 'BSL'} ${relevantSweep?.distanceFromCurrent?.toFixed(1) ?? '?'}% away` }
  if (liq.riskToSignal === 'high')   { liqScore = 3;  liqDesc = `High risk — strong ${isLong ? 'SSL' : 'BSL'} nearby ⚠️` }

  // Total raw score
  const rawScore = progressScore + structureScore + chochScore + obScore + liqScore

  // Exponential smoothing (alpha = 0.35) to eliminate 30-second price noise jitter
  const prevHealth = healthHistory.get(signal.id)
  const healthScore = prevHealth !== undefined
    ? Math.round(0.35 * Math.min(100, Math.max(0, rawScore)) + 0.65 * prevHealth)
    : Math.round(Math.min(100, Math.max(0, rawScore)))

  let healthGrade = 'CRITICAL'
  if (healthScore >= 90)      healthGrade = 'EXCELLENT'
  else if (healthScore >= 75) healthGrade = 'GOOD'
  else if (healthScore >= 60) healthGrade = 'FAIR'
  else if (healthScore >= 45) healthGrade = 'WEAK'
  else if (healthScore >= 30) healthGrade = 'POOR'

  const recommendations = {
    EXCELLENT: 'Hold — signal is performing perfectly',
    GOOD:      'Hold — progressing well toward target',
    FAIR:      'Hold — monitor closely, some concerns',
    WEAK:      'Caution — consider partial exit',
    POOR:      'Warning — exit strongly recommended',
    CRITICAL:  'EXIT NOW — signal thesis likely broken',
  }

  const trend = healthScore > prevHealth ? 'improving' : healthScore < prevHealth ? 'declining' : 'stable'
  healthHistory.set(signal.id, healthScore)

  return {
    healthScore,
    healthGrade,
    recommendation: recommendations[healthGrade],
    trend,
    previousHealth: prevHealth,
    healthChange:   healthScore - prevHealth,
    components: {
      priceProgress: { score: Math.round(progressScore), maxScore: 25, description: progressDesc },
      structure:     { score: structureScore, maxScore: 25, description: structureDesc },
      choch:         { score: chochScore, maxScore: 25, description: chochDesc },
      orderBlock:    { score: obScore, maxScore: 15, description: obDesc },
      liquidity:     { score: liqScore, maxScore: 10, description: liqDesc },
    },
  }
}

// ─── B. Invalidation Detector ────────────────────────────────────────────────

const healthHistoryBuffer = new Map() // signalId → [scores, ...]

export function detectSignalInvalidation(signal, currentPrice, ohlcv, smcAnalysis) {
  if (!signal || !currentPrice) {
    return { isInvalid: false, invalidationType: null, recommendation: 'HOLD' }
  }

  const isLong   = signal.signal === 'BUY'
  const entry    = signal.entryPrice || 0
  const stop     = signal.stopLoss   || 0
  const target   = signal.target     || 0
  const riskDist = Math.abs(entry - stop)

  // Track health history for this signal
  if (!healthHistoryBuffer.has(signal.id)) healthHistoryBuffer.set(signal.id, [])
  const hBuf = healthHistoryBuffer.get(signal.id)
  if (smcAnalysis) {
    const health = calculateSignalHealth(signal, currentPrice, ohlcv)
    hBuf.push(health.healthScore)
    if (hBuf.length > 10) hBuf.shift() // keep last 10 readings
  }

  // ── Hard Invalidation ──────────────────────────────────────────────────────
  // 1. Stop loss hit
  if (isLong && stop > 0 && currentPrice <= stop) {
    return {
      isInvalid: true, invalidationType: 'hard',
      invalidationReason: 'Stop loss triggered',
      invalidationLevel: stop,
      invalidationTime: new Date().toISOString(),
      confidence: 100,
      recommendation: 'EXIT_IMMEDIATELY',
      gracePeriodActive: false,
      potentialLossSaved: 0,
    }
  }
  if (!isLong && stop > 0 && currentPrice >= stop) {
    return {
      isInvalid: true, invalidationType: 'hard',
      invalidationReason: 'Stop loss triggered',
      invalidationLevel: stop,
      invalidationTime: new Date().toISOString(),
      confidence: 100,
      recommendation: 'EXIT_IMMEDIATELY',
      gracePeriodActive: false,
      potentialLossSaved: 0,
    }
  }

  // 2. BOS in opposite direction
  if (smcAnalysis?.bos) {
    if (isLong && smcAnalysis.bos.bearishBOS?.detected && smcAnalysis.bos.bearishBOS.candlesAgo <= 3) {
      return {
        isInvalid: true, invalidationType: 'hard',
        invalidationReason: 'Bearish BOS confirmed — uptrend broken',
        invalidationLevel: smcAnalysis.bos.bearishBOS.level,
        invalidationTime: new Date().toISOString(),
        confidence: 85,
        recommendation: 'EXIT_IMMEDIATELY',
        gracePeriodActive: false,
        potentialLossSaved: parseFloat(Math.abs(pctDiff(currentPrice, stop)).toFixed(2)),
      }
    }
    if (!isLong && smcAnalysis.bos.bullishBOS?.detected && smcAnalysis.bos.bullishBOS.candlesAgo <= 3) {
      return {
        isInvalid: true, invalidationType: 'hard',
        invalidationReason: 'Bullish BOS confirmed — downtrend broken',
        invalidationLevel: smcAnalysis.bos.bullishBOS.level,
        invalidationTime: new Date().toISOString(),
        confidence: 85,
        recommendation: 'EXIT_IMMEDIATELY',
        gracePeriodActive: false,
        potentialLossSaved: parseFloat(Math.abs(pctDiff(currentPrice, stop)).toFixed(2)),
      }
    }
  }

  // ── Grace Period Checks ──────────────────────────────────────────────────────
  // Quick SSL sweep that recovered → bullish, not invalid
  if (smcAnalysis?.liquidity?.liquiditySweepDetected?.ssl && smcAnalysis.liquidity.liquiditySweepDetected.recoveredAfter) {
    const priceSaved = riskDist > 0 ? Math.abs(pctDiff(currentPrice, stop)) : 0
    return {
      isInvalid: false, invalidationType: null,
      invalidationReason: null, confidence: 0,
      recommendation: 'HOLD',
      gracePeriodActive: true,
      gracePeriodReason: 'SSL swept and recovered — liquidity grab likely bullish',
      potentialLossSaved: 0,
    }
  }

  // Price in FVG/OB zone — pullback expected, not invalid
  if (smcAnalysis?.fvg?.priceInFVG && smcAnalysis.fvg.currentFVG?.type === (isLong ? 'bullish' : 'bearish')) {
    return {
      isInvalid: false, invalidationType: null,
      invalidationReason: null, confidence: 0,
      recommendation: 'HOLD',
      gracePeriodActive: true,
      gracePeriodReason: `Price inside ${isLong ? 'bullish' : 'bearish'} FVG — pullback zone, likely to hold`,
      potentialLossSaved: 0,
    }
  }

  // ── Soft Invalidation ─────────────────────────────────────────────────────
  if (smcAnalysis?.choch?.detected) {
    const sev = smcAnalysis.choch.severity
    const priceSaved = riskDist > 0 ? parseFloat(Math.abs(pctDiff(currentPrice, stop)).toFixed(2)) : 0

    if (sev === 'severe') {
      return {
        isInvalid: true, invalidationType: 'soft',
        invalidationReason: `CHoCH severe — ${smcAnalysis.choch.description}`,
        invalidationLevel: smcAnalysis.choch.chochLevel,
        invalidationTime: new Date().toISOString(),
        confidence: 75,
        recommendation: 'EXIT_PARTIAL',
        gracePeriodActive: false,
        potentialLossSaved: priceSaved,
      }
    }
    if (sev === 'moderate') {
      return {
        isInvalid: false, invalidationType: null,
        invalidationReason: null, confidence: 40,
        recommendation: 'WATCH',
        gracePeriodActive: false,
        potentialLossSaved: 0,
      }
    }
  }

  // Health below 30 for 3+ consecutive checks
  if (hBuf.length >= 3 && hBuf.slice(-3).every(h => h < 30)) {
    const priceSaved = riskDist > 0 ? parseFloat(Math.abs(pctDiff(currentPrice, stop)).toFixed(2)) : 0
    return {
      isInvalid: true, invalidationType: 'soft',
      invalidationReason: 'Signal health critical for 3+ consecutive checks — thesis failing',
      invalidationLevel: currentPrice,
      invalidationTime: new Date().toISOString(),
      confidence: 65,
      recommendation: 'EXIT_PARTIAL',
      gracePeriodActive: false,
      potentialLossSaved: priceSaved,
    }
  }

  // Signal timeout (48h for BUY/SELL)
  if (signal.timestamp) {
    const ageMs  = Date.now() - new Date(signal.timestamp).getTime()
    const ageH   = ageMs / 3600000
    if (ageH > 48) {
      return {
        isInvalid: true, invalidationType: 'soft',
        invalidationReason: `Signal expired after ${Math.round(ageH)}h — target time exceeded`,
        invalidationLevel: currentPrice,
        invalidationTime: new Date().toISOString(),
        confidence: 60,
        recommendation: 'EXIT_PARTIAL',
        gracePeriodActive: false,
        potentialLossSaved: 0,
      }
    }
  }

  // All clear
  return {
    isInvalid: false, invalidationType: null,
    invalidationReason: null, invalidationLevel: null,
    invalidationTime: null, confidence: 0,
    recommendation: 'HOLD',
    gracePeriodActive: false,
    gracePeriodReason: null,
    potentialLossSaved: 0,
  }
}

function pctDiff(a, b) {
  if (!b) return 0
  return ((a - b) / b) * 100
}

// ─── C. Timeline Event Classifier ─────────────────────────────────────────────

export function determineTimelineEvent(signal, currentPrice, health, invalidation, smc) {
  const isLong   = signal.signal === 'BUY'
  const entry    = signal.entryPrice || 0
  const target   = signal.target     || 0
  const stop     = signal.stopLoss   || 0
  const reward   = Math.abs(target - entry)

  if (invalidation?.isInvalid && invalidation.invalidationType === 'hard') {
    if (invalidation.invalidationReason?.includes('Stop')) return 'STOP_HIT'
    return 'INVALIDATED_HARD'
  }
  if (invalidation?.isInvalid && invalidation.invalidationType === 'soft') return 'INVALIDATED_SOFT'

  if (smc?.choch?.detected) {
    if (smc.choch.severity === 'severe')   return 'CHOCH_SEVERE'
    if (smc.choch.severity === 'moderate') return 'CHOCH_MODERATE'
    if (smc.choch.severity === 'mild')     return 'CHOCH_MILD'
  }

  const progress = isLong ? (currentPrice - entry) / reward : (entry - currentPrice) / reward

  if (progress >= 1)    return 'TARGET_HIT'
  if (progress >= 0.95) return 'TARGET_NEAR'
  if (progress >= 0.75) return 'PROGRESS_75'
  if (progress >= 0.5)  return 'PROGRESS_50'
  if (progress >= 0.25) return 'PROGRESS_25'

  if (health?.healthScore < 30) return 'HEALTH_CRITICAL'
  if (health?.healthChange < -15) return 'HEALTH_DROPPING'

  const sweepDetected = isLong
    ? smc?.liquidity?.liquiditySweepDetected?.ssl
    : smc?.liquidity?.liquiditySweepDetected?.bsl

  if (sweepDetected) return 'LIQUIDITY_SWEPT'
  if (smc?.liquidity?.liquiditySweepDetected?.recoveredAfter) return 'LIQUIDITY_RECOVERED'

  return null // routine update, no notable event
}

export function buildSignalTimeline(signalId) {
  return getTimeline(signalId)
}

// ─── D. Real-time Monitor ─────────────────────────────────────────────────────

export async function monitorSignal(signalId) {
  try {
    // Step 1: Get signal
    const signal = getSignalById(signalId)
    if (!signal || signal.outcome !== 'pending') {
      console.log(`[signalTracker] Signal ${signalId} not pending — skipping`)
      return null
    }

    // Step 2: Fetch current price
    const currentPrice = await fetchCurrentPrice(signal.coin)
    if (!currentPrice) {
      console.warn(`[signalTracker] Cannot fetch price for ${signal.coin} — skipping monitor`)
      return null
    }

    // Step 3: Fetch OHLCV
    const ohlcvRaw = await fetchRecentOHLCV(signal.coin, '1h', 100)
    if (!ohlcvRaw || ohlcvRaw.length < 10) {
      console.warn(`[signalTracker] Cannot fetch OHLCV for ${signal.coin}`)
      return null
    }
    const ohlcv = ohlcvRaw

    // Step 4: Run SMC analysis
    const direction = signal.signal === 'BUY' ? 'long' : 'short'
    const smc       = analyzeSMC(ohlcv, currentPrice, direction, signal.entryPrice)

    // Step 5: Health score
    const health = calculateSignalHealth(signal, currentPrice, ohlcv)

    // Step 6: Invalidation check
    const invalidation = detectSignalInvalidation(signal, currentPrice, ohlcv, smc)

    // Step 7: Timeline event
    const eventType = determineTimelineEvent(signal, currentPrice, health, invalidation, smc)
    const timelineEvent = {
      timestamp:        new Date().toISOString(),
      price:            currentPrice,
      healthScore:      health.healthScore,
      event:            eventType,
      eventDescription: describeEvent(eventType, signal, currentPrice, health, smc),
      smcBias:          smc.smcBias,
      chochDetected:    smc.choch.detected ? 1 : 0,
      orderBlockStatus: smc.orderBlocks?.signalSupportOB ? JSON.stringify(smc.orderBlocks.signalSupportOB) : null,
      liquidityStatus:  smc.liquidity?.description || null,
      recommendation:   health.recommendation,
    }
    addTimelineEvent(signalId, timelineEvent)

    // Step 8: Update DB
    updateSignalTracking(signalId, {
      currentHealth:  health.healthScore,
      healthGrade:    health.healthGrade,
      smcBias:        smc.smcBias,
      chochDetected:  smc.choch.detected ? 1 : 0,
      lastTracked:    new Date().toISOString(),
    })

    // Save SMC snapshot
    saveSMCSnapshot(signalId, {
      timestamp:       new Date().toISOString(),
      currentPrice,
      structure:       smc.structure?.structure,
      bosDetected:     smc.bos?.mostRecentBOS ? JSON.stringify(smc.bos.mostRecentBOS) : null,
      chochType:       smc.choch?.type || null,
      chochSeverity:   smc.choch?.severity || null,
      nearestOB:       smc.orderBlocks?.nearestBullishOB ? JSON.stringify(smc.orderBlocks.nearestBullishOB) : null,
      nearestFVG:      smc.fvg?.nearestBullishFVG ? JSON.stringify(smc.fvg.nearestBullishFVG) : null,
      liquidityRisk:   smc.liquidity?.riskToSignal || null,
      currentZone:     smc.premiumDiscount?.currentZone || null,
      smcBias:         smc.smcBias,
      smcBullishScore: smc.smcBullishScore,
      smcBearishScore: smc.smcBearishScore,
    })

    // Step 9a: Auto-close on TARGET_HIT → WIN
    if (eventType === 'TARGET_HIT' && signal.outcome === 'pending') {
      const pnlPercent = signal.signal === 'BUY'
        ? parseFloat((((currentPrice - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2))
        : parseFloat((((signal.entryPrice - currentPrice) / signal.entryPrice) * 100).toFixed(2))
      updateOutcome(signalId, 'win', currentPrice, pnlPercent)
      updateSignalTracking(signalId, {
        currentHealth: health.healthScore,
        healthGrade: health.healthGrade,
        smcBias: smc.smcBias,
        chochDetected: smc.choch.detected ? 1 : 0,
        lastTracked: new Date().toISOString(),
      })
      stopTracking(signalId)
      await sendOutcomeConfirmation(signal, 'win', pnlPercent)
      console.log(`[signalTracker] ✅ Signal ${signalId} (${signal.coin}) AUTO-CLOSED as WIN +${pnlPercent}%`)
    }

    // Step 9b: Auto-close on STOP_HIT → LOSS
    if (eventType === 'STOP_HIT' && signal.outcome === 'pending') {
      const pnlPercent = signal.signal === 'BUY'
        ? parseFloat((((currentPrice - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2))
        : parseFloat((((signal.entryPrice - currentPrice) / signal.entryPrice) * 100).toFixed(2))
      updateOutcome(signalId, 'loss', currentPrice, pnlPercent)
      dbMarkInvalidated(signalId, {
        invalidationReason: 'Stop loss hit — auto-closed',
        invalidationTime: new Date().toISOString(),
      })
      await sendOutcomeConfirmation(signal, 'loss', pnlPercent)
      console.log(`[signalTracker] ❌ Signal ${signalId} (${signal.coin}) AUTO-CLOSED as LOSS ${pnlPercent}%`)
    }

    // Step 9c: Handle other hard invalidations
    if (invalidation.isInvalid && invalidation.invalidationType === 'hard' && eventType !== 'STOP_HIT') {
      dbMarkInvalidated(signalId, invalidation)
      await sendInvalidationAlert(signal, invalidation, health)
    }

    // Step 10: Major event Telegram alert
    const majorEvents = ['CHOCH_SEVERE', 'CHOCH_MODERATE', 'TARGET_HIT', 'STOP_HIT',
                         'OB_BROKEN', 'HEALTH_CRITICAL', 'INVALIDATED_SOFT', 'INVALIDATED_HARD']
    if (eventType && majorEvents.includes(eventType) && eventType !== 'TARGET_HIT' && eventType !== 'STOP_HIT') {
      await sendTrackingUpdate(signal, timelineEvent, health)
    }

    // Health drop alert (>20 pts drop)
    if (health.healthChange <= -20) {
      await sendHealthDropAlert(signal, health)
    }

    console.log(`[signalTracker] Signal ${signalId} (${signal.coin} ${signal.signal}): health=${health.healthScore}% ${health.healthGrade} | event=${eventType || 'routine'} | SMC=${smc.smcBias}`)

    return {
      signalId,
      currentPrice,
      healthScore:   health.healthScore,
      healthGrade:   health.healthGrade,
      smc,
      invalidation,
      timelineEvent,
      recommendation: health.recommendation,
    }
  } catch (err) {
    console.error(`[signalTracker] Error monitoring signal ${signalId}:`, err.message)
    return null
  }
}

// ─── Event Description Builder ────────────────────────────────────────────────

function describeEvent(eventType, signal, currentPrice, health, smc) {
  const price = `$${currentPrice?.toLocaleString?.() ?? currentPrice}`
  switch (eventType) {
    case 'SIGNAL_ENTRY':      return `Signal entered at ${price}`
    case 'PROGRESS_25':       return `Reached 25% of target at ${price}`
    case 'PROGRESS_50':       return `Reached 50% of target at ${price} — halfway there!`
    case 'PROGRESS_75':       return `Reached 75% of target at ${price} — almost there`
    case 'TARGET_NEAR':       return `Within 0.5% of target at ${price}`
    case 'TARGET_HIT':        return `🎯 TARGET HIT at ${price}! Signal WIN`
    case 'STOP_HIT':          return `❌ Stop loss triggered at ${price}`
    case 'CHOCH_MILD':        return `Minor CHoCH at ${price} — monitoring`
    case 'CHOCH_MODERATE':    return `⚠️ Moderate CHoCH at ${price} — consider reducing position`
    case 'CHOCH_SEVERE':      return `🔴 Severe CHoCH at ${price} — EXIT recommended (${smc?.choch?.description || ''})`
    case 'LIQUIDITY_SWEPT':   return `Liquidity sweep at ${price} — watching for recovery`
    case 'LIQUIDITY_RECOVERED': return `✅ Recovered after liquidity sweep at ${price} — bullish sign`
    case 'HEALTH_DROPPING':   return `Health dropping (${health?.healthScore}%) — monitoring`
    case 'HEALTH_CRITICAL':   return `🔴 Health critical at ${health?.healthScore}% — consider exit`
    case 'INVALIDATED_SOFT':  return `Soft invalidation at ${price} — signal weakening`
    case 'INVALIDATED_HARD':  return `Hard invalidation at ${price} — signal cancelled`
    case 'OB_BROKEN':         return `Order block support broken at ${price}`
    default:                  return `Price: ${price} | Health: ${health?.healthScore || 0}% | SMC: ${smc?.smcBias || 'N/A'}`
  }
}

// ─── Batch Monitor (called by background job) ─────────────────────────────────

export async function monitorAllTrackedSignals() {
  const trackedSignals = getActiveTrackedSignals()
  if (!trackedSignals.length) return []

  const results = []
  for (const signal of trackedSignals) {
    const result = await monitorSignal(signal.id)
    if (result) results.push(result)
    // Small delay between signals to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }
  return results
}
