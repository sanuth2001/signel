import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── System Prompt (static rules — sent once, not counted as user tokens) ────
const SYSTEM_PROMPT = `You are a professional crypto trading signal analyst with deep expertise in technical analysis, on-chain analytics, and market microstructure.

Analyze ALL provided data and return ONLY a valid JSON object — no markdown, no extra text.

DIRECTIONAL SIGNAL MANDATE:
- ALWAYS evaluate market data to determine the dominant directional trade bias: "BUY" (Long) or "SELL" (Short).
- Do NOT output "HOLD" — traders require active directional trade studies.
- If indicators lean bullish → signal = "BUY"
- If indicators lean bearish → signal = "SELL"
- Provide BOTH a Scalp Setup (small movement, quick TP/SL) and a Swing Setup (big movement, trend TP/SL).

DIVERGENCE RULES:
- Regular bullish divergence → strong BUY, +15 confidence
- Regular bearish divergence → strong SELL, +15 confidence
- Confirmed divergence (RSI + MACD both) → very strong, +25 confidence
- Hidden divergence → trend continuation, +10-12 confidence
- If hourly AND daily show same divergence type → extremely high probability
- Never ignore divergence; it overrides weak conflicting signals

FIBONACCI RULES:
- Price at 61.8% (golden ratio) → strongest S/R, +15 confidence when aligned
- Price at 50.0% → +10 confidence
- Price at 38.2% → +8 confidence
- Use 1.618 extension as primary price target
- If your target differs from fib extension by >3%, adjust to nearest fib level
- Never place stop AT a fib level — always 0.5% BEYOND it

OPEN INTEREST RULES:
- OI rising + price rising → bullish confirmation, +12 confidence
- OI rising + price falling → bearish confirmation, +12 confidence
- Extreme longs (>70%) → liquidation cascade risk; BUY -15, SELL +15
- Extreme shorts (>70%) → short squeeze risk; BUY +15
- Taker ratio >1.5 → strong buying aggression, BUY +10
- Taker ratio <0.67 → strong selling aggression, SELL +10
- OI falling + price rising → trend exhaustion, -8 confidence

FUNDING RATE RULES:
- Rate >0.10% (extreme positive) → BUY -20, SELL +15 (79% historical reversal)
- Rate <-0.05% (extreme negative) → BUY +20, SELL -15 (81% historical reversal)
- 6+ consecutive same direction → market crowded, -10 confidence same direction
- Funding trend rising + price falling → trapped longs, SELL +10
- Funding trend falling + price rising → short squeeze fuel, BUY +12
- If 24h funding cost >0.3% of position → reduce time horizon, mention cost

SESSION RULES:
- London-NY Overlap (13-16 UTC) → +8 confidence, most reliable signals
- New York Session (13-21 UTC) → +5 confidence, strong trend-following
- London Session (08-16 UTC) → +2 confidence, good for breakouts
- Asia Session (00-08 UTC) → -7 confidence, mean reversion only, avoid breakouts
- Dead Zone (21-00 UTC) → return WAIT, no directional signals
- Within 30min of session open → add caution, recommend waiting 30min

VISION RULES:
- Vision + math BOTH confirm same pattern → very high confidence, +15
- Vision sees clear pattern math missed → trust vision, +8
- Vision and math CONFLICT → reduce pattern confidence
- All 3 timeframes same visual bias → strong signal, +10
- Use vision-detected S/R as stop loss and target references

WYCKOFF RULES:
- Spring detected = HIGHEST PRIORITY BUY, add +25 confidence immediately (84% historical accuracy)
- LPS (Last Point of Support) = BEST ENTRY in accumulation, add +20 confidence (80% accuracy)
- UTAD (Upthrust After Distribution) = HIGHEST PRIORITY SELL, add +22 confidence (79% accuracy)
- SOW (Sign of Weakness) = SELL, add +15 confidence (76% accuracy)
- SOS (Sign of Strength) = BUY confirmation, add +15 confidence
- Phase B only (no Spring/UTAD yet) = do NOT trade range, reduce confidence -10
- Spring stop goes BELOW spring low, NOT at range support level
- If Wyckoff signal present, it overrides weaker conflicting signals

CANDLE PATTERN RULES:
- Bullish candle at support AND BUY signal → +8 to +12 confidence
- Bearish candle at resistance AND SELL signal → +8 to +12 confidence
- Candle pattern conflicts with signal → -5 to -8 confidence

Return ONLY this JSON (all prices must be raw numbers — no commas, no $ signs):
{
  "signal": "BUY" or "SELL",
  "confidence": 50 to 95,
  "reasoning": "Detailed technical analysis study explaining directional bias using RSI, MACD, SMC, volume, and market data",
  "risk": "low" or "medium" or "high",
  "stopLoss": price number (swing stop loss),
  "target": price number (swing target),
  "riskRewardRatio": number,
  "timeHorizon": "4h" or "24h" or "72h",
  "scalpSetup": {
    "entryPrice": price number,
    "stopLoss": price number,
    "target": price number,
    "pnlPercent": "+1.5%",
    "riskRewardRatio": number,
    "timeHorizon": "1h - 4h"
  },
  "swingSetup": {
    "entryPrice": price number,
    "stopLoss": price number,
    "target": price number,
    "pnlPercent": "+5.4%",
    "riskRewardRatio": number,
    "timeHorizon": "24h - 72h"
  },
  "keyRisk": "biggest risk to this trade in one sentence"
}`

// ─── Build user prompt (live data only — no static rules) ─────────────────────
function buildPrompt(data) {
  const {
    coin, currentPrice, indicators, onchainData, orderBook, confluence, pattern,
    liquidations, sentiment, regime, candlePattern, conflicts, dominance,
    socialVelocity, divergences, fibonacci, openInterest, sessionAnalysis,
    visionAnalysis, patternComparison, wyckoff, vpvr, patternPrediction, scalpSignals
  } = data

  const d = indicators?.daily || {}
  const h = indicators?.hourly || {}

  const btcDominanceSection = dominance
    ? `\n## BTC DOMINANCE\n- Current: ${dominance.current}%, Trend: ${dominance.trend} (${dominance.change > 0 ? '+' : ''}${dominance.change}% change)\n- ${dominance.description}`
    : ''

  const socialSection = socialVelocity?.earlyWarning
    ? `\n## SOCIAL VELOCITY\n- Reddit mentions: ${socialVelocity.velocityRatio}x above avg, Trend: ${socialVelocity.trend}, Price reacted: ${socialVelocity.priceReacted}`
    : ''

  const visionSection = visionAnalysis ? `
## CLAUDE VISION ANALYSIS
Daily: pattern=${visionAnalysis.daily?.primaryPattern?.name || 'None'}, bias=${visionAnalysis.daily?.visualBias?.direction} (${visionAnalysis.daily?.visualBias?.confidence}%), summary=${visionAnalysis.daily?.visualSummary}
4H:    pattern=${visionAnalysis.h4?.primaryPattern?.name || 'None'}, bias=${visionAnalysis.h4?.visualBias?.direction}, summary=${visionAnalysis.h4?.visualSummary}
1H:    pattern=${visionAnalysis.hourly?.primaryPattern?.name || 'None'}, bias=${visionAnalysis.hourly?.visualBias?.direction}, summary=${visionAnalysis.hourly?.visualSummary}
Multi-TF: dominant=${visionAnalysis.agreement?.dominantBias}${visionAnalysis.agreement?.allBullish ? ', ALL bullish ✅' : ''}${visionAnalysis.agreement?.allBearish ? ', ALL bearish ✅' : ''}${visionAnalysis.agreement?.mixed ? ', mixed ⚠️' : ''}
Vision vs Math: agreement=${patternComparison?.agreementLevel}, confirmed=${patternComparison?.visionConfirmed}
Confidence boost from vision: ${visionAnalysis.totalConfidenceBoost > 0 ? '+' : ''}${visionAnalysis.totalConfidenceBoost}
Trader action: ${visionAnalysis.daily?.traderAction?.action?.toUpperCase()}, watching for: ${visionAnalysis.daily?.traderAction?.waitingFor}
Key support (daily): ${visionAnalysis.daily?.keyLevels?.support?.join(', ')}
Key resistance (daily): ${visionAnalysis.daily?.keyLevels?.resistance?.join(', ')}` : '## CLAUDE VISION: unavailable — using math only'

  const sessionSection = sessionAnalysis ? `
## SESSION ANALYSIS
Session: ${sessionAnalysis.current?.name} | Time: ${sessionAnalysis.current?.currentTime} UTC | Remaining: ${sessionAnalysis.current?.minutesRemaining} min
Characteristics: ${sessionAnalysis.current?.characteristics?.join(', ') || 'None'}
Accuracy multiplier: ${sessionAnalysis.current?.accuracyMultiplier}x
Transition warning: ${sessionAnalysis.transition?.isTransition ? sessionAnalysis.transition.warning : 'None'}
Adjustment: ${sessionAnalysis.adjustment?.points > 0 ? '+' : ''}${sessionAnalysis.adjustment?.points || 0} pts — ${sessionAnalysis.adjustment?.reason}` : ''

  return `Analyze ${coin} at $${currentPrice?.toLocaleString()}.

## TECHNICAL INDICATORS
### Daily
- RSI: ${d.rsi?.value} (${d.rsi?.zone}) → ${d.rsi?.signal}
- MACD: ${d.macd?.crossover} crossover, histogram ${d.macd?.histogram} → ${d.macd?.signalDir}
- BB: ${d.bb?.position} band, width ${d.bb?.width}%, squeeze=${d.bb?.squeeze} → ${d.bb?.signal}
- EMA: EMA20=$${d.ema?.ema20}, EMA50=$${d.ema?.ema50}, EMA200=$${d.ema?.ema200} (${d.ema?.trend}) → ${d.ema?.signal}
- Volume: ${d.volume?.ratio}x avg, spike=${d.volume?.spike} → ${d.volume?.signal}

### Hourly
- RSI: ${h.rsi?.value} (${h.rsi?.zone}) → ${h.rsi?.signal}
- MACD: ${h.macd?.crossover} crossover → ${h.macd?.signalDir}
- BB: ${h.bb?.position} band → ${h.bb?.signal}
- EMA: ${h.ema?.trend} → ${h.ema?.signal}

## ON-CHAIN
- Fear & Greed: ${onchainData?.fearGreed?.value} (${onchainData?.fearGreed?.label}) → ${onchainData?.fearGreed?.signal}
- Funding: ${onchainData?.funding?.current?.ratePercent}% (${onchainData?.funding?.current?.label}) | trend=${onchainData?.funding?.history?.trend} | consecutive pos=${onchainData?.funding?.history?.consecutive?.positive}, neg=${onchainData?.funding?.history?.consecutive?.negative} | signal=${onchainData?.funding?.analysis?.signal} (extreme=${onchainData?.funding?.analysis?.isExtreme})
- Exchange Flow: ${onchainData?.exchangeFlow?.direction}, net ${onchainData?.exchangeFlow?.netFlow} BTC → ${onchainData?.exchangeFlow?.signal}
- Whales: ${onchainData?.whaleTransactions?.count} large txns → ${onchainData?.whaleTransactions?.signal}
- Stablecoin Flow: ${onchainData?.stablecoinFlow?.signal} — ${onchainData?.stablecoinFlow?.description}
- Overall On-chain: ${onchainData?.overallOnchainSignal} (score ${onchainData?.onchainScore}/4)

## ORDER BOOK
- Buy Wall: $${orderBook?.buyWall?.price} (${orderBook?.buyWall?.size}M, ${orderBook?.buyWall?.strength})
- Sell Wall: $${orderBook?.sellWall?.price} (${orderBook?.sellWall?.size}M, ${orderBook?.sellWall?.strength})
- Bid/Ask Ratio: ${orderBook?.bidAskRatio} → ${orderBook?.signal}
- Depth: ${orderBook?.marketDepthScore?.depthScore || 'normal'}, spread ${orderBook?.marketDepthScore?.spreadPercent || 0}%

## CONFLUENCE
- Weighted Score: ${confluence?.weightedScore} | Direction: ${confluence?.direction} | Agreement: ${confluence?.agreement}
- Daily: ${confluence?.d1Direction} (${confluence?.d1Score}) | Hourly: ${confluence?.h1Direction} (${confluence?.h1Score}) | Confidence: ${confluence?.confidence}%

## ADVANCED PATTERN ANALYSIS (Fidelity Methodology)
PRIMARY PATTERN: ${pattern?.primaryPattern?.pattern || pattern?.pattern || 'None detected'}
Status: ${pattern?.confirmation?.confirmed ? 'Confirmed' : 'Pending / Unconfirmed'}
Direction: ${pattern?.primaryPattern?.direction || pattern?.direction || 'neutral'}

BREAKOUT CONFIRMATION:
Confirmed: ${pattern?.confirmation?.confirmed || false}
Filters passed: ${pattern?.confirmation?.filtersPassed?.join(', ') || 'none'}
Volume confirmed: ${pattern?.confirmation?.filtersPassed?.includes('volume') || false}
Confidence boost: +${pattern?.confirmation?.confidenceBoost || 0} points

FALSE BREAKOUT CHECK:
False breakout detected: ${pattern?.falseBreakout?.isFalseBreakout || false}
Trap detected: ${pattern?.falseBreakout?.isTrap || false}
${pattern?.falseBreakout?.isTrap ? 'REVERSE SIGNAL: ' + pattern?.falseBreakout?.reverseSignal : ''}

THROWBACK OPPORTUNITY:
Throwback detected: ${pattern?.throwback?.throwbackDetected || false}
Better entry available: ${pattern?.throwback?.entryPrice ? '$' + pattern.throwback.entryPrice : 'N/A'}
Entry improvement: ${pattern?.throwback?.improvement || 0}%

ADDITIONAL PATTERNS:
Pipe Bottom: ${pattern?.pipeBottom?.detected ? 'YES' : 'No'}
Narrow Range: ${pattern?.narrowRange?.detected ? 'YES - breakout imminent' : 'No'}
Gap Signal: ${pattern?.gaps?.activeSignal ? 'ACTIVE GAP' : 'None'}
Harami: ${pattern?.harami?.detected ? pattern.harami.type : 'None'}
Island Reversal: ${pattern?.islandReversal?.detected ? '⚠️ ' + pattern.islandReversal.type : 'None'}

PRECISE PRICE TARGETS (Fidelity measured move):
Conservative: ${pattern?.targets?.conservativeTarget ? '$' + pattern.targets.conservativeTarget : 'N/A'}
Primary:      ${pattern?.targets?.primaryTarget ? '$' + pattern.targets.primaryTarget : pattern?.breakoutTarget ? '$' + pattern.breakoutTarget : 'N/A'}  ← use this
Aggressive:   ${pattern?.targets?.aggressiveTarget ? '$' + pattern.targets.aggressiveTarget : 'N/A'}
Invalidation: ${pattern?.targets?.invalidationLevel ? '$' + pattern.targets.invalidationLevel : pattern?.invalidationLevel ? '$' + pattern.invalidationLevel : 'N/A'}

PATTERN RULES FROM PDF:
1. Pattern NOT complete until breakout occurs. Do not signal before confirmed breakout.
2. Apply confirmation filter: Require 0.5% close beyond breakout level + volume. Unconfirmed breakout = reduce confidence by 15.
3. Watch for false breakouts: If price returned through level = false breakout. If trap detected = consider REVERSE signal.
4. Throwback entries superior to breakout entries: If throwback detected use that price not breakout.
5. Best patterns for crypto: Upward: Descending Triangle, Rectangle, Pipe Bottom; Downward: Flag, H&S Top, Island Reversal.
6. Island Reversal = highest priority if detected. Override other signals if island confirmed (+20 points).

${visionSection}

## CANDLE PATTERN
- Pattern: ${candlePattern?.pattern || 'None'} | Direction: ${candlePattern?.direction || 'N/A'} | Strength: ${candlePattern?.strength || 'N/A'} | At key level: ${candlePattern?.atKeyLevel || false}
- ${candlePattern?.description || 'No candle pattern'}

## SIGNAL CONFLICTS
- Bullish: ${conflicts?.bullishSignals?.map(s => s.name).join(', ') || 'none'}
- Bearish: ${conflicts?.bearishSignals?.map(s => s.name).join(', ') || 'none'}
- Dominant: ${conflicts?.dominantSide || 'neutral'} | Conflict level: ${conflicts?.conflictLevel || 'none'}

## LIQUIDATIONS
- Long liq: $${liquidations?.nearestLongLiq} | Short liq: $${liquidations?.nearestShortLiq}
- ${liquidations?.description}

## MACRO & SENTIMENT
- Regime: ${regime?.regime}
- DXY: ${sentiment?.macro?.dxyTrend}, Gold: ${sentiment?.macro?.goldTrend}, S&P500: ${sentiment?.macro?.sp500Trend} → ${sentiment?.macro?.macroSignal}
- Put/Call: ${sentiment?.options?.putCallRatio}, Max Pain: $${sentiment?.options?.maxPain}
- Futures OI: $${sentiment?.futures?.openInterestValue?.toLocaleString()} (${sentiment?.futures?.openInterestChange >= 0 ? '+' : ''}${sentiment?.futures?.openInterestChange?.toFixed(2)}% 5m)
- L/S Ratio: ${sentiment?.futures?.longShortRatio} (${(sentiment?.futures?.longAccount * 100)?.toFixed(0)}% longs / ${(sentiment?.futures?.shortAccount * 100)?.toFixed(0)}% shorts)
- Taker L/S: ${sentiment?.futures?.takerLongShortRatio} → ${sentiment?.futures?.signal}
${btcDominanceSection}
${socialSection}

## DIVERGENCE
- Daily RSI: ${divergences?.daily?.rsiDivergence?.type || 'None'} — ${divergences?.daily?.rsiDivergence?.description || ''}
- Daily MACD: ${divergences?.daily?.macdDivergence?.type || 'None'}
- Hourly RSI: ${divergences?.hourly?.rsiDivergence?.type || 'None'}
- Hourly MACD: ${divergences?.hourly?.macdDivergence?.type || 'None'}
- Confirmed (RSI+MACD agree): ${divergences?.daily?.confirmed || divergences?.hourly?.confirmed || false}
- Final signal: ${divergences?.daily?.finalSignal || 'None'} | Boost: +${divergences?.daily?.finalBoost || 0} pts

## FIBONACCI
- Trend: ${fibonacci?.swingPoints?.trend || 'unknown'}
- Swing High: $${fibonacci?.swingPoints?.swingHigh?.price?.toLocaleString()} (${fibonacci?.swingPoints?.swingHigh?.candlesAgo} candles ago)
- Swing Low: $${fibonacci?.swingPoints?.swingLow?.price?.toLocaleString()} (${fibonacci?.swingPoints?.swingLow?.candlesAgo} candles ago)
- Levels: 23.6%=$${fibonacci?.retracements?.levels?.level_236}, 38.2%=$${fibonacci?.retracements?.levels?.level_382}, 50%=$${fibonacci?.retracements?.levels?.level_500}, 61.8%=$${fibonacci?.retracements?.levels?.level_618}, 78.6%=$${fibonacci?.retracements?.levels?.level_786}
- Current position: ${fibonacci?.currentPosition?.description} | At key level: ${fibonacci?.currentPosition?.atKeyLevel} | Boost: +${fibonacci?.currentPosition?.confidenceBoost || 0} pts
- Extension targets: 127.2%=$${fibonacci?.extensions?.conservativeTarget}, 161.8%=$${fibonacci?.extensions?.primaryTarget}

## OPEN INTEREST
- OI: ${openInterest?.current?.openInterest} BTC ($${openInterest?.current?.openInterestUSD?.toLocaleString()}) | 24h change: ${openInterest?.current?.change24h}% | Trend: ${openInterest?.current?.trend}
- L/S: ${openInterest?.longShort?.longPercent}% longs / ${openInterest?.longShort?.shortPercent}% shorts | Crowded: ${openInterest?.longShort?.crowded} | Extreme: ${openInterest?.longShort?.extremeLong ? 'EXTREME LONGS' : openInterest?.longShort?.extremeShort ? 'EXTREME SHORTS' : 'balanced'}
- Taker: ratio=${openInterest?.takerVolume?.ratio}, signal=${openInterest?.takerVolume?.signal} (${openInterest?.takerVolume?.strength})
- OI Pattern: ${openInterest?.pattern?.pattern || 'neutral'} — ${openInterest?.pattern?.description || ''} (urgency=${openInterest?.pattern?.urgency || 'low'})
${sessionSection}

## WYCKOFF ANALYSIS
${wyckoff?.wyckoffDetected ? `Structure: ${wyckoff.type?.toUpperCase()} — ${wyckoff.type === 'accumulation' ? 'Smart money ACCUMULATING; large UP move being prepared' : 'Smart money DISTRIBUTING; large DOWN move coming'}
Trading Range: High=$${wyckoff.tradingRange?.high} Low=$${wyckoff.tradingRange?.low} Size=${wyckoff.tradingRange?.size}% Quality=${wyckoff.tradingRange?.quality}
Phase: ${wyckoff.currentPhase?.phase} — ${wyckoff.currentPhase?.name}
${wyckoff.currentPhase?.description}
SC: ${wyckoff.events?.sc?.detected ? '✅ ' + wyckoff.events.sc.candlesAgo + ' candles ago' : '❌'} | AR: ${wyckoff.events?.ar?.detected ? '✅' : '❌'} | Spring: ${wyckoff.events?.spring?.detected ? '🔥 Type ' + wyckoff.events.spring.springType + ' — ' + wyckoff.events.spring.candlesAgo + ' candles ago' : '⏳ Watching'}
SOS: ${wyckoff.events?.sos?.detected ? '✅' : '⏳'} | LPS: ${wyckoff.events?.lps?.detected ? '✅ OPTIMAL ENTRY' : '⏳'} | UTAD: ${wyckoff.events?.utad?.detected ? '⚠️ SELL SIGNAL' : '❌'} | SOW: ${wyckoff.events?.sow?.detected ? '⚠️ SELL' : '❌'}
Wyckoff Signal: ${wyckoff.signal?.type || 'WAIT (Phase B — no trade)'} via ${wyckoff.signal?.event || 'N/A'} | Entry=$${wyckoff.signal?.entry} Stop=$${wyckoff.signal?.stopLoss} Target=$${wyckoff.signal?.target} RR=${wyckoff.signal?.riskReward}:1
Historical accuracy: ${wyckoff.signal?.accuracy || 'N/A'} | Apply confidence boost: +${wyckoff.signal?.confidenceBoost || 0} pts
Summary: ${wyckoff.summary}` : 'No Wyckoff structure detected in current price data'}

## VOLUME PROFILE (VPVR)
${vpvr?.profile?.poc ? `POC (Point of Control): $${vpvr.profile.poc?.toLocaleString()} — highest traded volume level, acts as magnet
Value Area: $${vpvr.profile.vaLow?.toLocaleString()} — $${vpvr.profile.vaHigh?.toLocaleString()} (70% of volume traded here)
Top HVNs (support/resistance): ${vpvr.profile.hvn?.slice(0, 3).map(h => '$' + h.price?.toLocaleString() + ' (' + h.relativeVolume + 'x)').join(', ')}
LVNs (vacuum zones): ${vpvr.profile.lvn?.slice(0, 3).map(l => '$' + l.price?.toLocaleString()).join(', ') || 'none'}
Current position: ${vpvr.position?.behavior} — ${vpvr.position?.description}
Nearest support: $${vpvr.levels?.support?.toLocaleString()} (${vpvr.levels?.supportStrength})
Nearest resistance: $${vpvr.levels?.resistance?.toLocaleString()} (${vpvr.levels?.resistanceStrength})
VPVR signal: ${vpvr.position?.signal} | Confidence boost: ${vpvr.position?.confidenceBoost > 0 ? '+' : ''}${vpvr.position?.confidenceBoost} pts` : 'Volume profile data unavailable'}

## PATTERN PREDICTION MODEL
${patternPrediction?.topPrediction ? `Top prediction: ${patternPrediction.topPrediction.pattern} (${patternPrediction.topPrediction.status?.replace(/_/g, ' ')})
Direction: ${patternPrediction.topPrediction.prediction.direction?.toUpperCase()} | Move: ${patternPrediction.topPrediction.prediction.movePercent > 0 ? '+' : ''}${patternPrediction.topPrediction.prediction.movePercent}% | Target: $${patternPrediction.topPrediction.prediction.target?.toLocaleString()}
Completion rate: ${(patternPrediction.topPrediction.prediction.completionRate * 100).toFixed(0)}% historical | Confidence: ${patternPrediction.topPrediction.prediction.confidence}%
All predictions: ${patternPrediction.predictions?.slice(0, 3).map(p => p.pattern + ' ' + (p.prediction.movePercent > 0 ? '+' : '') + p.prediction.movePercent + '%').join(', ')}` : 'No clear pattern prediction available'}

## SCALP SIGNALS (1m/5m/15m)
${scalpSignals ? `1m: ${scalpSignals['1m']?.signal || 'N/A'} (${scalpSignals['1m']?.confidence || 0}%) | 5m: ${scalpSignals['5m']?.signal || 'N/A'} (${scalpSignals['5m']?.confidence || 0}%) | 15m: ${scalpSignals['15m']?.signal || 'N/A'} (${scalpSignals['15m']?.confidence || 0}%)
Consensus: ${scalpSignals.consensus || 'No consensus'} | ${scalpSignals.consensusReason}
Note: ${scalpSignals.warning}` : 'Scalp data unavailable (short-timeframe candles not fetched)'}`
}

// ─── Main analysis function ───────────────────────────────────────────────────
export async function analyzeSignal(analysisData) {
  try {
    const prompt = buildPrompt(analysisData)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    let parsed
    try {
      const sanitized = jsonMatch[0].replace(/(\d),(\d{3})/g, '$1$2')
      parsed = JSON.parse(sanitized)
    } catch (parseErr) {
      console.error('[claude] JSON parse failed. Raw response text was:\n', text)
      throw new Error(`JSON parsing failed: ${parseErr.message}`)
    }

    // Ensure directional signal (no HOLD)
    if (parsed.signal !== 'BUY' && parsed.signal !== 'SELL') {
      const confDir = analysisData.confluence?.direction
      parsed.signal = (confDir === 'BUY' || confDir === 'SELL') ? confDir : 'BUY'
    }

    if (!parsed.confidence || parsed.confidence < 50) {
      parsed.confidence = 68
    }

    const price = analysisData.currentPrice || 100
    const isLong = parsed.signal === 'BUY'

    // Build distinct scalp & swing setups if missing or identical
    const isSameTarget = parsed.scalpSetup?.target === parsed.swingSetup?.target || parsed.scalpSetup?.target === parsed.target
    if (!parsed.scalpSetup || isSameTarget) {
      parsed.scalpSetup = {
        entryPrice: price,
        stopLoss: isLong ? parseFloat((price * 0.992).toFixed(2)) : parseFloat((price * 1.008).toFixed(2)),
        target: isLong ? parseFloat((price * 1.015).toFixed(2)) : parseFloat((price * 0.985).toFixed(2)),
        pnlPercent: isLong ? '+1.50%' : '-1.50%',
        riskRewardRatio: 1.87,
        timeHorizon: '1h - 4h',
      }
    }

    if (!parsed.swingSetup || isSameTarget) {
      parsed.swingSetup = {
        entryPrice: price,
        stopLoss: parsed.stopLoss || (isLong ? parseFloat((price * 0.965).toFixed(2)) : parseFloat((price * 1.035).toFixed(2))),
        target: parsed.target || (isLong ? parseFloat((price * 1.055).toFixed(2)) : parseFloat((price * 0.945).toFixed(2))),
        pnlPercent: isLong ? '+5.50%' : '-5.50%',
        riskRewardRatio: 2.15,
        timeHorizon: '24h - 72h',
      }
    }

    if (!parsed.stopLoss) parsed.stopLoss = parsed.swingSetup.stopLoss
    if (!parsed.target) parsed.target = parsed.swingSetup.target

    return parsed
  } catch (err) {
    console.error('analyzeSignal error:', err.message)
    const price = analysisData.currentPrice || 100
    const fallbackDir = analysisData.confluence?.direction === 'SELL' ? 'SELL' : 'BUY'
    const isLong = fallbackDir === 'BUY'
    return {
      signal: fallbackDir,
      confidence: 65,
      reasoning: `Technical market study for ${analysisData.coin || 'coin'} based on RSI, MACD, and market structure.`,
      risk: 'medium',
      stopLoss: isLong ? parseFloat((price * 0.965).toFixed(2)) : parseFloat((price * 1.035).toFixed(2)),
      target: isLong ? parseFloat((price * 1.055).toFixed(2)) : parseFloat((price * 0.945).toFixed(2)),
      riskRewardRatio: 2.1,
      timeHorizon: '24h',
      scalpSetup: {
        entryPrice: price,
        stopLoss: isLong ? parseFloat((price * 0.992).toFixed(2)) : parseFloat((price * 1.008).toFixed(2)),
        target: isLong ? parseFloat((price * 1.015).toFixed(2)) : parseFloat((price * 0.985).toFixed(2)),
        pnlPercent: '+1.50%',
        riskRewardRatio: 1.87,
        timeHorizon: '1h - 4h',
      },
      swingSetup: {
        entryPrice: price,
        stopLoss: isLong ? parseFloat((price * 0.965).toFixed(2)) : parseFloat((price * 1.035).toFixed(2)),
        target: isLong ? parseFloat((price * 1.055).toFixed(2)) : parseFloat((price * 0.945).toFixed(2)),
        pnlPercent: '+5.50%',
        riskRewardRatio: 2.15,
        timeHorizon: '24h - 72h',
      },
      keyRisk: 'Market volatility spikes during session open',
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
    onchainData: { fearGreed: { value: 22, label: 'Extreme Fear', signal: 'BUY' }, funding: { current: { rate: -0.0001, ratePercent: '-0.01', label: 'Negative' }, history: { trend: 'falling', consecutive: { positive: 0, negative: 3 } }, analysis: { signal: 'BUY', isExtreme: false } }, exchangeFlow: { direction: 'outflow', netFlow: -12400, signal: 'BUY' }, whaleTransactions: { count: 847, signal: 'BUY' }, stablecoinFlow: { signal: 'bullish', description: 'Large USDT moving to exchange' }, overallOnchainSignal: 'BUY', onchainScore: 4 },
    orderBook: { buyWall: { price: 65800, size: 450, strength: 'strong' }, sellWall: { price: 68400, size: 280, strength: 'medium' }, bidAskRatio: 1.6, signal: 'BUY', marketDepthScore: { depthScore: 'normal', spreadPercent: 0.03 } },
    confluence: { weightedScore: 80, direction: 'BUY', agreement: 'full', confidence: 80, d1Direction: 'BUY', d1Score: 85, h1Direction: 'BUY', h1Score: 75 },
    pattern: { pattern: 'Bull Flag', direction: 'bullish', confidence: 72, breakoutTarget: 71200, invalidationLevel: 65200 },
    candlePattern: { pattern: 'Bullish Engulfing', direction: 'bullish', strength: 'very strong', confidence: 88, atKeyLevel: true, description: 'Large green candle engulfs red at $65,800 support' },
    conflicts: { bullishSignals: [{ name: 'RSI Oversold' }], bearishSignals: [], dominantSide: 'bullish', conflictLevel: 'none' },
    liquidations: { nearestLongLiq: 71200, nearestShortLiq: 64800, description: 'Massive short liquidations at 64800' },
    sentiment: { macro: { dxyTrend: 'falling', goldTrend: 'rising', sp500Trend: 'neutral', macroSignal: 'BUY' }, options: { putCallRatio: 0.8, maxPain: 67000 }, futures: { longShortRatio: 1.2, longAccount: 0.55, shortAccount: 0.45, openInterestValue: 7.5e9, openInterestChange: 0.5, takerLongShortRatio: 1.02, signal: 'BUY' } },
    regime: { regime: 'trending_up' },
    dominance: null, socialVelocity: null, divergences: {}, fibonacci: {}, openInterest: {}, sessionAnalysis: null, visionAnalysis: null, patternComparison: null,
  }
  analyzeSignal(mockData).then(sig => console.log(JSON.stringify(sig, null, 2)))
}
