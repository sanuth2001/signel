import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateStrategyInsights(allSignals) {
  if (!allSignals || allSignals.length === 0) {
    return { totalTrades: 0, winRate: 0, bestSetups: [], worstSetups: [], recommendations: [], marketConditionBreakdown: {}, summary: 'No signal history yet.' }
  }

  try {
    const summary = allSignals.slice(0, 50).map(s => ({
      signal: s.signal, confidence: s.confidence, outcome: s.outcome,
      regime: s.regime, pnl: s.pnlPercent, coin: s.coin,
    }))

    const prompt = `Review this complete signal history of a crypto trading system. Identify strengths, weaknesses, and specific improvements.

${JSON.stringify(summary, null, 2)}

Return ONLY this JSON:
{
  "totalTrades": number,
  "winRate": percentage,
  "bestSetups": [{ "condition": "description", "winRate": percentage, "count": number }],
  "worstSetups": [{ "condition": "description", "winRate": percentage, "count": number }],
  "recommendations": [{ "change": "what to change", "expectedImprovement": "why" }],
  "marketConditionBreakdown": {
    "trending": { "winRate": number, "count": number },
    "ranging": { "winRate": number, "count": number },
    "volatile": { "winRate": number, "count": number }
  },
  "summary": "2-3 sentence overall assessment"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'You are a quantitative trading analyst reviewing signal history to improve system accuracy.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('generateStrategyInsights error:', err.message)
    const wins = allSignals.filter(s => s.outcome === 'win').length
    const total = allSignals.filter(s => s.outcome !== 'pending').length
    return {
      totalTrades: allSignals.length,
      winRate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0,
      bestSetups: [],
      worstSetups: [],
      recommendations: [{ change: 'Collect more data', expectedImprovement: 'Better pattern recognition with 20+ signals' }],
      marketConditionBreakdown: {},
      summary: `${allSignals.length} total signals recorded. ${total > 0 ? `Win rate: ${((wins / total) * 100).toFixed(1)}%` : 'No completed trades yet.'}`,
    }
  }
}

export async function getDailyBrief(recentSignals, currentMarket) {
  try {
    const prompt = `Based on the last ${recentSignals.length} signals and current market data, give a 2-3 sentence daily market brief.

Recent signals: ${JSON.stringify(recentSignals.slice(0, 5).map(s => ({ signal: s.signal, outcome: s.outcome, coin: s.coin, regime: s.regime })))}
Current market: ${JSON.stringify(currentMarket)}

Return a plain English 2-3 sentence market brief. No JSON, just text.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: 'You are a concise crypto market analyst. Give brief, actionable daily market reads.',
      messages: [{ role: 'user', content: prompt }],
    })

    return message.content[0]?.text || 'Market analysis unavailable.'
  } catch (err) {
    console.error('getDailyBrief error:', err.message)
    return 'Daily brief unavailable. Check API key configuration.'
  }
}

if (process.argv[2] === 'test') {
  const mockSignals = [
    { signal: 'BUY', confidence: 82, outcome: 'win', regime: 'trending_up', pnlPercent: 4.2, coin: 'BTC' },
    { signal: 'BUY', confidence: 71, outcome: 'loss', regime: 'ranging', pnlPercent: -3.1, coin: 'ETH' },
    { signal: 'SELL', confidence: 78, outcome: 'win', regime: 'trending_down', pnlPercent: 5.8, coin: 'BTC' },
  ]
  generateStrategyInsights(mockSignals).then(r => console.log(JSON.stringify(r, null, 2)))
}
