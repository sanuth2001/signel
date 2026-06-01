import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildPrompt(data) {
  const { coin, currentPrice, indicators, onchainData, orderBook, confluence, pattern, liquidations, sentiment, regime } = data
  const d = indicators?.daily || {}
  const h = indicators?.hourly || {}

  return `You are analyzing ${coin} at $${currentPrice?.toLocaleString()}.

## TECHNICAL ANALYSIS

### Daily Timeframe
- RSI: ${d.rsi?.value} (${d.rsi?.zone}) — Signal: ${d.rsi?.signal}
- MACD: ${d.macd?.crossover} crossover, histogram ${d.macd?.histogram} — Signal: ${d.macd?.signalDir}
- Bollinger Bands: Price at ${d.bb?.position} band, width ${d.bb?.width}%, squeeze: ${d.bb?.squeeze} — Signal: ${d.bb?.signal}
- EMA20: $${d.ema?.ema20}, EMA50: $${d.ema?.ema50}, EMA200: $${d.ema?.ema200} (${d.ema?.trend}) — Signal: ${d.ema?.signal}
- Volume: ${d.volume?.ratio}x average, spike: ${d.volume?.spike} — Signal: ${d.volume?.signal}

### Hourly Timeframe
- RSI: ${h.rsi?.value} (${h.rsi?.zone}) — Signal: ${h.rsi?.signal}
- MACD: ${h.macd?.crossover} crossover — Signal: ${h.macd?.signalDir}
- Bollinger Bands: Price at ${h.bb?.position} band — Signal: ${h.bb?.signal}
- EMA trend: ${h.ema?.trend} — Signal: ${h.ema?.signal}

## ON-CHAIN METRICS
- Fear & Greed: ${onchainData?.fearGreed?.value} (${onchainData?.fearGreed?.label}) — ${onchainData?.fearGreed?.signal}
- Funding Rate: ${onchainData?.funding?.rate} — ${onchainData?.funding?.signal}
- Exchange Flow: ${onchainData?.exchangeFlow?.direction}, net ${onchainData?.exchangeFlow?.netFlow} BTC — ${onchainData?.exchangeFlow?.signal}
- Whale Transactions: ${onchainData?.whaleTransactions?.count} large txns — ${onchainData?.whaleTransactions?.signal}
- Stablecoin Flow: ${onchainData?.stablecoinFlow?.signal} — ${onchainData?.stablecoinFlow?.description}
- Overall On-chain: ${onchainData?.overallOnchainSignal} (score: ${onchainData?.onchainScore}/4)

## ORDER BOOK
- Buy Wall: $${orderBook?.buyWall?.price} (${orderBook?.buyWall?.size}M, ${orderBook?.buyWall?.strength})
- Sell Wall: $${orderBook?.sellWall?.price} (${orderBook?.sellWall?.size}M, ${orderBook?.sellWall?.strength})
- Bid/Ask Ratio: ${orderBook?.bidAskRatio} — ${orderBook?.signal}

## CONFLUENCE
- Weighted Score: ${confluence?.weightedScore}
- Direction: ${confluence?.direction}, Agreement: ${confluence?.agreement}
- Daily: ${confluence?.d1Direction} (${confluence?.d1Score}), Hourly: ${confluence?.h1Direction} (${confluence?.h1Score})
- Confidence: ${confluence?.confidence}%

## CHART PATTERN
${pattern ? `- ${pattern.pattern} (${pattern.direction}, ${pattern.confidence}% confidence)
- Target: $${pattern.breakoutTarget}, Invalidation: $${pattern.invalidationLevel}
- ${pattern.description}` : '- No clear pattern detected'}

## LIQUIDATION LEVELS
- Nearest Long Liquidations: $${liquidations?.nearestLongLiq}
- Nearest Short Liquidations: $${liquidations?.nearestShortLiq}
- ${liquidations?.description}

## MACRO & SENTIMENT
- Regime: ${regime?.regime}
- DXY: ${sentiment?.macro?.dxyTrend}, Gold: ${sentiment?.macro?.goldTrend}, S&P500: ${sentiment?.macro?.sp500Trend}
- Macro Signal: ${sentiment?.macro?.macroSignal}
- Options Put/Call Ratio: ${sentiment?.options?.putCallRatio}, Max Pain: $${sentiment?.options?.maxPain}

## FUTURES DATA (BINANCE)
- Open Interest: $${sentiment?.futures?.openInterestValue?.toLocaleString()} (${sentiment?.futures?.openInterestChange >= 0 ? '+' : ''}${sentiment?.futures?.openInterestChange?.toFixed(2)}% over 5m)
- Long/Short Account Ratio: ${sentiment?.futures?.longShortRatio} (${(sentiment?.futures?.longAccount * 100).toFixed(0)}% Longs vs ${(sentiment?.futures?.shortAccount * 100).toFixed(0)}% Shorts)
- Taker Buy/Sell Volume Ratio: ${sentiment?.futures?.takerLongShortRatio}
- Futures Signal: ${sentiment?.futures?.signal}
- Description: ${sentiment?.futures?.description}

Return ONLY this JSON object, nothing else:
{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": 0 to 100,
  "reasoning": "max 3 sentences plain English",
  "risk": "low" or "medium" or "high",
  "stopLoss": price number,
  "target": price number,
  "riskRewardRatio": number,
  "timeHorizon": "4h" or "24h" or "72h",
  "keyRisk": "biggest risk to this trade in one sentence",
  "droughtReason": null or "string explaining why no signal"
}`
}

export async function analyzeSignal(analysisData) {
  try {
    const prompt = buildPrompt(analysisData)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: 'You are a professional crypto trading signal analyst with expertise in technical analysis, on-chain analytics, and market microstructure. You analyze all provided data and return only a JSON signal with no additional text.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    const parsed = JSON.parse(jsonMatch[0])

    // Confidence filter
    if ((parsed.confidence || 0) < 70) {
      parsed.signal = 'HOLD'
      parsed.droughtReason = parsed.droughtReason || `Confidence ${parsed.confidence}% below threshold of 70%`
    }

    return parsed
  } catch (err) {
    console.error('analyzeSignal error:', err.message)
    return {
      signal: 'HOLD',
      confidence: 0,
      reasoning: 'Signal analysis failed. Using hold as safe default.',
      risk: 'high',
      stopLoss: analysisData.currentPrice * 0.95,
      target: analysisData.currentPrice * 1.05,
      riskRewardRatio: 1,
      timeHorizon: '24h',
      keyRisk: 'API error — do not trade on this signal',
      droughtReason: `Analysis error: ${err.message}`,
    }
  }
}

export function formatSignalForDisplay(rawSignal, meta) {
  const { coin, priceData, regime, confluence } = meta || {}
  return {
    ...rawSignal,
    coin: coin || 'BTC',
    timestamp: new Date().toISOString(),
    entryPrice: priceData?.currentPrice,
    regime: regime?.regime || 'unknown',
    confluenceScore: confluence?.weightedScore || 0,
    agreement: confluence?.agreement || 'none',
  }
}

if (process.argv[2] === 'test') {
  const mockData = {
    coin: 'BTC', currentPrice: 67000,
    indicators: { daily: { rsi: { value: 35, zone: 'oversold', signal: 'BUY' }, macd: { crossover: 'bullish', histogram: 120, signalDir: 'BUY' }, bb: { position: 'lower', signal: 'BUY', width: 4.2, squeeze: false }, ema: { ema20: 67200, ema50: 66800, ema200: 63400, trend: 'uptrend', signal: 'BUY', goldenCross: false, deathCross: false }, volume: { ratio: 1.8, spike: true, signal: 'BUY' } }, hourly: { rsi: { value: 32, zone: 'oversold', signal: 'BUY' }, macd: { crossover: 'none', signalDir: 'NEUTRAL' }, bb: { position: 'lower', signal: 'BUY' }, ema: { trend: 'uptrend', signal: 'BUY' } } },
    onchainData: { fearGreed: { value: 22, label: 'Extreme Fear', signal: 'BUY' }, funding: { rate: -0.0001, signal: 'BUY' }, exchangeFlow: { direction: 'outflow', netFlow: -12400, signal: 'BUY' }, whaleTransactions: { count: 847, signal: 'BUY' }, stablecoinFlow: { signal: 'bullish', description: 'Large USDT moving to exchange' }, overallOnchainSignal: 'BUY', onchainScore: 4 },
    orderBook: { buyWall: { price: 65800, size: 450, strength: 'strong' }, sellWall: { price: 68400, size: 280, strength: 'medium' }, bidAskRatio: 1.6, signal: 'BUY', description: 'Large buy wall at 65800' },
    confluence: { weightedScore: 80, direction: 'BUY', agreement: 'full', confidence: 80, d1Direction: 'BUY', d1Score: 85, h1Direction: 'BUY', h1Score: 75 },
    pattern: { pattern: 'Bull Flag', direction: 'bullish', confidence: 72, breakoutTarget: 71200, invalidationLevel: 65200 },
    liquidations: { nearestLongLiq: 71200, nearestShortLiq: 64800, description: 'Massive short liquidations at 64800' },
    sentiment: { macro: { dxyTrend: 'falling', goldTrend: 'rising', sp500Trend: 'neutral', macroSignal: 'BUY' }, options: { putCallRatio: 0.8, maxPain: 67000 }, futures: { symbol: 'BTCUSDT', longShortRatio: 1.2, longAccount: 0.55, shortAccount: 0.45, openInterestValue: 7.5e9, openInterestAmount: 110000, openInterestChange: 0.5, takerLongShortRatio: 1.02, signal: 'BUY', description: 'Long/Short Ratio: 1.2. Taker Buy/Sell: 1.02. Open Interest: $7.50B (+0.50% over 5m).' } },
    regime: { regime: 'trending_up' },
  }
  analyzeSignal(mockData).then(sig => console.log(JSON.stringify(sig, null, 2)))
}
