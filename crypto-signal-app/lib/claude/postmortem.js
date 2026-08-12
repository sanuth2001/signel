import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzePostMortem(signalRecord, marketDataAtClose) {
  try {
    let visionAnalysis = null
    try {
      if (signalRecord.visionAnalysis) {
        visionAnalysis = JSON.parse(signalRecord.visionAnalysis)
      }
    } catch (e) {
      console.warn('Postmortem parse visionAnalysis error:', e.message)
    }

    const visionSection = visionAnalysis ? `\n## VISION ANALYSIS AT SIGNAL TIME:\n- Daily pattern seen: ${visionAnalysis.daily?.pattern || 'None'}\n- Visual bias: ${visionAnalysis.daily?.bias || 'N/A'}\n- Vision confidence: ${visionAnalysis.daily?.confidence || 0}%\n- Pattern confirmed by both methods: ${visionAnalysis.visionConfirmed || false}\n\nQuestions to analyze:\n- Was the visually detected pattern correct?\n- Did price follow the trader action recommendation?\n- Was the visual bias accurate?\n- Did vision-detected support/resistance levels hold?` : ''

    const prompt = `You are reviewing a failed crypto trade. Be specific, actionable, and honest.

## Original Signal
- Coin: ${signalRecord.coin}
- Signal: ${signalRecord.signal} at $${signalRecord.entryPrice}
- Confidence: ${signalRecord.confidence}%
- Reasoning: ${signalRecord.reasoning}
- Stop Loss: $${signalRecord.stopLoss}, Target: $${signalRecord.target}
- Time Horizon: ${signalRecord.timeHorizon}
- Regime at time: ${signalRecord.regime}

## Indicators at Signal Time
${signalRecord.indicators ? JSON.stringify(JSON.parse(signalRecord.indicators || '{}'), null, 2) : 'Not available'}
${visionSection}

## Outcome
- Close Price: $${marketDataAtClose?.closePrice || signalRecord.closePrice}
- P&L: ${signalRecord.pnlPercent?.toFixed(2) || 'N/A'}%
- Outcome: ${signalRecord.outcome}

What happened vs what the indicators predicted? Return ONLY this JSON:
{
  "mainReason": "one sentence — the primary cause of failure",
  "indicatorsThatFailed": ["RSI", "MACD"],
  "indicatorsThatWereCorrect": ["volume"],
  "marketConditionMismatch": "description of actual market vs expected",
  "howToAvoidNext": "specific filter or condition to add",
  "patternFound": "pattern name if identifiable",
  "confidenceWasTooHigh": true or false,
  "shouldHaveWaited": "description of better entry condition"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: 'You are a trading system analyst specializing in diagnosing why signals fail. Be specific, actionable, and honest.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('analyzePostMortem error:', err.message)
    return {
      mainReason: 'Post-mortem analysis unavailable',
      indicatorsThatFailed: [],
      indicatorsThatWereCorrect: [],
      marketConditionMismatch: 'Unknown',
      howToAvoidNext: 'Review manually',
      patternFound: null,
      confidenceWasTooHigh: false,
      shouldHaveWaited: 'Additional confirmation',
    }
  }
}

export async function analyzePatterns(losingSignals) {
  if (!losingSignals || losingSignals.length === 0) {
    return { patterns: [], topRecommendation: 'Not enough data', estimatedAccuracyImprovement: 0 }
  }

  try {
    const summaries = losingSignals.slice(0, 20).map(s => ({
      signal: s.signal,
      confidence: s.confidence,
      regime: s.regime,
      pnl: s.pnlPercent,
      indicators: s.indicators ? JSON.parse(s.indicators) : null,
    }))

    const prompt = `Review these ${summaries.length} losing trades and find the top 3 patterns causing losses.

${JSON.stringify(summaries, null, 2)}

Return ONLY this JSON:
{
  "patterns": [
    {
      "pattern": "description of what went wrong",
      "frequency": count,
      "fix": "specific filter or rule to add"
    }
  ],
  "topRecommendation": "single most important change to make",
  "estimatedAccuracyImprovement": percentage as number
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: 'You are a quantitative trading analyst identifying systematic weaknesses in a trading signal system.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('analyzePatterns error:', err.message)
    return { patterns: [], topRecommendation: 'Analysis failed', estimatedAccuracyImprovement: 0 }
  }
}

if (process.argv[2] === 'test') {
  const mockSignal = {
    coin: 'BTC', signal: 'BUY', entryPrice: 67000, confidence: 78,
    reasoning: 'RSI oversold, MACD bullish crossover, exchange outflow detected',
    stopLoss: 64000, target: 72000, timeHorizon: '24h', regime: 'ranging',
    outcome: 'loss', closePrice: 63500, pnlPercent: -5.2,
    indicators: JSON.stringify({ daily: { rsi: { value: 28, signal: 'BUY' } } }),
  }
  analyzePostMortem(mockSignal, { closePrice: 63500 }).then(r => console.log(JSON.stringify(r, null, 2)))
}
