import Anthropic from '@anthropic-ai/sdk'

let anthropicClient = null

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

// ─── 15-minute in-memory vision cache ────────────────────────────────────────
const VISION_CACHE_MS = 15 * 60 * 1000 // 15 minutes
const visionCache = new Map() // key: `${coin}_${timeframe}` → { result, expiresAt }

function getCachedVision(coin, timeframe) {
  const key = `${coin}_${timeframe}`
  const entry = visionCache.get(key)
  if (entry && Date.now() < entry.expiresAt) {
    console.log(`[vision] Cache hit: ${key} (expires in ${Math.round((entry.expiresAt - Date.now()) / 1000)}s)`)
    return entry.result
  }
  return null
}

function setCachedVision(coin, timeframe, result) {
  const key = `${coin}_${timeframe}`
  visionCache.set(key, { result, expiresAt: Date.now() + VISION_CACHE_MS })
}

// ─── Static system prompt (sent once, not billed as user tokens) ─────────────
const VISION_SYSTEM_PROMPT = `You are a professional crypto chart analyst. Analyze charts with extreme precision — only identify patterns you can clearly see. Never invent patterns. If the chart is unclear, say so honestly. Respond with valid JSON only — no markdown, no extra text.

Return ONLY this exact JSON structure (prices as raw numbers, no commas or $ signs):
{
  "primaryPattern": { "name": "pattern name or null", "status": "forming|near_complete|confirmed|null", "quality": 0-10, "direction": "bullish|bearish|neutral|null", "description": "2 sentence description" },
  "trendlines": { "primaryTrend": "uptrend|downtrend|sideways", "trendStrength": "strong|moderate|weak", "supportLines": [{ "price": number, "touches": count, "strength": "strong|medium|weak" }], "resistanceLines": [{ "price": number, "touches": count, "strength": "strong|medium|weak" }] },
  "keyLevels": { "support": [price1, price2, price3], "resistance": [price1, price2, price3] },
  "volumeAnalysis": { "confirmsPattern": true_or_false, "trend": "rising|falling|neutral", "anomaly": "description or null" },
  "candleQuality": { "overall": "decisive|mixed|indecisive", "recentAction": "1-2 sentence description" },
  "patternLevels": { "target": price_or_null, "invalidation": price_or_null, "measuredMove": percentage_or_null },
  "visualBias": { "direction": "bullish|bearish|neutral", "confidence": 0-100, "reasoning": "2 sentence visual-only reasoning" },
  "traderAction": { "action": "buy|sell|wait", "waitingFor": "what trigger they watch for", "reasoning": "1-2 sentences" },
  "chartClarity": "clear|moderate|unclear",
  "confidenceBoost": -20_to_20,
  "visualSummary": "3-4 sentence professional chart read"
}`

// ─── Analyze a single chart image ─────────────────────────────────────────────
export async function analyzeChartWithVision(chartImageBase64, coin, timeframe, currentPrice, indicators) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Anthropic API key missing — vision analysis disabled')
    return null
  }
  if (!chartImageBase64) {
    console.warn('No chart image provided for timeframe:', timeframe)
    return null
  }

  // Check cache before calling API
  const cached = getCachedVision(coin, timeframe)
  if (cached) return cached

  const rsiVal = indicators?.rsi?.value || indicators?.rsi || 'N/A'
  const macdVal = indicators?.macd?.crossover || indicators?.macd || 'N/A'
  const emaVal = indicators?.ema?.trend || indicators?.trend || 'N/A'
  const volVal = indicators?.volume?.spike ? 'spike detected' : 'normal'

  const userContent = [
    {
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: chartImageBase64 }
    },
    {
      type: 'text',
      text: `Analyze this ${coin}/USDT ${timeframe} candlestick chart.
Price: $${currentPrice} | RSI: ${rsiVal} | MACD: ${macdVal} | EMA trend: ${emaVal} | Volume: ${volVal}

Identify: primary chart pattern, trendlines, key S/R levels, volume confirmation, candle quality, pattern target/invalidation, and overall visual bias. Return JSON only.`
    }
  ]

  try {
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: VISION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].text
    const cleaned = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    // Cache the result
    setCachedVision(coin, timeframe, result)
    return result
  } catch (err) {
    console.error(`Vision parse error (${timeframe}):`, err.message)
    return null
  }
}

// ─── Analyze all 3 timeframes (with per-TF caching) ──────────────────────────
export async function analyzeAllTimeframes(chartImages, coin, currentPrice, indicators) {
  try {
    const [dailyVision, h4Vision, hourlyVision] = await Promise.all([
      analyzeChartWithVision(chartImages.daily,  coin, '1D', currentPrice, indicators?.daily || {}),
      analyzeChartWithVision(chartImages.h4,     coin, '4H', currentPrice, indicators?.hourly || {}),
      analyzeChartWithVision(chartImages.hourly, coin, '1H', currentPrice, indicators?.hourly || {}),
    ])

    const biases = [
      dailyVision?.visualBias?.direction,
      h4Vision?.visualBias?.direction,
      hourlyVision?.visualBias?.direction,
    ].filter(Boolean)

    const bullishCount = biases.filter(b => b === 'bullish').length
    const bearishCount = biases.filter(b => b === 'bearish').length

    let dominantBias = 'neutral'
    if (bullishCount > bearishCount && bullishCount > biases.length - bullishCount - bearishCount) dominantBias = 'bullish'
    else if (bearishCount > bullishCount && bearishCount > biases.length - bullishCount - bearishCount) dominantBias = 'bearish'
    else if (bullishCount === bearishCount && bullishCount > 0) dominantBias = dailyVision?.visualBias?.direction || 'neutral'

    const allBullish = bullishCount === 3
    const allBearish = bearishCount === 3
    const mixed = !allBullish && !allBearish

    const patterns = [
      { tf: '1D', data: dailyVision },
      { tf: '4H', data: h4Vision },
      { tf: '1H', data: hourlyVision },
    ].filter(p => p.data?.primaryPattern?.name)

    let strongestPattern = { timeframe: null, pattern: null, confidence: 0 }
    if (patterns.length > 0) {
      const best = patterns.sort((a, b) => (b.data.primaryPattern.quality || 0) - (a.data.primaryPattern.quality || 0))[0]
      strongestPattern = { timeframe: best.tf, pattern: best.data.primaryPattern, confidence: best.data.primaryPattern.quality }
    }

    const combinedTarget = dailyVision?.patternLevels?.target || h4Vision?.patternLevels?.target || hourlyVision?.patternLevels?.target || null

    let combinedInvalidation = null
    const invalidations = [dailyVision, h4Vision, hourlyVision]
      .map(v => v?.patternLevels?.invalidation)
      .filter(x => x !== undefined && x !== null && !isNaN(x))

    if (invalidations.length > 0) {
      if (dominantBias === 'bullish') combinedInvalidation = Math.min(...invalidations)
      else if (dominantBias === 'bearish') combinedInvalidation = Math.max(...invalidations)
      else combinedInvalidation = invalidations[0]
    }

    const rawBoost = (dailyVision?.confidenceBoost || 0) + (h4Vision?.confidenceBoost || 0) + (hourlyVision?.confidenceBoost || 0)
    const totalConfidenceBoost = Math.max(-25, Math.min(25, rawBoost))

    const summaries = [
      dailyVision?.visualSummary,
      h4Vision?.visualSummary,
      hourlyVision?.visualSummary,
    ].filter(Boolean)

    const multiTFSummary = summaries.length > 0
      ? summaries.join(' ')
      : `Professional 3-TF chart read: dominant bias is ${dominantBias.toUpperCase()}.`

    return {
      daily: dailyVision,
      h4: h4Vision,
      hourly: hourlyVision,
      agreement: { allBullish, allBearish, mixed, dominantBias },
      strongestPattern,
      combinedTarget,
      combinedInvalidation,
      totalConfidenceBoost,
      multiTFSummary,
    }
  } catch (err) {
    console.error('analyzeAllTimeframes error:', err)
    return null
  }
}

// ─── Compare vision result with math-detected patterns ───────────────────────
export function compareVisionWithMath(visionResult, mathPatterns, indicators) {
  const visionPattern = visionResult?.daily?.primaryPattern?.name
  const visionDir = visionResult?.daily?.primaryPattern?.direction
  const visionQuality = visionResult?.daily?.primaryPattern?.quality || 0

  const mathPatternName = mathPatterns?.pattern
  const mathDir = mathPatterns?.direction

  let visionConfirmed = false
  let agreementLevel = 'none'
  let finalPattern = null
  let confidenceAdjustment = 0
  const notes = []

  if (visionPattern && mathPatternName) {
    const normalizedVisName = visionPattern.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedMathName = mathPatternName.toLowerCase().replace(/[^a-z0-9]/g, '')

    if (normalizedVisName === normalizedMathName && visionDir === mathDir) {
      visionConfirmed = true
      agreementLevel = 'full'
      confidenceAdjustment = 15
      notes.push('High confidence pattern confirmation')
      finalPattern = {
        pattern: visionPattern, direction: visionDir,
        confidence: Math.min(100, (mathPatterns.confidence || 70) + 15),
        breakoutTarget: visionResult.daily?.patternLevels?.target || mathPatterns.breakoutTarget,
        invalidationLevel: visionResult.daily?.patternLevels?.invalidation || mathPatterns.invalidationLevel,
        quality: visionQuality,
      }
    } else {
      agreementLevel = 'conflict'
      notes.push('Multiple patterns detected')
      const mathQuality = (mathPatterns.confidence || 70) / 10
      if (visionQuality >= mathQuality) {
        finalPattern = {
          pattern: visionPattern, direction: visionDir,
          confidence: Math.min(100, visionQuality * 10),
          breakoutTarget: visionResult.daily?.patternLevels?.target || mathPatterns.breakoutTarget,
          invalidationLevel: visionResult.daily?.patternLevels?.invalidation || mathPatterns.invalidationLevel,
          quality: visionQuality,
        }
      } else {
        finalPattern = {
          pattern: mathPatternName, direction: mathDir,
          confidence: mathPatterns.confidence,
          breakoutTarget: mathPatterns.breakoutTarget,
          invalidationLevel: mathPatterns.invalidationLevel,
        }
      }
    }
  } else if (visionPattern && !mathPatternName) {
    agreementLevel = 'vision_only'
    confidenceAdjustment = 8
    notes.push('Vision only pattern detected')
    finalPattern = {
      pattern: visionPattern, direction: visionDir,
      confidence: Math.min(100, (visionQuality * 10) + 8),
      breakoutTarget: visionResult.daily?.patternLevels?.target,
      invalidationLevel: visionResult.daily?.patternLevels?.invalidation,
      quality: visionQuality,
      visionOnly: true,
    }
  } else if (!visionPattern && mathPatternName) {
    agreementLevel = 'conflict'
    confidenceAdjustment = -10
    notes.push('Pattern not visually confirmed')
    finalPattern = {
      pattern: mathPatternName, direction: mathDir,
      confidence: Math.max(0, (mathPatterns.confidence || 70) - 10),
      breakoutTarget: mathPatterns.breakoutTarget,
      invalidationLevel: mathPatterns.invalidationLevel,
      unconfirmed: true,
    }
  }

  return { visionConfirmed, agreementLevel, finalPattern, confidenceAdjustment, notes }
}
