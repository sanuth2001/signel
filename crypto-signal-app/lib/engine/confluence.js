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
