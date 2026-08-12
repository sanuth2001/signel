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

// Prompt 30 — Weekly Performance Report
export async function generateWeeklyReport(allSignals) {
  const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000
  const weekSignals = allSignals.filter(s => new Date(s.timestamp).getTime() >= oneWeekAgo)

  if (weekSignals.length === 0) {
    return {
      weeklyGrade: 'N/A',
      summary: { signalsFired: 0, wins: 0, losses: 0, pending: 0, winRate: 0, avgConfidence: 0 },
      bestTrade: null,
      worstTrade: null,
      insights: ['No signals recorded this week. Use the system more to see insights.'],
      recommendations: ['Generate at least 5 signals per week to see meaningful patterns.'],
      motivationalNote: 'Every journey starts with the first step. Start trading!',
      generatedAt: new Date().toISOString(),
    }
  }

  const completed = weekSignals.filter(s => s.outcome && s.outcome !== 'pending')
  const wins = completed.filter(s => s.outcome === 'win')
  const losses = completed.filter(s => s.outcome === 'loss')
  const winRate = completed.length > 0 ? parseFloat(((wins.length / completed.length) * 100).toFixed(1)) : 0
  const avgConfidence = weekSignals.length > 0
    ? parseFloat((weekSignals.reduce((s, x) => s + (x.confidence || 0), 0) / weekSignals.length).toFixed(1))
    : 0

  const summary = {
    signalsFired: weekSignals.length,
    wins: wins.length,
    losses: losses.length,
    pending: weekSignals.length - completed.length,
    winRate,
    avgConfidence,
  }

  const bestTrade = wins.length > 0 ? wins.sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0))[0] : null
  const worstTrade = losses.length > 0 ? losses.sort((a, b) => (a.pnlPercent || 0) - (b.pnlPercent || 0))[0] : null

  try {
    const prompt = `Analyze this week's crypto trading signal performance and generate a report.

Summary: ${JSON.stringify(summary)}
Signals: ${JSON.stringify(weekSignals.slice(0, 20).map(s => ({ signal: s.signal, confidence: s.confidence, outcome: s.outcome, pnlPercent: s.pnlPercent, coin: s.coin, regime: s.regime })))}

Return ONLY this JSON:
{
  "weeklyGrade": "A" or "B" or "C" or "D",
  "insights": ["3-5 specific observations about this week's performance"],
  "recommendations": ["2-3 concrete changes to improve next week"],
  "motivationalNote": "1 sentence encouragement or honest feedback"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: 'You are a quantitative trading performance coach reviewing weekly signal stats.',
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const ai = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return {
      weeklyGrade: ai.weeklyGrade || (winRate >= 60 ? 'B' : 'C'),
      summary,
      bestTrade,
      worstTrade,
      insights: ai.insights || [],
      recommendations: ai.recommendations || [],
      motivationalNote: ai.motivationalNote || '',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('generateWeeklyReport error:', err.message)
    return {
      weeklyGrade: winRate >= 70 ? 'A' : winRate >= 55 ? 'B' : winRate >= 40 ? 'C' : 'D',
      summary,
      bestTrade,
      worstTrade,
      insights: [`Win rate: ${winRate}%`, `Avg confidence: ${avgConfidence}%`, completed.length === 0 ? 'No completed trades yet' : `${wins.length}W / ${losses.length}L`],
      recommendations: ['Continue using the system daily for pattern insights'],
      motivationalNote: winRate >= 55 ? 'Great week! Keep it up.' : 'Every loss is a learning opportunity.',
      generatedAt: new Date().toISOString(),
    }
  }
}

