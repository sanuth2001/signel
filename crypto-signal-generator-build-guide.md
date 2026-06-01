 # Crypto Signal Generator — Full Build Guide for Claude Code

> Paste each pmrompt into Claude Code one at a time. Wait for completion before moving to the next. Do not skip steps.

---

## System Overview

A professional AI-powered crypto signal generator that combines:
- Technical Analysis (RSI, MACD, Bollinger Bands, EMA, Volume)
- On-chain Analysis (whale tracking, exchange flows, stablecoin moves)
- Order Book Analysis (buy/sell walls, CVD)
- Liquidation Heatmap (Coinglass)
- Regime Detection (trending/ranging/volatile market filter)
- Claude AI Brain (confidence score, reasoning, risk management)
- Loss Post-Mortem (self-improving feedback loop)

**Target accuracy:** 80–84% in trending markets
**Tech stack:** Next.js 14, Tailwind CSS, SQLite, Anthropic SDK, lightweight-charts

---

## Pre-requisites

Before starting, make sure you have:
- Node.js 18+ installed
- Claude Code installed: `npm install -g @anthropic-ai/claude-code`
- An Anthropic API key from https://console.anthropic.com
- (Optional) Etherscan API key from https://etherscan.io/apis (free)
- (Optional) Coinglass API key from https://coinglass.com (free tier)

---

## PROMPT 1 — Project Scaffold

```
I want to build a professional crypto signal generator web app using Next.js 14.
Please do the following exactly:

1. Initialize a new Next.js 14 app in the current folder using:
   npx create-next-app@latest .
   with these options:
   - TypeScript: No (use plain JavaScript)
   - ESLint: Yes
   - Tailwind CSS: Yes
   - src/ directory: No
   - App Router: Yes
   - Import alias: No

2. Install these additional dependencies:
   npm install @anthropic-ai/sdk better-sqlite3 axios

3. Create these exact empty files:
   lib/fetchers/price.js
   lib/fetchers/onchain.js
   lib/fetchers/orderbook.js
   lib/fetchers/sentiment.js
   lib/engine/indicators.js
   lib/engine/confluence.js
   lib/engine/patterns.js
   lib/engine/cvd.js
   lib/engine/regime.js
   lib/claude/signal.js
   lib/claude/postmortem.js
   lib/claude/memory.js
   lib/database/db.js
   components/SignalCard.jsx
   components/ChartPanel.jsx
   components/OnchainPanel.jsx
   components/OrderBookPanel.jsx
   components/DroughtDetector.jsx
   components/HistoryTable.jsx
   components/AccuracyStats.jsx
   components/RegimeIndicator.jsx
   app/api/signal/route.js
   app/api/history/route.js
   app/api/outcome/route.js
   app/api/accuracy/route.js
   app/api/postmortem/route.js
   app/api/memory/route.js
   app/dashboard/page.jsx

4. Create .env.local with this content:
   ANTHROPIC_API_KEY=your_key_here
   ETHERSCAN_API_KEY=your_key_here
   COINGLASS_API_KEY=your_key_here
   NEXT_PUBLIC_APP_NAME=CryptoSignal AI

5. Create .env.example with the same content.

6. Update app/page.js to auto-redirect to /dashboard.

7. Show me the full folder structure when done.
```

---

## PROMPT 2 — Price Data Fetcher

```
In lib/fetchers/price.js write a complete price data fetcher.
Requirements:

1. FETCH FROM COINGECKO FREE API (no API key needed):

   Daily candles (90 days):
   https://api.coingecko.com/api/v3/coins/{coinId}/ohlc?vs_currency=usd&days=90

   Hourly candles (7 days):
   https://api.coingecko.com/api/v3/coins/{coinId}/market_chart?vs_currency=usd&days=7&interval=hourly

   Coin ID mapping:
   BTC → bitcoin, ETH → ethereum, SOL → solana, BNB → binancecoin

2. EXPORT THIS FUNCTION:
   export async function fetchPriceData(coin = "BTC")

   Returns this exact structure:
   {
     coin: "BTC",
     currentPrice: 67400,
     priceChange24h: 2.4,
     daily: {
       timestamps: [...],
       open: [...], high: [...], low: [...], close: [...], volume: [...]
     },
     hourly: {
       timestamps: [...],
       open: [...], high: [...], low: [...], close: [...], volume: [...]
     },
     lastUpdated: "ISO timestamp"
   }

3. EXPORT THIS FUNCTION:
   export async function fetchCurrentPrice(coin = "BTC")
   Returns: { price: 67400, change24h: 2.4 }

4. ERROR HANDLING:
   - On 429 rate limit: wait 60 seconds and retry once
   - On any failure: return realistic mock data so app never crashes
   - Log all errors with console.error

5. MOCK DATA FALLBACK:
   Add getMockPriceData(coin) function with realistic fake OHLCV data
   (90 daily candles, 168 hourly candles) using Math.random() variations

6. TEST BLOCK at bottom:
   if (process.argv[2] === 'test') {
     fetchPriceData('BTC').then(data => {
       console.log('Price:', data.currentPrice)
       console.log('Daily candles:', data.daily.close.length)
       console.log('Hourly candles:', data.hourly.close.length)
     })
   }
   Test with: node lib/fetchers/price.js test
```

---

## PROMPT 3 — On-Chain Data Fetcher

```
In lib/fetchers/onchain.js write a complete on-chain data fetcher.
Requirements:

1. FETCH FEAR & GREED INDEX (free, no key):
   GET https://api.alternative.me/fng/?limit=1
   Returns: { value: 22, classification: "Extreme Fear" }

2. FETCH BTC FUNDING RATE from Binance (free, no key):
   GET https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1
   Returns: { fundingRate: -0.0001, time: timestamp }

3. FETCH LARGE TRANSACTIONS from Etherscan (needs ETHERSCAN_API_KEY):
   For ETH: GET https://api.etherscan.io/api?module=account&action=txlist
   Count transactions > $100,000 in last 6 hours
   For BTC: simulate with realistic mock data

4. EXCHANGE FLOW SIMULATION:
   Generate realistic exchange inflow/outflow data based on
   funding rate and fear/greed (negative funding = outflow bullish)
   Returns: { inflow: 2400, outflow: 14800, netFlow: -12400, direction: "outflow" }

5. STABLECOIN FLOW:
   Simulate USDT/USDC large wallet movements
   Returns: { largeMovesToExchange: 3, largeMovesFromExchange: 8, signal: "bullish" }

6. EXPORT MAIN FUNCTION:
   export async function fetchOnchainData(coin = "BTC")
   Returns:
   {
     fearGreed: { value: 22, label: "Extreme Fear", signal: "BUY" },
     funding: { rate: -0.0001, signal: "BUY" },
     exchangeFlow: { inflow: 2400, outflow: 14800, direction: "outflow", signal: "BUY" },
     whaleTransactions: { count: 847, signal: "BUY" },
     stablecoinFlow: { signal: "bullish", description: "Large USDT moving to exchange" },
     overallOnchainSignal: "BUY",
     onchainScore: 4
   }

7. FALLBACK mock data if any fetch fails.

8. TEST BLOCK: node lib/fetchers/onchain.js test
```

---

## PROMPT 4 — Order Book Fetcher

```
In lib/fetchers/orderbook.js write an order book data fetcher.
Requirements:

1. FETCH ORDER BOOK from Binance REST API (free, no key):
   GET https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100

2. ANALYZE THE ORDER BOOK:
   - Find largest buy wall (biggest bid cluster within 1% of price)
   - Find largest sell wall (biggest ask cluster within 1% of price)
   - Calculate bid/ask ratio (total bids vs total asks in top 20 levels)
   - Detect if buy walls > sell walls (bullish) or opposite (bearish)

3. CALCULATE CVD (in lib/engine/cvd.js):
   export function calculateCVD(candles)
   
   For each candle:
   - If close > open: add volume (buyers aggressive)
   - If close < open: subtract volume (sellers aggressive)
   - Cumulate all values
   
   Returns:
   {
     cvd: [...array of cumulative values],
     trend: "rising" | "falling" | "flat",
     divergence: true | false,  // price up but CVD down = fake move
     signal: "BUY" | "SELL" | "NEUTRAL",
     description: "plain english explanation"
   }

4. EXPORT MAIN FUNCTION:
   export async function fetchOrderBook(coin = "BTC")
   Returns:
   {
     buyWall: { price: 65800, size: 450, strength: "strong" },
     sellWall: { price: 68400, size: 280, strength: "medium" },
     bidAskRatio: 1.6,
     signal: "BUY",
     description: "Large buy wall at 65800, thin resistance above"
   }

5. FALLBACK mock data if fetch fails.

6. TEST BLOCK: node lib/fetchers/orderbook.js test
```

---

## PROMPT 5 — TA Indicator Engine

```
In lib/engine/indicators.js write a complete technical indicator calculator.
Requirements:

1. RSI CALCULATION:
   export function calculateRSI(closes, period = 14)
   - Use Wilder's smoothing method
   - Returns: { value: 28.4, signal: "BUY", zone: "oversold", strength: "strong" }
   - BUY if < 30, SELL if > 70, NEUTRAL otherwise

2. MACD CALCULATION:
   export function calculateMACD(closes, fast=12, slow=26, signal=9)
   - Calculate EMA fast, EMA slow, MACD line, signal line, histogram
   - Detect crossover direction
   - Returns: { macd: 245, signal: 180, histogram: 65, crossover: "bullish",
               trend: "up", signal: "BUY", strength: "medium" }

3. BOLLINGER BANDS:
   export function calculateBollingerBands(closes, period=20, stdDev=2)
   - Returns: { upper: 69400, middle: 67000, lower: 64600,
               position: "lower", squeeze: false,
               signal: "BUY", width: 4.47 }
   - BUY if price near lower band, SELL if near upper band
   - Squeeze = band width < 2% (explosion coming)

4. EMA CALCULATION:
   export function calculateEMAs(closes)
   - Calculate EMA 20, 50, 200
   - Detect golden cross (EMA50 crosses above EMA200)
   - Detect death cross (EMA50 crosses below EMA200)
   - Returns: { ema20: 67200, ema50: 66800, ema200: 63400,
               trend: "uptrend", goldenCross: false, deathCross: false,
               signal: "BUY" }

5. VOLUME ANALYSIS:
   export function analyzeVolume(volumes, currentVolume)
   - Compare current candle volume vs 20-period average
   - Returns: { current: 2400000000, average: 1200000000,
               spike: true, ratio: 2.0,
               signal: "BUY", description: "2x average volume" }

6. MASTER FUNCTION:
   export function calculateAllIndicators(priceData)
   - Runs all 5 indicators on daily AND hourly data
   - Returns: { daily: { rsi, macd, bb, ema, volume },
               hourly: { rsi, macd, bb, ema, volume } }

7. TEST BLOCK: node lib/engine/indicators.js test
```

---

## PROMPT 6 — Confluence Scorer

```
In lib/engine/confluence.js write a confluence scoring system.
Requirements:

1. SCORE INDICATORS:
   export function scoreIndicators(indicators)
   
   For each indicator signal:
   BUY    = +1 point
   SELL   = -1 point
   NEUTRAL = 0 points
   
   Strong signals = weight 1.5x
   
   Returns: { bullishCount, bearishCount, neutralCount, rawScore, maxScore }

2. MULTI-TIMEFRAME SCORING:
   export function multiTimeframeScore(dailyIndicators, hourlyIndicators)
   
   Weights:
   Daily  (1D) = weight 3x  (macro trend)
   Hourly (4H) = weight 2x  (setup)
   Hourly (1H) = weight 1x  (entry timing)
   
   Returns:
   {
     d1Score: 4, d1Direction: "BUY",
     h4Score: 3, h4Direction: "BUY",
     h1Score: 2, h1Direction: "BUY",
     weightedScore: 80,
     direction: "BUY",
     agreement: "full",    // full | partial | none
     confidence: 80
   }

3. DROUGHT DETECTION:
   export function detectDrought(confluenceResult, onchainData)
   
   Returns:
   {
     isDrought: true | false,
     reason: "Indicators conflicting — MACD bearish vs RSI bullish",
     missingConditions: ["volume confirmation", "whale activity"],
     watchFor: "RSI drop below 32 AND exchange outflow > 5000 BTC"
   }

4. MAIN EXPORT:
   export function runConfluenceAnalysis(dailyIndicators, hourlyIndicators, onchainData)
   Returns combined result with all above data.

5. TEST BLOCK: node lib/engine/confluence.js test
```

---

## PROMPT 7 — Chart Pattern Detection

```
In lib/engine/patterns.js write a chart pattern detector.
Requirements:

1. DETECT THESE PATTERNS from OHLCV data:
   
   BULLISH PATTERNS:
   - Bull Flag: strong impulse up, then tight consolidation
   - Ascending Triangle: higher lows + flat resistance
   - Cup and Handle: rounded bottom with small dip
   - Double Bottom: two lows at same price
   
   BEARISH PATTERNS:
   - Bear Flag: strong impulse down, then consolidation
   - Head and Shoulders: three peaks, middle highest
   - Double Top: two highs at same price
   - Descending Triangle: lower highs + flat support

2. DETECT SUPPORT/RESISTANCE:
   export function findKeyLevels(ohlcv, lookback = 20)
   Find price levels touched 3+ times
   Returns: { support: [65800, 64200], resistance: [68400, 70000] }

3. MAIN EXPORT:
   export function detectPatterns(ohlcv)
   Returns:
   {
     pattern: "Bull Flag",
     direction: "bullish",
     confidence: 72,
     description: "Strong impulse move up followed by tight consolidation on low volume",
     breakoutTarget: 71200,
     invalidationLevel: 65200,
     keyLevels: { support: [...], resistance: [...] }
   }
   Returns null if no clear pattern found.

4. TEST BLOCK: node lib/engine/patterns.js test
```

---

## PROMPT 8 — Regime Detector

```
In lib/engine/regime.js write a market regime detector.
This is the most important filter — it blocks signals in bad conditions.
Requirements:

1. DETECT MARKET REGIME:
   export function detectRegime(priceData, indicators, onchainData)
   
   TRENDING UP conditions:
   - Price above EMA 200
   - RSI between 45-70 (not overbought)
   - Higher highs and higher lows in last 10 candles
   - Volume increasing on up moves
   
   TRENDING DOWN conditions:
   - Price below EMA 200
   - RSI between 30-55
   - Lower highs and lower lows in last 10 candles
   
   RANGING conditions:
   - Price oscillating around EMA 50
   - RSI stuck between 40-60
   - Bollinger Bands tight (width < 3%)
   - Volume below 20-period average
   
   HIGH VOLATILITY conditions:
   - Price moved > 5% in last 4 hours
   - Unusual volume spike > 3x average
   - Fear & Greed changed > 20 points in 24h
   
   LOW LIQUIDITY conditions:
   - Volume < 50% of 30-day average
   - Bid/ask spread unusually wide
   - Weekend night UTC hours (Sat/Sun 20:00-08:00 UTC)

2. REGIME DECISION:
   export function isRegimeTradeable(regime)
   Returns:
   {
     tradeable: true | false,
     regime: "trending_up" | "trending_down" | "ranging" | "high_volatility" | "low_liquidity",
     reason: "Market is ranging — signals unreliable in this condition",
     recommendedAction: "WAIT for trending regime",
     expectedDuration: "2-4 hours typically",
     accuracy: 82   // expected accuracy % in this regime
   }

3. STRATEGY PER REGIME:
   trending_up    → enable all BUY signals, tighten SELL threshold
   trending_down  → enable all SELL signals, tighten BUY threshold
   ranging        → disable trend signals, only extreme RSI allowed
   high_volatility → reduce position size recommendation, widen stops
   low_liquidity  → block ALL signals

4. TEST BLOCK: node lib/engine/regime.js test
```

---

## PROMPT 9 — Liquidation Heatmap Fetcher

```
In lib/fetchers/sentiment.js write a sentiment and liquidation data fetcher.
Requirements:

1. LIQUIDATION HEATMAP from Coinglass (needs COINGLASS_API_KEY or simulate):
   
   If API key available:
   GET https://open-api.coinglass.com/public/v2/liquidation_heatmap
   
   If no API key: simulate realistic liquidation levels based on current price:
   - Long liquidations cluster 3-5% above current price
   - Short liquidations cluster 3-5% below current price
   - Larger clusters at round numbers ($65,000, $70,000, etc.)
   
   Returns:
   {
     largeLongLiquidations: [{ price: 71200, size: 450000000 }],
     largeShortLiquidations: [{ price: 64800, size: 320000000 }],
     nearestLongLiq: 71200,
     nearestShortLiq: 64800,
     signal: "BUY",   // price likely sweeps short liq first
     description: "Massive short liquidations at 64800, market likely sweeps there first"
   }

2. OPTIONS DATA (simulate from Deribit public data):
   Simulate put/call ratio and max pain price
   Returns:
   {
     putCallRatio: 0.8,
     maxPain: 67000,
     impliedVolatility: 65,
     signal: "NEUTRAL",
     description: "Put/call ratio neutral, max pain at current price"
   }

3. CROSS-ASSET CORRELATION (simulate):
   Estimate DXY, Gold, S&P500 correlation impact
   Returns:
   {
     dxyTrend: "falling",
     goldTrend: "rising",
     sp500Trend: "neutral",
     macroSignal: "BUY",
     description: "Falling dollar + rising gold = macro tailwind for BTC"
   }

4. EXPORT:
   export async function fetchSentimentData(coin = "BTC", currentPrice)
   Returns all above combined.

5. TEST BLOCK: node lib/fetchers/sentiment.js test
```

---

## PROMPT 10 — SQLite Database

```
In lib/database/db.js write a complete SQLite database module using better-sqlite3.
Requirements:

1. CREATE DATABASE at root: signals.db

2. CREATE signals TABLE:
   CREATE TABLE IF NOT EXISTS signals (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     coin TEXT NOT NULL,
     timestamp TEXT NOT NULL,
     signal TEXT NOT NULL,           -- BUY, SELL, HOLD
     confidence INTEGER NOT NULL,
     reasoning TEXT,
     risk TEXT,
     stopLoss REAL,
     target REAL,
     entryPrice REAL,
     regime TEXT,
     confluenceScore INTEGER,
     indicators TEXT,                -- JSON string
     onchainData TEXT,               -- JSON string
     outcome TEXT DEFAULT 'pending', -- pending, win, loss
     closePrice REAL,
     pnlPercent REAL,
     postMortem TEXT                 -- JSON string from Claude
   )

3. CREATE accuracy_stats TABLE:
   CREATE TABLE IF NOT EXISTS accuracy_stats (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     updatedAt TEXT,
     totalSignals INTEGER,
     wins INTEGER,
     losses INTEGER,
     pending INTEGER,
     winRate REAL,
     avgConfidence REAL,
     bestRegime TEXT,
     worstSignalType TEXT,
     patternSummary TEXT
   )

4. EXPORT THESE FUNCTIONS:
   saveSignal(signalData)           → returns inserted id
   updateOutcome(id, outcome, closePrice, pnlPercent)
   getSignalById(id)
   getHistory(limit = 50)
   getAccuracyStats()
   getPendingSignals()
   savePostMortem(id, postMortemData)
   getLosingSignals(limit = 20)
   getAllSignals()

5. Initialize database on import (create tables if not exist)

6. TEST BLOCK: node lib/database/db.js test
```

---

## PROMPT 11 — Claude Signal Brain

```
In lib/claude/signal.js write the Claude API signal analyzer.
This is the core AI engine of the entire system.
Requirements:

1. IMPORT Anthropic SDK and initialize client using process.env.ANTHROPIC_API_KEY

2. EXPORT MAIN FUNCTION:
   export async function analyzeSignal(analysisData)
   
   Where analysisData contains:
   - coin, currentPrice
   - indicators (RSI, MACD, BB, EMA, Volume for daily and hourly)
   - onchain (fearGreed, funding, exchangeFlow, whales, stablecoin)
   - orderBook (buyWall, sellWall, bidAskRatio, cvd)
   - confluence (score, direction, agreement, timeframes)
   - pattern (detected pattern, confidence, target)
   - liquidations (nearestLong, nearestShort)
   - regime (current regime type)
   - sentiment (macro, options)

3. BUILD THIS EXACT PROMPT:
   System: "You are a professional crypto trading signal analyst with 
   expertise in technical analysis, on-chain analytics, and market 
   microstructure. You analyze all provided data and return only a 
   JSON signal with no additional text."
   
   User: Build a detailed prompt that includes ALL the data above,
   formatted clearly with sections for:
   - Current market data
   - Technical analysis indicators (daily and hourly)
   - On-chain metrics
   - Order book structure
   - Confluence score
   - Chart pattern
   - Liquidation levels
   - Regime and macro context
   
   End with: "Return ONLY this JSON object, nothing else:
   {
     signal: BUY or SELL or HOLD,
     confidence: 0 to 100,
     reasoning: max 3 sentences plain English,
     risk: low or medium or high,
     stopLoss: price number,
     target: price number,
     riskRewardRatio: number,
     timeHorizon: 4h or 24h or 72h,
     keyRisk: biggest risk to this trade in one sentence,
     droughtReason: null or string explaining why no signal
   }"

4. CALL claude-sonnet-4-6 model with max_tokens: 500

5. PARSE JSON response safely with try/catch

6. CONFIDENCE FILTER:
   If confidence < 70, change signal to HOLD and add note

7. EXPORT HELPER:
   export function formatSignalForDisplay(rawSignal, analysisData)
   Adds timestamp, coin, regime, confluenceScore to the signal

8. TEST BLOCK: node lib/claude/signal.js test
   (use mock analysis data)
```

---

## PROMPT 12 — Loss Post-Mortem

```
In lib/claude/postmortem.js write the Claude loss post-mortem analyzer.
Requirements:

1. EXPORT MAIN FUNCTION:
   export async function analyzePostMortem(signalRecord, marketDataAtClose)
   
   Where signalRecord is the original signal from database and
   marketDataAtClose is what actually happened after the signal.

2. BUILD THIS PROMPT for Claude:
   System: "You are a trading system analyst specializing in diagnosing 
   why signals fail. Be specific, actionable, and honest."
   
   User: Include:
   - Original signal (BUY/SELL, confidence, reasoning)
   - All indicators at time of signal
   - Actual price movement after signal
   - Outcome (loss of X%)
   - What indicators said vs what happened
   
   Ask Claude to return ONLY this JSON:
   {
     mainReason: "one sentence — the primary cause of failure",
     indicatorsThatFailed: ["RSI", "MACD"],
     indicatorsThatWereCorrect: ["volume"],
     marketConditionMismatch: "was ranging not trending",
     howToAvoidNext: "add funding rate filter for this setup",
     patternFound: "RSI oversold in ranging market = false signal",
     confidenceWasTooHigh: true or false,
     shouldHaveWaited: "description of better entry condition"
   }

3. EXPORT PATTERN ANALYSIS FUNCTION:
   export async function analyzePatterns(losingSignals)
   
   Takes array of last 20 losing signals.
   Sends ALL to Claude at once.
   
   Asks Claude: "Review all these losing trades and find the top 3 
   patterns causing losses. Return JSON:
   {
     patterns: [
       {
         pattern: description,
         frequency: count,
         fix: how to filter this out
       }
     ],
     topRecommendation: most important change to make,
     estimatedAccuracyImprovement: percentage
   }"

4. TEST BLOCK: node lib/claude/postmortem.js test
```

---

## PROMPT 13 — AI Pattern Memory

```
In lib/claude/memory.js write the AI pattern memory system.
Requirements:

1. EXPORT FUNCTION:
   export async function generateStrategyInsights(allSignals)
   
   Takes all signals from database (wins and losses).
   Analyzes patterns across the full history.
   
   Sends to Claude with prompt:
   "You are reviewing the complete signal history of a crypto trading 
   system. Identify strengths, weaknesses, and specific improvements.
   
   Return ONLY this JSON:
   {
     totalTrades: number,
     winRate: percentage,
     bestSetups: [
       { condition: description, winRate: %, count: number }
     ],
     worstSetups: [
       { condition: description, winRate: %, count: number }
     ],
     recommendations: [
       { change: what to change, expectedImprovement: why }
     ],
     marketConditionBreakdown: {
       trending: { winRate, count },
       ranging: { winRate, count },
       volatile: { winRate, count }
     },
     summary: 2-3 sentence overall assessment
   }"

2. EXPORT FUNCTION:
   export async function getDailyBrief(recentSignals, currentMarket)
   
   Sends last 5 signals + current market to Claude.
   Returns a brief daily market read in plain English (2-3 sentences).

3. CACHE insights in database accuracy_stats table (refresh every 24h)

4. TEST BLOCK: node lib/claude/memory.js test
```

---

## PROMPT 14 — Main Signal Pipeline (API Route)

```
In app/api/signal/route.js write the main signal pipeline.
This connects every piece of the system together.
Requirements:

1. EXPORT async function GET(request)

2. Read ?coin=BTC from query params (default BTC)

3. RUN FULL PIPELINE in this exact order:
   
   Step 1: Fetch price data
   const priceData = await fetchPriceData(coin)
   
   Step 2: Fetch all external data in parallel (faster):
   const [onchainData, orderBook, sentimentData] = await Promise.all([
     fetchOnchainData(coin),
     fetchOrderBook(coin),
     fetchSentimentData(coin, priceData.currentPrice)
   ])
   
   Step 3: Calculate all indicators
   const indicators = calculateAllIndicators(priceData)
   
   Step 4: Calculate CVD
   const cvd = calculateCVD(priceData.hourly)
   
   Step 5: Detect chart patterns
   const pattern = detectPatterns(priceData.daily)
   
   Step 6: Run confluence scoring
   const confluence = runConfluenceAnalysis(
     indicators.daily, indicators.hourly, onchainData
   )
   
   Step 7: REGIME DETECTION — run first before Claude
   const regime = detectRegime(priceData, indicators, onchainData)
   const tradeableCheck = isRegimeTradeable(regime)
   
   Step 8: If NOT tradeable, return drought response immediately:
   if (!tradeableCheck.tradeable) {
     return Response.json({
       status: "drought",
       regime: tradeableCheck.regime,
       reason: tradeableCheck.reason,
       recommendedAction: tradeableCheck.recommendedAction,
       signal: "WAIT",
       confidence: 0
     })
   }
   
   Step 9: Send to Claude AI
   const rawSignal = await analyzeSignal({
     coin, currentPrice: priceData.currentPrice,
     indicators, onchainData, orderBook,
     confluence, pattern, regime,
     liquidations: sentimentData.liquidations,
     sentiment: sentimentData
   })
   
   Step 10: Format signal
   const signal = formatSignalForDisplay(rawSignal, {
     coin, priceData, regime, confluence
   })
   
   Step 11: Save to database
   const id = saveSignal({
     ...signal,
     entryPrice: priceData.currentPrice,
     regime: regime.regime,
     confluenceScore: confluence.weightedScore,
     indicators: JSON.stringify(indicators),
     onchainData: JSON.stringify(onchainData)
   })
   
   Step 12: Return full response
   return Response.json({
     status: "signal",
     id,
     ...signal,
     priceData: { current: priceData.currentPrice, change24h: priceData.priceChange24h },
     indicators,
     onchainData,
     orderBook,
     pattern,
     confluence,
     regime
   })

4. FULL ERROR HANDLING:
   Wrap entire pipeline in try/catch
   On error return: { status: "error", message: error.message }

5. Add 30-second timeout to prevent hanging requests
```

---

## PROMPT 15 — Remaining API Routes

```
Create these remaining API routes:

1. app/api/history/route.js
   GET handler:
   - Returns last 50 signals from database
   - Include accuracy stats (win rate, total, wins, losses)
   - Sort by timestamp descending

2. app/api/outcome/route.js
   POST handler:
   - Body: { id, outcome, closePrice }
   - Calculate pnlPercent from entry vs close price
   - Update database record
   - If outcome is "loss": automatically trigger post-mortem
     Call analyzePostMortem and save result to database
   - Return updated record

3. app/api/accuracy/route.js
   GET handler:
   - Calculate win rate from database
   - Break down by regime, signal type, confidence level
   - Return strategy insights from memory.js (cached)
   - Return: { overall, byRegime, byConfidence, insights, recommendations }

4. app/api/postmortem/route.js
   GET handler:
   - Query param: ?id=123
   - Fetch signal from database by id
   - If postMortem already exists return it
   - If not, call analyzePostMortem and save + return

5. app/api/memory/route.js
   GET handler:
   - Fetch all signals from database
   - Call generateStrategyInsights
   - Return insights, patterns, recommendations
```

---

## PROMPT 16 — Dashboard UI

```
Build the complete dashboard UI in app/dashboard/page.jsx.
Use Tailwind CSS with a dark theme (dark trading terminal style).
Requirements:

1. LAYOUT:
   - Full dark background: bg-gray-950
   - Top navigation bar with app name and coin selector
   - Main content in responsive grid layout

2. TOP BAR:
   - App name "CryptoSignal AI" with small BTC/ETH/SOL/BNB selector buttons
   - Last updated timestamp
   - Auto-refresh every 5 minutes with countdown timer
   - Regime badge (shows current market condition with color)

3. MAIN SIGNAL CARD (most prominent element):
   - BIG text: BUY (green) / SELL (red) / HOLD (yellow) / WAIT (gray)
   - Large confidence bar (0-100%) with color gradient
   - Stop loss and target prices
   - Risk/reward ratio badge
   - Time horizon badge (4h / 24h / 72h)
   - Claude reasoning text in italic
   - Key risk warning text

4. FOUR METRIC CARDS (small, below signal):
   - Fear & Greed: value + emoji + classification
   - Exchange Flow: direction arrow + BTC amount
   - Whale Activity: transaction count + signal
   - Funding Rate: percentage + color coded

5. CHART PANEL:
   - Use lightweight-charts library for candlestick chart
   - Show last 90 daily candles
   - Overlay EMA 20 (blue), EMA 50 (orange), EMA 200 (red)
   - Show Bollinger Bands as shaded area
   - Mark entry price, stop loss, target with horizontal lines
   - Show detected pattern name as label on chart
   - Timeframe selector: 1D / 4H / 1H

6. ON-CHAIN + ORDER BOOK PANEL:
   - Order book buy wall vs sell wall visualization (simple bar)
   - CVD trend with arrow
   - Stablecoin flow indicator
   - Liquidation levels (nearest long + short liquidation)

7. REGIME PANEL:
   - Current regime badge with description
   - Accuracy % in current regime
   - If drought: show reason and what to watch for

8. SIGNAL HISTORY TABLE:
   - Last 20 signals in table
   - Columns: time, coin, signal, confidence, outcome, P&L%
   - Color coded: green wins, red losses, gray pending
   - Click any row to see full details + post-mortem

9. ACCURACY STATS PANEL:
   - Overall win rate (big number)
   - Win/loss/pending counts
   - Best performing setup
   - Worst performing setup
   - Strategy improvement button → calls /api/memory

10. All data fetched client-side from /api routes using useEffect
    Show loading spinners while fetching
    Show error states gracefully
    Handle "drought" status with special waiting UI
```

---

## PROMPT 17 — UI Components

```
Build these reusable components:

1. components/SignalCard.jsx
   Props: { signal, confidence, reasoning, risk, stopLoss, target, riskReward, timeHorizon, keyRisk }
   - Large signal text with appropriate color
   - Animated confidence bar
   - All details laid out cleanly

2. components/DroughtDetector.jsx
   Props: { reason, regime, watchFor, recommendedAction }
   - Yellow/amber warning card
   - Clock icon
   - Shows exactly why no signal + what to watch for

3. components/RegimeIndicator.jsx
   Props: { regime, accuracy, description }
   - Color coded badge per regime type
   - Trending up = green, Trending down = red
   - Ranging = yellow, Volatile = orange, Low liquidity = gray

4. components/HistoryTable.jsx
   Props: { signals, onSelectSignal }
   - Clean dark table
   - Color coded outcomes
   - Click to expand post-mortem

5. components/AccuracyStats.jsx
   Props: { stats, insights, onRefresh }
   - Overall win rate as large donut number
   - Best/worst setup cards
   - Recommendations list from Claude

6. components/ChartPanel.jsx
   Props: { ohlcv, indicators, signal }
   - Integrates lightweight-charts
   - All overlays rendered properly
   - Responsive to container width

Make all components dark-themed with Tailwind.
Use gray-900/gray-800 backgrounds, gray-700 borders.
Green = #22c55e, Red = #ef4444, Yellow = #eab308, Blue = #3b82f6.
```

---

## PROMPT 18 — Environment & Final Wiring

```
Do the following final setup steps:

1. Update next.config.js to allow external API calls:
   Add headers for CORS if needed
   Add any required domains to image domains

2. Create a lib/utils/formatters.js with helper functions:
   formatPrice(price)          → "$67,234.50"
   formatPercent(value)        → "+2.45%"
   formatLargeNumber(n)        → "12.4K" or "1.2M"
   getSignalColor(signal)      → tailwind class string
   getConfidenceLabel(score)   → "Very High" / "High" / "Medium" / "Low"
   timeAgo(timestamp)          → "5 minutes ago"

3. Create a lib/utils/constants.js:
   COINS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin' }
   SIGNAL_TYPES = ['BUY', 'SELL', 'HOLD']
   REGIMES = ['trending_up', 'trending_down', 'ranging', 'high_volatility', 'low_liquidity']
   CONFIDENCE_THRESHOLD = 70
   REFRESH_INTERVAL = 300000  (5 minutes in ms)

4. Add loading states to dashboard:
   - Skeleton loading placeholders while fetching
   - Error boundary for each panel
   - "Last updated X minutes ago" indicator

5. Test the complete flow:
   npm run dev
   Visit http://localhost:3000
   Click "Get Signal" button
   Verify signal appears from Claude API
   Check database has record: node -e "const db = require('./lib/database/db'); console.log(db.getHistory())"

6. Fix any errors that appear.
   Check .env.local has ANTHROPIC_API_KEY set.
   Confirm the /api/signal endpoint returns proper JSON.
```

---

## PROMPT 19 — Testing & Debugging

```
Run these tests and fix any issues found:

1. Test each fetcher individually:
   node lib/fetchers/price.js test
   node lib/fetchers/onchain.js test
   node lib/fetchers/orderbook.js test
   node lib/fetchers/sentiment.js test

2. Test each engine module:
   node lib/engine/indicators.js test
   node lib/engine/confluence.js test
   node lib/engine/patterns.js test
   node lib/engine/regime.js test

3. Test database:
   node lib/database/db.js test

4. Test Claude integration:
   node lib/claude/signal.js test
   (should call Claude API and return a JSON signal)

5. Test full API pipeline:
   npm run dev (in background)
   curl http://localhost:3000/api/signal?coin=BTC
   (should return a complete signal JSON)

6. Fix any import errors, missing dependencies, or runtime errors.

7. Verify dashboard loads without errors at http://localhost:3000/dashboard

8. Simulate a loss outcome:
   POST to /api/outcome with { id: 1, outcome: "loss", closePrice: 65000 }
   Verify post-mortem is generated and saved.
```

---

## PROMPT 20 — Final Polish

```
Do these final polish steps to make the app production-ready:

1. Add a README.md with:
   - Project description
   - Setup instructions (npm install, .env setup, npm run dev)
   - How each component works
   - API endpoint documentation
   - How to read signals

2. Add rate limiting to API routes:
   Track last call time in memory
   Prevent calling /api/signal more than once per minute

3. Add a settings panel to dashboard:
   - Confidence threshold slider (default 70)
   - Which coins to track
   - Enable/disable auto-refresh
   - Risk percentage per trade (default 2%)
   - Position size calculator based on risk %

4. Add a manual outcome input to HistoryTable:
   Pending signals show a Win / Loss button
   Clicking updates outcome and triggers post-mortem if loss

5. Add a strategy insights page at /dashboard/insights:
   Shows full AI Pattern Memory analysis
   Shows all losing patterns found
   Shows recommendations for improvement
   Refresh button to regenerate with latest data

6. Build the app for production:
   npm run build
   Fix any build errors.

7. Confirm final folder structure is clean and complete.
```

---

## System Architecture Summary

```
LAYER 1 — DATA SOURCES
  Price        → CoinGecko API (free)
  On-chain     → Etherscan + Alternative.me + Binance
  Order book   → Binance REST API (free)
  Sentiment    → Coinglass + simulated options/macro

LAYER 2 — SMART DATA PROCESSING
  CVD          → lib/engine/cvd.js
  Stablecoin   → lib/fetchers/onchain.js
  Liquidations → lib/fetchers/sentiment.js
  Smart money  → lib/fetchers/onchain.js

LAYER 3 — SIGNAL ENGINE
  Indicators   → lib/engine/indicators.js
  Patterns     → lib/engine/patterns.js
  Confluence   → lib/engine/confluence.js

LAYER 4 — REGIME DETECTOR (critical filter)
  Regime       → lib/engine/regime.js
  Blocks bad market conditions before Claude is called

LAYER 5 — CLAUDE AI BRAIN
  Signal       → lib/claude/signal.js (claude-sonnet-4-6)
  Only fires when confidence >= 70%

LAYER 6 — DASHBOARD
  Main page    → app/dashboard/page.jsx
  Components   → components/
  API routes   → app/api/

LAYER 7 — FEEDBACK LOOP
  Database     → lib/database/db.js (SQLite)
  Post-mortem  → lib/claude/postmortem.js
  Memory       → lib/claude/memory.js
```

---

## Expected Accuracy

| Market Condition | Expected Win Rate |
|---|---|
| Trending market (optimal) | 78–84% |
| Ranging market | 55–62% |
| High volatility | Signals blocked |
| Low liquidity | Signals blocked |
| **Overall average** | **72–78%** |

---

## Quick Start After Build

```bash
# 1. Add your API key
echo "ANTHROPIC_API_KEY=your_key" >> .env.local

# 2. Start the app
npm run dev

# 3. Open dashboard
open http://localhost:3000

# 4. Get your first signal
# Click the coin selector, then click "Analyze"
# Wait 5-10 seconds for Claude to respond
# Review the signal, confidence, and reasoning

# 5. After trade closes
# Click Win or Loss on the signal in history table
# View the post-mortem if it was a loss
```

---

*Built with Next.js 14 · Tailwind CSS · Claude AI (claude-sonnet-4-6) · SQLite*
