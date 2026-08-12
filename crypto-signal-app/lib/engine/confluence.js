// ─── Score Individual Indicators ────────────────────────────────────────────
export function scoreIndicators(indicators) {
  if (!indicators) return { bullishCount: 0, bearishCount: 0, neutralCount: 0, rawScore: 0, maxScore: 0 }

  const entries = [
    { signal: indicators.rsi?.signal, strength: indicators.rsi?.strength },
    { signal: indicators.macd?.signalDir, strength: indicators.macd?.strength },
    { signal: indicators.bb?.signal, strength: 'medium' },
    { signal: indicators.ema?.signal, strength: indicators.ema?.goldenCross || indicators.ema?.deathCross ? 'strong' : 'medium' },
    { signal: indicators.volume?.signal, strength: indicators.volume?.spike ? 'strong' : 'weak' },
  ]

  let rawScore = 0, maxScore = 0, bullishCount = 0, bearishCount = 0, neutralCount = 0

  for (const { signal, strength } of entries) {
    const weight = strength === 'strong' ? 1.5 : strength === 'medium' ? 1.0 : 0.7
    maxScore += weight
    if (signal === 'BUY') { rawScore += weight; bullishCount++ }
    else if (signal === 'SELL') { rawScore -= weight; bearishCount++ }
    else neutralCount++
  }

  return { bullishCount, bearishCount, neutralCount, rawScore: parseFloat(rawScore.toFixed(2)), maxScore: parseFloat(maxScore.toFixed(2)) }
}

// ─── Multi-Timeframe Score ───────────────────────────────────────────────────
export function multiTimeframeScore(dailyIndicators, hourlyIndicators) {
  const d1 = scoreIndicators(dailyIndicators)
  const h1 = scoreIndicators(hourlyIndicators)

  // Weights: 1D = 3x, simulate 4H as avg of d1 and h1 (2x), 1H = 1x
  const d1Weight = 3, h4Weight = 2, h1Weight = 1
  const totalWeight = d1Weight + h4Weight + h1Weight

  const d1Score = parseFloat(((d1.rawScore / (d1.maxScore || 1)) * 100).toFixed(1))
  const h1Score = parseFloat(((h1.rawScore / (h1.maxScore || 1)) * 100).toFixed(1))
  const h4Score = parseFloat(((d1Score + h1Score) / 2).toFixed(1))

  const d1Direction = d1.rawScore > 0 ? 'BUY' : d1.rawScore < 0 ? 'SELL' : 'NEUTRAL'
  const h1Direction = h1.rawScore > 0 ? 'BUY' : h1.rawScore < 0 ? 'SELL' : 'NEUTRAL'
  const h4Direction = h4Score > 5 ? 'BUY' : h4Score < -5 ? 'SELL' : 'NEUTRAL'

  const weightedScore = parseFloat((
    (d1Score * d1Weight + h4Score * h4Weight + h1Score * h1Weight) / totalWeight
  ).toFixed(1))

  const directions = [d1Direction, h4Direction, h1Direction]
  const buyCount = directions.filter(d => d === 'BUY').length
  const sellCount = directions.filter(d => d === 'SELL').length

  const direction = buyCount >= 2 ? 'BUY' : sellCount >= 2 ? 'SELL' : 'NEUTRAL'
  const agreement = buyCount === 3 || sellCount === 3 ? 'full' : buyCount === 2 || sellCount === 2 ? 'partial' : 'none'
  const confidence = Math.abs(weightedScore)

  return {
    d1Score, d1Direction,
    h4Score, h4Direction,
    h1Score, h1Direction,
    weightedScore,
    direction,
    agreement,
    confidence: parseFloat(confidence.toFixed(1)),
  }
}

// ─── Drought Detection ───────────────────────────────────────────────────────
export function detectDrought(confluenceResult, onchainData) {
  const { agreement, d1Direction, h1Direction, confidence } = confluenceResult || {}

  if (!confluenceResult) return { isDrought: true, reason: 'No confluence data', missingConditions: [], watchFor: 'Wait for data' }

  const missingConditions = []
  let reasons = []

  if (agreement === 'none') {
    reasons.push('Indicators conflicting across timeframes')
  }
  if (d1Direction !== h1Direction && d1Direction !== 'NEUTRAL' && h1Direction !== 'NEUTRAL') {
    reasons.push(`Daily ${d1Direction} vs Hourly ${h1Direction}`)
  }
  if (confidence < 30) {
    reasons.push('Confidence too low for reliable signal')
  }

  const onchainScore = onchainData?.onchainScore || 0
  if (onchainScore < 2) {
    missingConditions.push('on-chain confirmation')
  }
  if (!onchainData?.whaleTransactions?.count || onchainData.whaleTransactions.count < 300) {
    missingConditions.push('whale activity')
  }

  const isDrought = reasons.length > 0 || confidence < 40

  return {
    isDrought,
    reason: reasons.length > 0 ? reasons.join(' — ') : null,
    missingConditions,
    watchFor: isDrought
      ? `Watch for ${d1Direction === 'BUY' ? 'hourly RSI pullback below 35' : 'hourly RSI push above 65'} AND on-chain confirmation`
      : null,
  }
}

// ─── Master Confluence ───────────────────────────────────────────────────────
export function runConfluenceAnalysis(dailyIndicators, hourlyIndicators, onchainData) {
  const mtf = multiTimeframeScore(dailyIndicators, hourlyIndicators)
  const drought = detectDrought(mtf, onchainData)

  // Boost confidence with on-chain alignment
  let adjustedConfidence = mtf.confidence
  if (onchainData?.overallOnchainSignal === mtf.direction) {
    adjustedConfidence = Math.min(100, adjustedConfidence + 10)
  }

  return {
    ...mtf,
    confidence: adjustedConfidence,
    drought,
    summary: drought.isDrought
      ? `Signal drought: ${drought.reason}`
      : `${mtf.agreement} agreement across timeframes — ${mtf.direction} with ${adjustedConfidence.toFixed(0)}% confidence`,
  }
}

// ─── Conflict Detection (Prompt 22) ──────────────────────────────────────────
export function detectConflicts(indicators, regime, pattern, onchain) {
  const d = indicators?.daily || {}
  const bullish = []
  const bearish = []

  if (d.rsi?.value < 30) bullish.push({ name: 'RSI Oversold', strength: 'strong', value: d.rsi.value })
  else if (d.rsi?.value > 70) bearish.push({ name: 'RSI Overbought', strength: 'strong', value: d.rsi.value })

  if (d.macd?.crossover === 'bullish') bullish.push({ name: 'MACD Bull Cross', strength: 'strong' })
  else if (d.macd?.crossover === 'bearish') bearish.push({ name: 'MACD Bear Cross', strength: 'strong' })
  else if (d.macd?.signalDir === 'BUY') bullish.push({ name: 'MACD Bullish', strength: 'medium' })
  else if (d.macd?.signalDir === 'SELL') bearish.push({ name: 'MACD Bearish', strength: 'medium' })

  if (d.bb?.position === 'lower') bullish.push({ name: 'BB Lower Band', strength: 'medium' })
  else if (d.bb?.position === 'upper') bearish.push({ name: 'BB Upper Band', strength: 'medium' })

  if (d.ema?.trend === 'uptrend') bullish.push({ name: 'EMA Uptrend', strength: d.ema?.goldenCross ? 'strong' : 'medium' })
  else if (d.ema?.trend === 'downtrend') bearish.push({ name: 'EMA Downtrend', strength: d.ema?.deathCross ? 'strong' : 'medium' })

  if (onchain?.exchangeFlow?.direction === 'outflow') bullish.push({ name: 'Exchange Outflow', strength: 'medium' })
  else if (onchain?.exchangeFlow?.direction === 'inflow') bearish.push({ name: 'Exchange Inflow', strength: 'medium' })

  if (onchain?.fearGreed?.value < 25) bullish.push({ name: 'Extreme Fear', strength: 'medium' })
  else if (onchain?.fearGreed?.value > 75) bearish.push({ name: 'Extreme Greed', strength: 'medium' })

  if (pattern?.direction === 'bullish') bullish.push({ name: pattern.pattern, strength: 'medium' })
  else if (pattern?.direction === 'bearish') bearish.push({ name: pattern.pattern, strength: 'medium' })

  const hasConflict = bullish.length > 0 && bearish.length > 0
  const dominantSide = bullish.length >= bearish.length ? 'bullish' : 'bearish'

  return {
    hasConflict,
    bullishSignals: bullish,
    bearishSignals: bearish,
    dominantSide,
    conflictReason: hasConflict
      ? `${bearish.length} bearish vs ${bullish.length} bullish signals`
      : dominantSide === 'bullish' ? 'Bullish signals dominating' : 'Bearish signals dominating',
  }
}

// ─── Full Signal Conflicts (Prompt 27) ───────────────────────────────────────
export function detectSignalConflicts(indicators, regime, pattern, candlePattern, onchain, orderBook, divergences, fibonacci, openInterest, session = null, visionAnalysis = null, patternComparison = null) {
  const d = indicators?.daily || {}
  const h = indicators?.hourly || {}
  const bullishSignals = []
  const bearishSignals = []

  const push = (arr, name, strength) => arr.push({ name, strength })
  
  // RSI Daily
  if (d.rsi?.value < 30) push(bullishSignals, 'RSI Oversold (1D)', 'strong')
  else if (d.rsi?.value > 70) push(bearishSignals, 'RSI Overbought (1D)', 'strong')

  // RSI Hourly
  if (h.rsi?.value < 30) push(bullishSignals, 'RSI Oversold (1H)', 'medium')
  else if (h.rsi?.value > 70) push(bearishSignals, 'RSI Overbought (1H)', 'medium')

  // MACD
  if (d.macd?.crossover === 'bullish') push(bullishSignals, 'MACD Bull Crossover', 'strong')
  else if (d.macd?.crossover === 'bearish') push(bearishSignals, 'MACD Bear Crossover', 'strong')
  else if (d.macd?.signalDir === 'BUY') push(bullishSignals, 'MACD Bullish', 'medium')
  else if (d.macd?.signalDir === 'SELL') push(bearishSignals, 'MACD Bearish', 'medium')

  // BB
  if (d.bb?.position === 'lower') push(bullishSignals, 'BB Lower Band', 'medium')
  else if (d.bb?.position === 'upper') push(bearishSignals, 'BB Upper Band', 'medium')

  // EMA
  if (d.ema?.goldenCross) push(bullishSignals, 'Golden Cross', 'strong')
  else if (d.ema?.deathCross) push(bearishSignals, 'Death Cross', 'strong')
  else if (d.ema?.trend === 'uptrend') push(bullishSignals, 'EMA Uptrend', 'medium')
  else if (d.ema?.trend === 'downtrend') push(bearishSignals, 'EMA Downtrend', 'medium')

  // On-chain
  if (onchain?.exchangeFlow?.direction === 'outflow') push(bullishSignals, 'Exchange Outflow', 'medium')
  else if (onchain?.exchangeFlow?.direction === 'inflow') push(bearishSignals, 'Exchange Inflow', 'medium')

  if (onchain?.fearGreed?.value < 25) push(bullishSignals, 'Extreme Fear', 'medium')
  else if (onchain?.fearGreed?.value > 75) push(bearishSignals, 'Extreme Greed', 'medium')

  const warnings = []

  if (session) {
    if (session.adjustment?.points > 0) {
      bullishSignals.push({
        name: `Session: ${session.current?.name || 'Active Session'}`,
        strength: session.adjustment.points >= 8 ? 'strong' : 'medium',
        value: session.adjustment.reason
      })
    }
    if (session.adjustment?.points < 0) {
      bearishSignals.push({
        name: `Session Risk: ${session.current?.name || 'Active Session'}`,
        strength: 'medium',
        value: `Low liquidity session — reduced reliability`
      })
    }
    if (session.transition?.isTransition && session.transition.warning) {
      warnings.push(session.transition.warning)
    }
  }

  const funding = onchain?.funding
  if (funding?.analysis) {
    if (funding.analysis.signal === 'BUY') {
      bullishSignals.push({
        name: funding.analysis.isExtreme
          ? 'Extreme Negative Funding'
          : 'Negative Funding Rate',
        strength: funding.analysis.strength || 'medium',
        value: funding.analysis.description
      })
    } else if (funding.analysis.signal === 'SELL') {
      bearishSignals.push({
        name: funding.analysis.isExtreme
          ? 'Extreme Positive Funding ⚠️'
          : 'Elevated Funding Rate',
        strength: funding.analysis.strength || 'medium',
        value: funding.analysis.description
      })
    }

    if (funding.analysis.alerts?.length > 0) {
      funding.analysis.alerts.forEach(alert => {
        warnings.push(alert)
      })
    }
  }

  if (onchain?.whaleTransactions?.count > 500) push(bullishSignals, 'High Whale Activity', 'medium')

  // Chart pattern
  if (pattern?.direction === 'bullish') push(bullishSignals, pattern.pattern, 'medium')
  else if (pattern?.direction === 'bearish') push(bearishSignals, pattern.pattern, 'medium')

  // Candle pattern
  if (candlePattern?.direction === 'bullish') push(bullishSignals, `Candle: ${candlePattern.pattern}`, candlePattern.strength === 'very strong' ? 'strong' : 'medium')
  else if (candlePattern?.direction === 'bearish') push(bearishSignals, `Candle: ${candlePattern.pattern}`, candlePattern.strength === 'very strong' ? 'strong' : 'medium')

  // Order Book
  if (orderBook?.signal === 'BUY') push(bullishSignals, 'Order Book Bullish', 'medium')
  else if (orderBook?.signal === 'SELL') push(bearishSignals, 'Order Book Bearish', 'medium')

  // Regime
  if (regime?.regime === 'trending_up') push(bullishSignals, 'Trending Up Regime', 'medium')
  else if (regime?.regime === 'trending_down') push(bearishSignals, 'Trending Down Regime', 'medium')

  // Divergence signals
  if (divergences?.daily?.finalSignal === 'BUY') {
    const strength = divergences.daily.finalStrength === 'very strong' ? 'strong' : (divergences.daily.finalStrength || 'medium')
    bullishSignals.push({ name: 'RSI/MACD Divergence', strength, value: divergences.daily.summary })
  } else if (divergences?.daily?.finalSignal === 'SELL') {
    const strength = divergences.daily.finalStrength === 'very strong' ? 'strong' : (divergences.daily.finalStrength || 'medium')
    bearishSignals.push({ name: 'RSI/MACD Divergence', strength, value: divergences.daily.summary })
  }

  // Fibonacci signals
  if (fibonacci?.currentPosition?.signal === 'BUY') {
    bullishSignals.push({
      name: `Fibonacci ${fibonacci.currentPosition.nearestLevel?.level || ''}`,
      strength: fibonacci.currentPosition.atKeyLevel ? 'strong' : 'medium',
      value: fibonacci.currentPosition.description,
    })
  } else if (fibonacci?.currentPosition?.signal === 'SELL') {
    bearishSignals.push({
      name: `Fibonacci ${fibonacci.currentPosition.nearestLevel?.level || ''}`,
      strength: 'strong',
      value: fibonacci.currentPosition.description,
    })
  }

  // Open Interest signals
  if (openInterest) {
    if (openInterest.takerVolume?.signal === 'BUY') {
      bullishSignals.push({
        name: 'Taker Buy Dominance',
        strength: openInterest.takerVolume.strength || 'medium',
        value: `Ratio ${openInterest.takerVolume.ratio}`,
      })
    } else if (openInterest.takerVolume?.signal === 'SELL') {
      bearishSignals.push({
        name: 'Taker Sell Dominance',
        strength: openInterest.takerVolume.strength || 'medium',
        value: `Ratio ${openInterest.takerVolume.ratio}`,
      })
    }

    if (openInterest.longShort?.extremeLong) {
      bearishSignals.push({
        name: 'Extreme Long Crowding',
        strength: 'strong',
        value: `${openInterest.longShort.longPercent}% longs = liquidation risk`,
      })
    }

    if (openInterest.longShort?.extremeShort) {
      bullishSignals.push({
        name: 'Extreme Short Crowding',
        strength: 'strong',
        value: `${openInterest.longShort.shortPercent}% shorts = squeeze risk`,
      })
    }

    if (openInterest.pattern?.signal && openInterest.pattern.signal !== 'NEUTRAL') {
      const targetArray = openInterest.pattern.signal === 'BUY' ? bullishSignals : bearishSignals
      targetArray.push({
        name: `OI Pattern: ${openInterest.pattern.pattern}`,
        strength: openInterest.pattern.urgency === 'high' ? 'strong' : 'medium',
        value: openInterest.pattern.description,
      })
    }
  }

  // Vision signals
  if (visionAnalysis?.agreement?.allBullish) {
    bullishSignals.push({
      name: 'Vision: All 3 TF Bullish',
      strength: 'very_strong',
      value: 'Claude Vision confirms bullish bias on 1D, 4H, 1H'
    })
  }

  if (visionAnalysis?.agreement?.allBearish) {
    bearishSignals.push({
      name: 'Vision: All 3 TF Bearish',
      strength: 'very_strong',
      value: 'Claude Vision confirms bearish bias on 1D, 4H, 1H'
    })
  }

  if (visionAnalysis?.daily?.primaryPattern?.name) {
    const patternDirection = visionAnalysis.daily.primaryPattern.direction
    const targetArray = patternDirection === 'bullish' ? bullishSignals : bearishSignals
    targetArray.push({
      name: `Vision: ${visionAnalysis.daily.primaryPattern.name}`,
      strength: visionAnalysis.daily.primaryPattern.quality >= 7 ? 'strong' : 'medium',
      value: visionAnalysis.daily.primaryPattern.description
    })
  }

  if (patternComparison?.visionConfirmed) {
    bullishSignals.push({
      name: 'Pattern Double Confirmed',
      strength: 'very_strong',
      value: 'Math detection AND Claude Vision agree on same pattern'
    })
  }

  const weight = { very_strong: 3, strong: 3, medium: 2, weak: 1 }
  const bullishScore = bullishSignals.reduce((s, x) => s + (weight[x.strength] || 1), 0)
  const bearishScore = bearishSignals.reduce((s, x) => s + (weight[x.strength] || 1), 0)
  const dominantSide = bullishScore >= bearishScore ? 'bullish' : 'bearish'
  const diff = Math.abs(bullishScore - bearishScore)
  const conflictLevel = bullishSignals.length > 0 && bearishSignals.length > 0
    ? diff <= 2 ? 'high' : diff <= 5 ? 'medium' : 'low'
    : 'none'

  return {
    bullishSignals,
    bearishSignals,
    bullishScore,
    bearishScore,
    dominantSide,
    conflictLevel,
    conflictReason: conflictLevel === 'none'
      ? `All signals ${dominantSide}`
      : `${bearishScore > bullishScore ? 'Bearish' : 'Bullish'} signals outweigh ${bearishScore > bullishScore ? 'bullish' : 'bearish'} (${Math.max(bullishScore, bearishScore)} vs ${Math.min(bullishScore, bearishScore)} pts)`,
    recommendation: conflictLevel === 'high'
      ? 'Wait for signals to align before entering a position'
      : conflictLevel === 'medium'
        ? `${dominantSide === 'bullish' ? 'Cautious BUY' : 'Cautious SELL'} — some conflict present`
        : `${dominantSide === 'bullish' ? 'BUY' : 'SELL'} conditions favourable`,
    warnings,
  }
}

if (process.argv[2] === 'test') {
  const mockIndicators = {
    rsi: { signal: 'BUY', strength: 'strong' },
    macd: { signalDir: 'BUY', strength: 'medium' },
    bb: { signal: 'BUY' },
    ema: { signal: 'BUY', goldenCross: false, deathCross: false },
    volume: { signal: 'NEUTRAL', spike: false },
  }
  const result = runConfluenceAnalysis(mockIndicators, mockIndicators, { overallOnchainSignal: 'BUY', onchainScore: 3 })
  console.log(JSON.stringify(result, null, 2))
}
