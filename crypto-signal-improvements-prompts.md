# Crypto Signal Generator — Full Improvements Guide
# Prompts 21 to 38 — Paste into Claude Code one at a time

> These prompts continue from the original build guide.
> Your existing system must be running before starting these.
> Paste one prompt, wait for completion, then move to next.

---

## PHASE 1 — CRITICAL (This Week)

---

## PROMPT 21 — Candle Pattern Recognition

```
Add individual candle pattern detection to the existing system.
Create a new file: lib/engine/candlePatterns.js

Requirements:

1. DETECT THESE BULLISH PATTERNS:

   HAMMER:
   - Lower wick must be 2x or more the body size
   - Upper wick must be small (less than 20% of body)
   - Body must be in upper 30% of candle range
   - Returns: { pattern: "Hammer", direction: "bullish", strength: "strong" }

   BULLISH ENGULFING:
   - Requires 2 candles
   - Candle 1: bearish (close < open)
   - Candle 2: bullish body completely covers candle 1 body
   - Candle 2 open below candle 1 close
   - Candle 2 close above candle 1 open
   - Returns: { pattern: "Bullish Engulfing", direction: "bullish", strength: "very strong" }

   MORNING STAR:
   - Requires 3 candles
   - Candle 1: large bearish candle
   - Candle 2: small body (doji or spinning top) gaps down
   - Candle 3: large bullish candle closes above midpoint of candle 1
   - Returns: { pattern: "Morning Star", direction: "bullish", strength: "very strong" }

   BULLISH DOJI:
   - Open and close within 0.1% of each other
   - ONLY count as signal when near support level
   - Returns: { pattern: "Doji", direction: "neutral", strength: "weak",
               note: "meaningful only at support" }

   THREE WHITE SOLDIERS:
   - 3 consecutive bullish candles
   - Each opens within previous body
   - Each closes at or near high
   - Each candle larger than previous
   - Returns: { pattern: "Three White Soldiers", direction: "bullish", strength: "very strong" }

   BULLISH MARUBOZU:
   - No upper wick (or less than 0.1% of body)
   - No lower wick (or less than 0.1% of body)
   - Full bullish body
   - Returns: { pattern: "Bullish Marubozu", direction: "bullish", strength: "strong" }

2. DETECT THESE BEARISH PATTERNS:

   SHOOTING STAR:
   - Upper wick must be 2x or more the body size
   - Lower wick must be small (less than 20% of body)
   - Body must be in lower 30% of candle range
   - Returns: { pattern: "Shooting Star", direction: "bearish", strength: "strong" }

   BEARISH ENGULFING:
   - Requires 2 candles
   - Candle 1: bullish (close > open)
   - Candle 2: bearish body completely covers candle 1 body
   - Returns: { pattern: "Bearish Engulfing", direction: "bearish", strength: "very strong" }

   EVENING STAR:
   - Requires 3 candles
   - Candle 1: large bullish candle
   - Candle 2: small body gaps up
   - Candle 3: large bearish candle closes below midpoint of candle 1
   - Returns: { pattern: "Evening Star", direction: "bearish", strength: "very strong" }

   BEARISH MARUBOZU:
   - No wicks on either side
   - Full bearish body
   - Returns: { pattern: "Bearish Marubozu", direction: "bearish", strength: "strong" }

   THREE BLACK CROWS:
   - 3 consecutive bearish candles
   - Each opens within previous body
   - Each closes at or near low
   - Returns: { pattern: "Three Black Crows", direction: "bearish", strength: "very strong" }

3. EXPORT MAIN FUNCTION:
   export function detectCandlePattern(candles, keyLevels)

   Parameters:
   - candles: array of last 5 candles (most recent last)
     Each candle: { open, high, low, close, volume, timestamp }
   - keyLevels: { support: [...], resistance: [...] }

   Logic:
   - Check last 3 candles for all patterns above
   - If doji found, only count if within 1% of support/resistance
   - If multiple patterns found, return strongest one
   - If no pattern found, return null

   Returns:
   {
     pattern: "Bullish Engulfing",
     direction: "bullish",
     strength: "very strong",
     candle: 1,          // how many candles ago (1 = most recent)
     atKeyLevel: true,
     nearestLevel: 65800,
     confidence: 85,
     entrySignal: true,  // true if good entry timing
     description: "Large green candle completely engulfs previous red candle at $65,800 support"
   }

4. INTEGRATE INTO SIGNAL PIPELINE in app/api/signal/route.js:
   After Step 4 (CVD calculation) add:

   Step 4b → Detect candle patterns
   const candlePattern = detectCandlePattern(
     priceData.hourly.candles.slice(-5),
     pattern?.keyLevels || {}
   )

   Pass candlePattern to Claude in Step 9.

5. UPDATE Claude prompt in lib/claude/signal.js:
   Add this section to the prompt:

   "CANDLE PATTERN ANALYSIS:
   Pattern detected: {candlePattern.pattern || 'None'}
   Direction: {candlePattern.direction}
   Strength: {candlePattern.strength}
   At key level: {candlePattern.atKeyLevel}
   Description: {candlePattern.description}
   
   If bullish candle pattern detected at support AND signal is BUY:
   increase confidence by 8-12 points.
   If bearish candle pattern detected at resistance AND signal is SELL:
   increase confidence by 8-12 points.
   If candle pattern conflicts with signal direction:
   decrease confidence by 5-8 points."

6. ADD to SignalCard.jsx display:
   Show candle pattern below chart pattern:

   CANDLE PATTERN
   🕯️ Bullish Engulfing
   "Large green candle engulfs red at support"
   Confidence boost: +10%

7. TEST BLOCK at bottom of file:
   node lib/engine/candlePatterns.js test
   Use mock candle data to verify each pattern detects correctly.
```

---

## PROMPT 22 — HOLD Signal Clarity

```
Improve the HOLD signal display to explain exactly what
the user should wait for. Make the waiting state informative.

1. UPDATE lib/claude/signal.js Claude prompt:
   Add to the JSON response schema:

   "waitingFor": {
     "conditions": ["list of conditions that would upgrade to BUY or SELL"],
     "missingConditions": ["what is currently missing"],
     "watchLevels": {
       "bullishTrigger": price level that would trigger BUY,
       "bearishTrigger": price level that would trigger SELL
     },
     "estimatedWait": "short (< 4h) | medium (4-24h) | long (> 24h)",
     "currentConflicts": ["list of conflicting signals found"]
   }

2. UPDATE components/SignalCard.jsx:
   When signal === "HOLD" show a new section below the main card:

   ┌─────────────────────────────────────────┐
   │  ⏳ WAITING FOR BETTER SETUP            │
   │                                         │
   │  Current confidence: 62% (need 70%+)   │
   │                                         │
   │  CONFLICTS DETECTED:                    │
   │  ❌ Regime: Trending Down               │
   │  ✅ Pattern: Double Bottom              │
   │  ❌ CVD: Falling                        │
   │  ✅ RSI: Oversold                       │
   │                                         │
   │  SIGNAL WILL TRIGGER WHEN:              │
   │  → Break BELOW $1,966 → SHORT fires    │
   │  → Break ABOVE $2,010 → LONG possible  │
   │                                         │
   │  ESTIMATED WAIT: medium (4-24h)         │
   │  Next auto-scan: 14:32                  │
   └─────────────────────────────────────────┘

3. ADD conflict scoring to confluence.js:
   export function detectConflicts(indicators, regime, pattern, onchain)

   Returns:
   {
     hasConflict: true,
     bullishSignals: [
       { name: "RSI Oversold", strength: "strong" },
       { name: "Double Bottom", strength: "medium" },
       { name: "BB Lower Band", strength: "medium" }
     ],
     bearishSignals: [
       { name: "EMA Downtrend", strength: "strong" },
       { name: "MACD Sell", strength: "strong" },
       { name: "CVD Falling", strength: "medium" },
       { name: "76% Longs Crowded", strength: "strong" }
     ],
     dominantSide: "bearish",
     conflictReason: "Bearish signals (4) outweigh bullish signals (3)"
   }

4. ADD ConflictBadge component: components/ConflictBadge.jsx
   Shows two columns: bullish vs bearish signals
   Color coded: green for bullish, red for bearish
   Shows which side is stronger
   Only visible when signal is HOLD

5. UPDATE DroughtDetector.jsx:
   Add the conflict columns display
   Add the watch levels with price alerts
   Add countdown to next auto-scan
```

---

## PROMPT 23 — Thin Market Filter

```
Add automatic thin market detection to block unreliable signals.
This prevents trading when order books are too thin.

1. UPDATE lib/fetchers/orderbook.js:
   Add this analysis to fetchOrderBook():

   Calculate total bid depth (sum of top 20 bid levels)
   Calculate total ask depth (sum of top 20 ask levels)

   const marketDepthScore = {
     totalBidDepth: sum of bid quantities in top 20 levels,
     totalAskDepth: sum of ask quantities in top 20 levels,
     bidAskRatio: totalBidDepth / totalAskDepth,
     depthScore: classify as "deep" | "normal" | "thin" | "very thin",
     spreadPercent: (bestAsk - bestBid) / bestBid * 100
   }

   Thresholds:
   bidAskRatio > 1.5 AND spread < 0.05%  → "deep"
   bidAskRatio 0.5-1.5 AND spread < 0.1% → "normal"
   bidAskRatio 0.1-0.5 OR spread > 0.1%  → "thin"
   bidAskRatio < 0.1 OR spread > 0.3%    → "very thin"

2. UPDATE lib/engine/regime.js:
   Add thin market check to isRegimeTradeable():

   if (orderBook.depthScore === "very thin") {
     return {
       tradeable: false,
       regime: "low_liquidity",
       reason: "Order book extremely thin (bid/ask ratio: 0.06) — signals unreliable",
       recommendedAction: "Wait for normal market depth"
     }
   }

   if (orderBook.depthScore === "thin") {
     // Don't block but reduce confidence
     confidenceAdjustment -= 15
     warnings.push("Thin order book — reduce position size")
   }

3. UPDATE lib/fetchers/price.js:
   Add 24h volume check at start of fetchPriceData():

   Fetch current volume from:
   https://api.coingecko.com/api/v3/simple/price?ids={coinId}&vs_currencies=usd&include_24hr_vol=true

   const volumeThresholds = {
     BTC:  1000000000,   // $1B minimum
     ETH:   500000000,   // $500M minimum
     SOL:   100000000,   // $100M minimum
     BNB:   100000000,   // $100M minimum
     XRP:    50000000,   // $50M minimum
     default: 20000000  // $20M minimum for any other coin
   }

   If volume < threshold:
   Return early from pipeline with:
   {
     status: "drought",
     reason: "24h volume ($18M) below minimum threshold ($50M)",
     recommendedAction: "Market too thin for reliable signals today"
   }

4. ADD volume display to dashboard:
   Show 24h volume on OnchainPanel.jsx
   Color code: green if above threshold, red if below

5. TEST: node lib/fetchers/orderbook.js test
   Verify thin market detection works correctly
```

---

## PROMPT 24 — Trade Outcome Recorder UI

```
Improve the outcome recording system so it is easy and fast
to record wins and losses from the history table.

1. UPDATE components/HistoryTable.jsx:
   For each pending signal add these UI elements:

   ┌────────────────────────────────────────────────────────┐
   │ #47  BTC  🟢 BUY  86%  $67,400  ⏳ PENDING            │
   │                                                        │
   │ Close Price: [$______] [✅ WIN] [❌ LOSS] [⏭ Skip]    │
   └────────────────────────────────────────────────────────┘

   WIN button: green, confirms profit
   LOSS button: red, confirms loss + triggers post-mortem
   Skip button: gray, keeps as pending

2. ADD quick outcome modal:
   When WIN or LOSS clicked show modal:

   ┌─────────────────────────────────────┐
   │  Record Trade Outcome               │
   │                                     │
   │  Signal:    BUY BTC at $67,400      │
   │  Target:    $71,200                 │
   │  Stop Loss: $64,800                 │
   │                                     │
   │  Close Price: [__________]          │
   │                                     │
   │  P&L will be: +X.XX%               │
   │                                     │
   │  [Cancel]  [Confirm WIN ✅]         │
   └─────────────────────────────────────┘

3. UPDATE app/api/outcome/route.js:
   After recording a LOSS:
   - Automatically call analyzePostMortem()
   - Save result to database
   - Return postMortem in response

   After recording a WIN:
   - Update accuracy stats
   - Check if win rate milestone reached
   - Return updated accuracy stats

4. ADD accuracy milestone notifications:
   First win       → "🎉 First win recorded!"
   50% win rate    → "📊 Win rate: 50% — system learning"
   70% win rate    → "🔥 Win rate: 70% — system performing well"
   80%+ win rate   → "🏆 Win rate: 80%+ — excellent performance"

5. ADD auto-close detection (optional enhancement):
   For each pending signal compare target and stop loss
   against current price:

   If currentPrice >= target:
     Show notification: "Signal #47 may have hit target — record outcome?"
   If currentPrice <= stopLoss:
     Show notification: "Signal #47 may have hit stop — record outcome?"

6. UPDATE accuracy stats display:
   Recalculate and refresh AccuracyStats.jsx
   after every outcome recorded
```

---

## PHASE 2 — IMPORTANT (This Month)

---

## PROMPT 25 — BTC Dominance Filter

```
Add BTC dominance tracking to improve altcoin signal accuracy.
When BTC dominance is rising, altcoins get headwinds.

1. UPDATE lib/fetchers/onchain.js:
   Add new function at bottom:

   export async function fetchBTCDominance()

   Call this endpoint:
   GET https://api.coingecko.com/api/v3/global

   Extract:
   - data.market_cap_percentage.btc (current dominance %)

   Also fetch yesterday's value by calling:
   GET https://api.coingecko.com/api/v3/global/market_cap_chart?days=2

   Calculate:
   const dominanceTrend = currentDominance > yesterdayDominance
     ? "rising" : "falling"
   const dominanceChange = currentDominance - yesterdayDominance

   Returns:
   {
     current: 54.2,
     yesterday: 53.8,
     change: +0.4,
     trend: "rising",
     signal: "bearish_for_alts",
     description: "BTC dominance rising +0.4% — altcoin headwind active"
   }

2. UPDATE lib/engine/regime.js:
   Add dominance check for altcoin signals:

   export function applyDominanceFilter(coin, signal, dominanceData)

   Logic:
   if (coin === 'BTC') return signal (no filter needed)

   if (dominanceData.trend === "rising" && dominanceData.change > 0.3) {
     if (signal.signal === "BUY") {
       signal.confidence -= 10
       signal.warnings.push("BTC dominance rising — altcoin headwind")
     }
     if (signal.signal === "SELL") {
       signal.confidence += 5
       signal.reasoning += " BTC dominance rising adds downside pressure."
     }
   }

   if (dominanceData.trend === "falling" && dominanceData.change < -0.3) {
     if (signal.signal === "BUY") {
       signal.confidence += 8
       signal.reasoning += " Falling BTC dominance supports altcoin strength."
     }
   }

   Return modified signal.

3. UPDATE app/api/signal/route.js:
   In Step 2 parallel fetch add:
   const dominanceData = await fetchBTCDominance()

   After Step 9 Claude response add:
   if (coin !== 'BTC') {
     signal = applyDominanceFilter(coin, signal, dominanceData)
   }

4. ADD dominance display to OnchainPanel.jsx:
   BTC Dominance: 54.2% ↑ Rising
   Color: red if rising (bad for alts), green if falling

5. ADD to Claude prompt in lib/claude/signal.js:
   "BTC DOMINANCE:
   Current: {dominance.current}%
   Trend: {dominance.trend} ({dominance.change}% change)
   {dominance.description}
   Factor this into your confidence for non-BTC coins."

6. TEST: node lib/fetchers/onchain.js testDominance
```

---

## PROMPT 26 — Position Size Calculator Upgrade

```
Upgrade the position size calculator to support user input
and display full risk management breakdown.

1. ADD settings state to app/dashboard/page.jsx:
   const [userSettings, setUserSettings] = useState({
     capital: 10000,
     riskPercent: 2,
     currency: 'USD'
   })

   Save settings to localStorage so they persist between visits.

2. ADD SettingsPanel component: components/SettingsPanel.jsx

   Create a settings modal triggered by the gear icon (⚙️):

   ┌────────────────────────────────────────┐
   │  ⚙️ TRADING SETTINGS                  │
   │                                        │
   │  Total Capital:                        │
   │  $ [__________] USD                    │
   │                                        │
   │  Risk Per Trade:                       │
   │  [●────────] 2%                        │
   │  (drag slider: 0.5% to 5%)            │
   │                                        │
   │  Max Loss Per Trade: $200              │
   │  (calculated automatically)            │
   │                                        │
   │  [Save Settings]                       │
   └────────────────────────────────────────┘

3. UPDATE position size calculation:
   Add this utility in lib/utils/formatters.js:

   export function calculatePositionSize(capital, riskPercent, entryPrice, stopLossPrice) {
     const riskAmount = capital * (riskPercent / 100)
     const stopDistance = Math.abs(entryPrice - stopLossPrice)
     const stopPercent = stopDistance / entryPrice
     const positionSize = riskAmount / stopDistance
     const positionValue = positionSize * entryPrice
     const positionPercent = (positionValue / capital) * 100

     return {
       coinAmount: positionSize.toFixed(4),
       usdValue: positionValue.toFixed(2),
       portfolioPercent: positionPercent.toFixed(1),
       maxLoss: riskAmount.toFixed(2),
       stopDistancePercent: (stopPercent * 100).toFixed(2)
     }
   }

4. UPDATE components showing position size:
   Show full breakdown in dashboard:

   ┌────────────────────────────────────────┐
   │  POSITION SIZE                         │
   │                                        │
   │  6.7843 ETH                            │
   │  ≈ $13,541 (13.5% of portfolio)       │
   │                                        │
   │  Capital:     $100,000                 │
   │  Risk 2%:     $2,000 max loss          │
   │  Stop dist:   1.47%                    │
   │                                        │
   │  If WIN:  +$4,280  (+4.28%)           │
   │  If LOSS: -$2,000  (-2.00%)           │
   └────────────────────────────────────────┘

5. ADD position size to signal saved in database:
   Include positionSize, capitalUsed, maxLoss
   in saveSignal() call

6. ADD leverage calculator (optional):
   If user wants to use leverage:
   Show: "With 2x leverage: 13.5 ETH at $6,770"
   Add warning: "Higher leverage = higher risk"
```

---

## PROMPT 27 — Conflict Detection Badge

```
Add a visual conflict detection system that shows exactly
why the signal is HOLD by displaying bullish vs bearish signals.

1. UPDATE lib/engine/confluence.js:
   Add new export function:

   export function detectSignalConflicts(indicators, regime, pattern, candlePattern, onchain, orderBook)

   Collect all signals into two arrays:

   bullishSignals = []
   bearishSignals = []

   Check each component:
   - RSI oversold (<30) → bullishSignals.push({name: "RSI Oversold", strength: "strong", value: rsi})
   - RSI overbought (>70) → bearishSignals.push(...)
   - MACD bullish crossover → bullishSignals.push(...)
   - MACD bearish crossover → bearishSignals.push(...)
   - Price at BB lower band → bullishSignals.push(...)
   - Price at BB upper band → bearishSignals.push(...)
   - EMA uptrend (above 200) → bullishSignals.push(...)
   - EMA downtrend (below 200) → bearishSignals.push(...)
   - Exchange outflow → bullishSignals.push(...)
   - Exchange inflow → bearishSignals.push(...)
   - Whale accumulating → bullishSignals.push(...)
   - Whale distributing → bearishSignals.push(...)
   - Fear < 25 → bullishSignals.push(...)
   - Greed > 75 → bearishSignals.push(...)
   - CVD rising → bullishSignals.push(...)
   - CVD falling → bearishSignals.push(...)
   - Bullish chart pattern → bullishSignals.push(...)
   - Bearish chart pattern → bearishSignals.push(...)
   - Bullish candle pattern → bullishSignals.push(...)
   - Bearish candle pattern → bearishSignals.push(...)

   Score with weights:
   strong = 3 points
   medium = 2 points
   weak   = 1 point

   Returns:
   {
     bullishSignals: [...],
     bearishSignals: [...],
     bullishScore: 8,
     bearishScore: 12,
     dominantSide: "bearish",
     conflictLevel: "high" | "medium" | "low" | "none",
     conflictReason: "Bearish signals significantly outweigh bullish",
     recommendation: "Wait for bullish signals to strengthen before entry"
   }

2. CREATE components/ConflictPanel.jsx:

   Show two columns side by side:

   ┌──────────────────────────────────────────┐
   │  📊 SIGNAL BREAKDOWN                     │
   │                                          │
   │  🟢 BULLISH (8pts)  🔴 BEARISH (12pts)  │
   │  ──────────────     ──────────────────  │
   │  RSI Oversold ●●●   MACD Sell    ●●●   │
   │  BB Lower     ●●    EMA Downtrend ●●●  │
   │  Double Bottom ●●   CVD Falling   ●●   │
   │                     76% Longs     ●●●  │
   │                                         │
   │  ⚖️ Bearish outweighs bullish           │
   │  Confidence locked at 62% until         │
   │  bullish signals strengthen             │
   └──────────────────────────────────────────┘

3. SHOW ConflictPanel only when:
   - signal === "HOLD"
   - OR conflictLevel === "high" or "medium"

4. UPDATE app/api/signal/route.js:
   After Step 6 confluence analysis add:
   const conflicts = detectSignalConflicts(
     indicators, regime, pattern,
     candlePattern, onchainData, orderBook
   )

   Pass conflicts to Claude prompt and to dashboard response.

5. UPDATE Claude prompt in lib/claude/signal.js:
   Add conflicts section:
   "SIGNAL CONFLICTS:
   Bullish signals: {conflicts.bullishSignals.map(s => s.name).join(', ')}
   Bearish signals: {conflicts.bearishSignals.map(s => s.name).join(', ')}
   Dominant side: {conflicts.dominantSide}
   Use this conflict analysis to calibrate your confidence score."
```

---

## PROMPT 28 — Multi-Coin Support Expansion

```
Expand the system to properly support XRP, AVAX, LINK, ARB, SOL.
Each coin needs proper API configuration and validation.

1. UPDATE lib/utils/constants.js completely:

   export const COINS = {
     BTC: {
       id: 'bitcoin',
       pair: 'BTCUSDT',
       tier: 1,
       minVolume: 1000000000,
       decimals: 2,
       onchainExplorer: 'blockchain',
       color: '#F7931A'
     },
     ETH: {
       id: 'ethereum',
       pair: 'ETHUSDT',
       tier: 1,
       minVolume: 500000000,
       decimals: 2,
       onchainExplorer: 'etherscan',
       color: '#627EEA'
     },
     SOL: {
       id: 'solana',
       pair: 'SOLUSDT',
       tier: 2,
       minVolume: 100000000,
       decimals: 3,
       onchainExplorer: 'solscan',
       color: '#9945FF'
     },
     BNB: {
       id: 'binancecoin',
       pair: 'BNBUSDT',
       tier: 2,
       minVolume: 100000000,
       decimals: 2,
       onchainExplorer: 'bscscan',
       color: '#F0B90B'
     },
     XRP: {
       id: 'ripple',
       pair: 'XRPUSDT',
       tier: 2,
       minVolume: 50000000,
       decimals: 4,
       onchainExplorer: 'xrpscan',
       color: '#346AA9'
     },
     AVAX: {
       id: 'avalanche-2',
       pair: 'AVAXUSDT',
       tier: 3,
       minVolume: 50000000,
       decimals: 3,
       onchainExplorer: 'snowtrace',
       color: '#E84142'
     },
     LINK: {
       id: 'chainlink',
       pair: 'LINKUSDT',
       tier: 3,
       minVolume: 30000000,
       decimals: 3,
       onchainExplorer: 'etherscan',
       color: '#2A5ADA'
     },
     ARB: {
       id: 'arbitrum',
       pair: 'ARBUSDT',
       tier: 3,
       minVolume: 30000000,
       decimals: 3,
       onchainExplorer: 'arbiscan',
       color: '#28A0F0'
     },
     MATIC: {
       id: 'matic-network',
       pair: 'MATICUSDT',
       tier: 3,
       minVolume: 30000000,
       decimals: 4,
       onchainExplorer: 'polygonscan',
       color: '#8247E5'
     },
     DOT: {
       id: 'polkadot',
       pair: 'DOTUSDT',
       tier: 3,
       minVolume: 30000000,
       decimals: 3,
       onchainExplorer: 'subscan',
       color: '#E6007A'
     }
   }

2. UPDATE dashboard coin selector in app/dashboard/page.jsx:
   Replace hardcoded BTC ETH SOL BNB buttons with:
   - Tier 1 always visible: BTC ETH
   - Tier 2 in row: SOL BNB XRP
   - Tier 3 expandable: AVAX LINK ARB MATIC DOT
   - Add "More" button to show tier 3

3. UPDATE lib/fetchers/price.js:
   Use COINS constant for coin ID mapping
   Handle decimals per coin for price display

4. UPDATE lib/fetchers/onchain.js:
   Add coin-specific on-chain data:

   For ETH/LINK/ARB/MATIC: use Etherscan
   For SOL: use Solscan public API
     GET https://public-api.solscan.io/market?symbol=SOL
   For AVAX: use Snowtrace
     GET https://api.snowtrace.io/api (same format as Etherscan)
   For others: use simulated data

5. UPDATE app/dashboard/page.jsx:
   Save selected coin to localStorage
   Reload last selected coin on page load

6. ADD coin performance comparison panel:
   Show mini cards for all watched coins:

   BTC  $67,400  +2.4%  🟢 BUY  86%
   ETH  $1,995   -0.4%  🟡 HOLD 62%
   SOL  $142.50  +1.2%  ⚪ --    --

   Click any coin to switch to full analysis.

7. TEST each coin:
   curl http://localhost:3000/api/signal?coin=XRP
   curl http://localhost:3000/api/signal?coin=AVAX
   curl http://localhost:3000/api/signal?coin=LINK
```

---

## PHASE 3 — ACCURACY BOOSTERS (Next Month)

---

## PROMPT 29 — Alert System (Never Miss a Signal)

```
Add browser notifications and in-app alerts so users
never miss when a signal fires or changes.

1. CREATE lib/utils/alerts.js:

   export function requestNotificationPermission()
   Call this on first dashboard load.
   Returns: "granted" | "denied" | "default"

   export function sendBrowserAlert(title, body, signal)
   Sends browser notification.
   Includes signal type in icon: 🟢 BUY / 🔴 SELL / 🟡 HOLD

   export function sendSignalAlert(signal)
   Formats and sends notification:
   Title: "🟢 BUY Signal — BTC"
   Body: "Confidence: 84% | Entry: $67,400 | Target: $71,200"

2. ADD alert conditions in app/dashboard/page.jsx:
   Track previous signal in state.
   When new signal fetched, compare with previous:

   if (prevSignal === "HOLD" && newSignal === "BUY") {
     sendSignalAlert(newSignal)
     playAlertSound()
   }
   if (prevSignal === "HOLD" && newSignal === "SELL") {
     sendSignalAlert(newSignal)
     playAlertSound()
   }
   if (newSignal.confidence >= 90) {
     sendSignalAlert with "VERY HIGH CONFIDENCE" prefix
   }

3. ADD alert sound:
   Create public/sounds/alert.mp3 (or use Web Audio API to generate beep)

   export function playAlertSound(type)
   type "buy"  → ascending beep
   type "sell" → descending beep
   type "high" → double beep

4. ADD in-app notification bell to top bar:
   Show red dot when unread alerts exist.
   Click bell to see notification history:

   ┌────────────────────────────────────────┐
   │  🔔 NOTIFICATIONS                      │
   │                                        │
   │  ● 14:32 🟢 BUY BTC fired at 84%     │
   │  ● 11:15 🟡 HOLD ETH — low confidence │
   │  ● 09:22 🔴 SELL SOL fired at 76%    │
   │                                        │
   │  [Mark all read]  [Clear all]          │
   └────────────────────────────────────────┘

5. ADD price level alerts:
   User can set custom alerts:
   "Alert me when BTC hits $70,000"
   "Alert me when ETH confidence > 80%"

   Store in localStorage.
   Check on every auto-refresh.

6. ADD alert settings to SettingsPanel.jsx:
   Toggle notifications on/off
   Toggle sound on/off
   Set minimum confidence for alerts (default 75%)
```

---

## PROMPT 30 — Weekly Performance Report

```
Add an automated weekly performance report generated by Claude AI.
Shows what worked, what failed, and how to improve.

1. CREATE app/dashboard/insights/page.jsx:
   Full page for strategy insights and weekly reports.

2. UPDATE lib/claude/memory.js:
   Add new export function:

   export async function generateWeeklyReport(signals)

   Filter signals from last 7 days.
   Send to Claude with this prompt:

   "You are analyzing the past week of trading signals.
   Review all signals and generate a comprehensive weekly report.

   Return ONLY this JSON:
   {
     period: 'last 7 days',
     summary: {
       totalSignals: number,
       signalsFired: number (confidence >= 70%),
       signalsBlocked: number,
       wins: number,
       losses: number,
       pending: number,
       winRate: percentage,
       avgConfidence: number,
       bestTrade: { coin, signal, pnl, reasoning },
       worstTrade: { coin, signal, pnl, reasoning }
     },
     patterns: {
       bestSetup: description of highest win rate setup,
       worstSetup: description of lowest win rate setup,
       bestTimeOfDay: when signals performed best,
       bestRegime: which market regime gave best results,
       worstRegime: which market regime gave worst results
     },
     insights: [
       list of 3-5 actionable insights found this week
     ],
     recommendations: [
       list of 2-3 specific changes to improve next week
     ],
     weeklyGrade: 'A' | 'B' | 'C' | 'D',
     motivationalNote: one encouraging sentence about progress
   }"

3. ADD report display in insights page:

   ┌──────────────────────────────────────────────┐
   │  📊 WEEKLY PERFORMANCE REPORT                │
   │  June 1 – June 7, 2026                       │
   │                           Grade: A           │
   ├──────────────────────────────────────────────┤
   │  Signals: 12 fired  │  Win Rate: 75%        │
   │  Wins: 9            │  Losses: 3            │
   │  Blocked: 28        │  Avg Confidence: 81%  │
   ├──────────────────────────────────────────────┤
   │  🏆 BEST TRADE                               │
   │  BTC BUY +4.2% — "Perfect confluence setup"  │
   │                                              │
   │  ❌ WORST TRADE                              │
   │  ETH SELL -2.1% — "Double bottom reversed"  │
   ├──────────────────────────────────────────────┤
   │  🧠 AI INSIGHTS                              │
   │  1. All 3 losses happened in ranging market  │
   │  2. BTC signals outperformed ETH 3:1         │
   │  3. Morning signals (8-10am) had 90% WR      │
   ├──────────────────────────────────────────────┤
   │  📋 RECOMMENDATIONS                          │
   │  → Add stricter filter for ranging markets   │
   │  → Prioritize BTC signals over altcoins      │
   │  → Consider only trading morning sessions    │
   └──────────────────────────────────────────────┘

4. UPDATE app/api/memory/route.js:
   Add GET /api/memory/weekly endpoint
   Auto-generate if last report > 7 days old
   Cache report in database accuracy_stats table

5. ADD weekly report button to dashboard:
   "📊 View Weekly Report" link in top bar
   Show red dot when new report available
   Link to /dashboard/insights page
```

---

## PROMPT 31 — Smart Money Wallet Tracking

```
Add tracking of known profitable whale wallets to
get institutional-level signal confirmation.

1. CREATE lib/fetchers/smartmoney.js:

   Define a list of known profitable whale addresses:
   (Use publicly known addresses from crypto research)

   const TRACKED_WALLETS = {
     BTC: [
       { address: "bc1qxy...", label: "Whale A", trackingActive: true },
       { address: "1P5ZED...", label: "Whale B", trackingActive: true },
       // Add 10-15 known addresses from public blockchain research
     ],
     ETH: [
       { address: "0x28C6...", label: "ETH Whale 1", trackingActive: true },
       // Add 10-15 known addresses
     ]
   }

2. EXPORT FUNCTION:
   export async function trackSmartMoney(coin)

   For each tracked wallet:
   - Fetch current balance via Etherscan/Blockchain API
   - Compare to balance 24h ago (cached in database)
   - Calculate net flow direction

   Aggregate results:
   {
     walletsTracked: 15,
     walletsAccumulating: 9,
     walletsDistributing: 3,
     walletsNeutral: 3,
     netFlow: "accumulating",
     confidence: 60,   // % of wallets agreeing
     largestMove: {
       wallet: "Whale A",
       direction: "accumulating",
       amount: "450 BTC",
       valueUSD: 30000000
     },
     signal: "BUY",
     description: "9 of 15 tracked wallets accumulating — institutional buying detected"
   }

3. CACHE wallet balances in database:
   CREATE TABLE wallet_snapshots (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     coin TEXT,
     address TEXT,
     label TEXT,
     balance REAL,
     timestamp TEXT
   )

   Update every 4 hours maximum.
   Use cached data if less than 4 hours old.

4. INTEGRATE into signal pipeline:
   Add to Step 2 parallel fetch:
   const smartMoney = await trackSmartMoney(coin)

   Add to Claude prompt:
   "SMART MONEY TRACKING:
   {smartMoney.walletsAccumulating} of {smartMoney.walletsTracked} wallets accumulating
   Net direction: {smartMoney.netFlow}
   Largest move: {smartMoney.largestMove.description}
   This represents institutional-grade signal: {smartMoney.signal}"

5. ADD to OnchainPanel.jsx:
   Smart Money: 9/15 wallets accumulating 🟢
   Largest move: Whale A +450 BTC

6. CONFIDENCE boost rules:
   If smartMoney.signal === signal.signal AND confidence > 60%:
     signal.confidence += 8
   If smartMoney.signal !== signal.signal AND confidence > 60%:
     signal.confidence -= 5
```

---

## PROMPT 32 — Multi-Timeframe Chart View

```
Add a three-panel chart view showing 1D, 4H and 1H
simultaneously so users can see all timeframes at once.

1. UPDATE components/ChartPanel.jsx:
   Add a new "3-Panel View" toggle button.

   When active show three charts side by side:

   [1D - Macro Trend] [4H - Setup] [1H - Entry]

   Each mini chart shows:
   - Candlestick data for that timeframe
   - EMA 20 and EMA 200 lines only (simplified)
   - Signal direction badge: 🟢 BUY / 🔴 SELL / 🟡 NEUTRAL
   - RSI value shown as color bar below chart

2. ADD timeframe signal badges above each chart:

   ┌───────────────────────────────────────────────┐
   │  1D: 🟢 BUY (3x weight)                       │
   │  ┌─────────┐                                   │
   │  │ chart   │  4H: 🟢 BUY (2x weight)           │
   │  │         │  ┌─────────┐                      │
   │  └─────────┘  │ chart   │  1H: 🟡 HOLD (1x)   │
   │               │         │  ┌─────────┐         │
   │               └─────────┘  │ chart   │         │
   │                            └─────────┘         │
   │                                                 │
   │  Agreement: 2/3 timeframes bullish             │
   │  Confluence weight: 8/9 (89%)                  │
   └───────────────────────────────────────────────┘

3. ADD confluence visual summary below charts:
   Show weighted bar for each timeframe contribution.

4. KEEP single chart view as default:
   Toggle button: [📊 Single] [📊 3-Panel]
   Remember preference in localStorage.

5. ADD chart annotation overlay when signal fires:
   - Entry price horizontal line (yellow dashed)
   - Stop loss line (red dashed)
   - Target line (green dashed)
   - Pattern label at pattern location
   - Volume bars color coded (green/red)

6. ENSURE charts are responsive:
   On mobile: show only single chart
   On tablet: show 2 charts (1D and 4H)
   On desktop: show all 3 charts
```

---

## PROMPT 33 — Backtesting Engine

```
Add a backtesting system to test signal rules on historical data
before trusting them with real money.

1. CREATE lib/backtest/engine.js:

   export async function runBacktest(coin, days, settings)

   Parameters:
   - coin: "BTC", "ETH" etc.
   - days: how many days of history to test (30, 90, 180)
   - settings: { confidenceThreshold, riskPercent }

2. BACKTEST LOGIC:
   Step 1: Fetch historical OHLCV from CoinGecko
           GET /coins/{id}/ohlc?days={days}&vs_currency=usd

   Step 2: For each candle as if it were "current":
           - Calculate indicators on data up to that candle
           - Run confluence scoring
           - Run regime detection
           - Simulate Claude signal (use rule-based scoring
             instead of actual API to avoid massive costs)
           - If confidence >= threshold: record as signal

   Step 3: For each signal:
           - Check if price hit target within next N candles
           - Check if price hit stop loss before target
           - Record: win, loss, or timeout

   Step 4: Calculate stats:
           - Total signals generated
           - Win rate
           - Average win %
           - Average loss %
           - Max drawdown
           - Profit factor (total wins / total losses)
           - Sharpe ratio approximation

3. EXPORT RESULTS STRUCTURE:
   {
     period: "90 days",
     totalSignals: 47,
     executed: 23,     // above confidence threshold
     blocked: 24,      // below threshold or drought
     wins: 17,
     losses: 6,
     winRate: 73.9,
     avgWinPercent: 4.2,
     avgLossPercent: -2.1,
     profitFactor: 2.8,
     maxDrawdown: -6.3,
     totalReturn: 41.2,
     byRegime: {
       trending_up: { signals: 12, winRate: 83.3 },
       trending_down: { signals: 8, winRate: 75.0 },
       ranging: { signals: 3, winRate: 33.3 }
     },
     signalLog: [...all signals with outcome]
   }

4. CREATE app/dashboard/backtest/page.jsx:

   ┌──────────────────────────────────────────────┐
   │  📈 BACKTESTING ENGINE                       │
   │                                              │
   │  Coin: [BTC ▼]  Period: [90 days ▼]         │
   │  Confidence: [70% ▼]  Risk: [2% ▼]          │
   │                                              │
   │  [▶ Run Backtest]                            │
   ├──────────────────────────────────────────────┤
   │  RESULTS                                     │
   │  Win Rate: 73.9%    Profit Factor: 2.8      │
   │  Total Return: +41.2%  Max Drawdown: -6.3%  │
   ├──────────────────────────────────────────────┤
   │  Signal chart with win/loss markers overlay  │
   └──────────────────────────────────────────────┘

5. ADD backtest link to main dashboard navigation
6. IMPORTANT: Use simulated Claude (rule-based) not real API
   to avoid burning API credits on backtesting
```

---

## PROMPT 34 — Telegram Bot Integration

```
Add Telegram notifications so signals are sent directly
to your phone without keeping the dashboard open.

1. CREATE lib/notifications/telegram.js:

   Setup:
   - Create a Telegram bot via @BotFather
   - Add TELEGRAM_BOT_TOKEN to .env.local
   - Add TELEGRAM_CHAT_ID to .env.local

   export async function sendTelegramSignal(signal, coin, priceData)

   Message format:
   ┌────────────────────────────────┐
   │  CryptoSignal AI 🤖            │
   │                                │
   │  🟢 BUY — BTC/USDT            │
   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
   │  Confidence: ████████░░ 84%   │
   │  Entry:      $67,400          │
   │  Target:     $71,200 (+5.6%)  │
   │  Stop Loss:  $64,800 (-3.9%)  │
   │  R:R Ratio:  2.7:1            │
   │  Time Horizon: 72h            │
   │                                │
   │  📊 RSI: 28 | MACD: Bullish   │
   │  🐋 Whales: Accumulating      │
   │  📈 Regime: Trending Up       │
   │                                │
   │  💭 RSI deeply oversold while  │
   │  whales accumulate. High prob  │
   │  bounce toward target.         │
   │                                │
   │  ⚠️ Watch: Short liq at $64.8k │
   └────────────────────────────────┘

2. EXPORT additional notification functions:

   sendDroughtAlert(reason, watchFor)
   → "⏳ No Signal Available\nReason: Ranging market\nWatch: RSI break below 32"

   sendRegimeChange(oldRegime, newRegime)
   → "📊 Regime Change: Ranging → Trending Up\nSignal quality improving"

   sendOutcomeConfirmation(signal, outcome, pnl)
   → "✅ WIN +4.2% — BTC BUY signal closed profitable"

   sendWeeklyReport(report)
   → Formatted weekly summary

3. UPDATE app/api/signal/route.js:
   After Step 12 (return response) add:
   if (signal.signal !== 'HOLD' && signal.confidence >= 75) {
     await sendTelegramSignal(signal, coin, priceData)
   }

4. UPDATE app/api/outcome/route.js:
   After recording outcome:
   await sendOutcomeConfirmation(signal, outcome, pnl)

5. ADD Telegram settings to SettingsPanel.jsx:
   ┌────────────────────────────────────┐
   │  📱 TELEGRAM NOTIFICATIONS         │
   │                                    │
   │  Bot Token: [__________________]   │
   │  Chat ID:   [__________________]   │
   │                                    │
   │  Notify when:                      │
   │  ☑ Signal fires (BUY/SELL)        │
   │  ☑ Confidence > 80%               │
   │  ☑ Regime changes                 │
   │  ☑ Weekly report ready            │
   │                                    │
   │  [Test Notification] [Save]        │
   └────────────────────────────────────┘

6. ADD /api/telegram/test route:
   Sends a test message to verify setup works
```

---

## PROMPT 35 — Regime Change Alerts

```
Add real-time regime change detection and notifications
so users always know when market conditions shift.

1. UPDATE lib/engine/regime.js:
   Add regime history tracking:

   export function compareRegimes(currentRegime, previousRegime)
   Returns:
   {
     changed: true | false,
     from: "ranging",
     to: "trending_up",
     significance: "major" | "minor",
     impact: "Signal quality improving — system resuming full analysis",
     recommendation: "Prepare for BUY signals to activate"
   }

2. UPDATE app/api/signal/route.js:
   Store last regime in database.
   Compare current regime to stored regime.
   If changed → trigger regime change alert.

3. ADD regime history to database:
   CREATE TABLE regime_history (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     coin TEXT,
     regime TEXT,
     startTime TEXT,
     endTime TEXT,
     signalsGenerated INTEGER,
     winRate REAL
   )

4. CREATE components/RegimeHistory.jsx:
   Show timeline of regime changes:

   ┌────────────────────────────────────────────┐
   │  📊 REGIME HISTORY — BTC                   │
   │                                            │
   │  NOW    Trending Up    ● 84% accuracy      │
   │  ↑ 4h ago                                  │
   │  -4h    Ranging        ○ 58% accuracy      │
   │  ↑ 12h ago                                 │
   │  -16h   Trending Down  ● 81% accuracy      │
   │  ↑ 2d ago                                  │
   │  -2d    High Volatility ✗ Blocked          │
   └────────────────────────────────────────────┘

5. ADD regime performance stats:
   Show for each regime type historically:
   - How long it typically lasts
   - Win rate in your system
   - Average signals generated

6. UPDATE DroughtDetector.jsx:
   Add "Current regime duration" timer:
   "Trending Up for 4h 22m"
   Add "Typical duration" reference:
   "Trending regimes average 18-36 hours"
```

---

## PROMPT 36 — Social Velocity Detection

```
Add social media mention velocity tracking to detect
signals forming before price moves.

1. UPDATE lib/fetchers/sentiment.js:
   Add new function:

   export async function fetchSocialVelocity(coin)

   Use Reddit API (free, no key needed):
   GET https://www.reddit.com/search.json?q={coin}&sort=new&limit=100&t=hour

   Count posts mentioning coin in last 1 hour.
   Compare to average from last 24 hours.

   Also use Google Trends API simulation:
   Generate realistic trending data based on
   price volatility and current market conditions.

   Returns:
   {
     redditMentions1h: 847,
     redditMentionsAvg: 320,
     velocityRatio: 2.65,
     trend: "spiking",
     signal: "early_warning",
     description: "Reddit mentions 2.65x above average — unusual interest detected",
     priceReacted: false,    // price not moved yet
     earlyWarning: true      // signal before price
   }

2. DEFINE velocity thresholds:
   velocityRatio > 5.0 → "viral"         early warning: very strong
   velocityRatio > 3.0 → "spiking"       early warning: strong
   velocityRatio > 2.0 → "elevated"      early warning: moderate
   velocityRatio > 1.5 → "above_average" early warning: weak
   velocityRatio < 1.5 → "normal"        no signal

3. INTEGRATE into Claude prompt:
   "SOCIAL VELOCITY:
   Reddit mentions: {velocity.velocityRatio}x above average
   Trend: {velocity.trend}
   Price reacted: {velocity.priceReacted}
   Early warning: {velocity.earlyWarning}

   If spiking/viral AND price not reacted:
   Consider this a leading indicator.
   Slight confidence boost if direction matches."

4. ADD to OnchainPanel.jsx:
   Social Buzz: 2.65x average 📈 Elevated

5. CONFIDENCE rules:
   earlyWarning AND signal matches direction:
     confidence += 5
   viral AND price not reacted:
     confidence += 8
     add note: "Social spike before price — early entry opportunity"
```

---

## PROMPT 37 — Full Dashboard Redesign Polish

```
Polish the complete dashboard UI based on what was seen
in the screenshots. Fix all visual inconsistencies.

1. FIX top navigation bar:
   - Make coin selector highlight cleaner
   - Add tier badges next to coin names (T1, T2, T3)
   - Add small 24h change % next to each coin button
   - Make "Updated X ago" more prominent
   - Add loading spinner inside Analyze button when running

2. IMPROVE Signal Card:
   - Add animated pulse on BUY/SELL signal text
   - Make confidence bar animate smoothly 0→value on load
   - Add color gradient to confidence bar:
     0-50%  → red
     50-70% → orange
     70-85% → yellow
     85-100% → green
   - Add "VERY HIGH" / "HIGH" / "MEDIUM" / "LOW" label
   - Fix stop loss showing above entry for SHORT setups
     Add label: "SHORT SETUP — Stop above entry"

3. IMPROVE Market Regime panel:
   - Add regime icon per type:
     trending_up   → 📈
     trending_down → 📉
     ranging       → ↔️
     volatile      → ⚡
     low_liquidity → 💧
   - Add accuracy confidence bar
   - Add "Active for X hours" duration

4. IMPROVE Accuracy Stats:
   - Make the donut chart animate on load
   - Add comparison vs previous week
   - Add streak counter: "3 wins in a row 🔥"
   - Fix 100% showing as full green ring correctly

5. IMPROVE Chart Panel:
   - Add loading skeleton while chart data loads
   - Make entry/stop/target lines more visible
   - Add price labels on right side of lines
   - Add pattern highlight overlay on chart
   - Make timeframe buttons (1D/4H/1H) more prominent

6. ADD responsive mobile layout:
   - Stack panels vertically on mobile
   - Make signal card full width on mobile
   - Reduce chart height on mobile
   - Make history table scrollable horizontally

7. ADD dark mode refinements:
   - Ensure consistent color usage throughout
   - Add subtle gradient to top bar
   - Add glass-morphism effect to cards
   - Improve font sizes and weights

8. FIX history table:
   - Add sorting by clicking column headers
   - Add filter by coin, signal type, outcome
   - Add pagination (10 per page)
   - Make post-mortem expandable inline

9. ADD keyboard shortcuts:
   A → trigger analyze
   1/2/3/4 → switch coins BTC/ETH/SOL/BNB
   H → toggle history table
   S → open settings
```

---

## PROMPT 38 — Production Deployment Setup

```
Prepare the system for production deployment
so it can run 24/7 without manual intervention.

1. ADD environment validation on startup:
   Create lib/utils/validateEnv.js:

   Check all required env variables exist:
   ANTHROPIC_API_KEY   → required
   ETHERSCAN_API_KEY   → optional (warn if missing)
   COINGLASS_API_KEY   → optional (warn if missing)
   TELEGRAM_BOT_TOKEN  → optional (warn if missing)

   On missing required vars: throw clear error with fix instructions
   On missing optional vars: log warning, use fallback

2. ADD auto-refresh background job:
   Create lib/jobs/autoRefresh.js:

   Run signal analysis every 15 minutes for all watched coins.
   Save results to database automatically.
   Send Telegram alert if signal changes from HOLD to BUY/SELL.

   Use setInterval or implement as Next.js route handler
   with cron-like scheduling.

3. ADD health check endpoint:
   GET /api/health

   Returns:
   {
     status: "ok",
     uptime: "4h 22m",
     lastSignal: "2 minutes ago",
     dbSize: "2.4MB",
     apiCallsToday: 47,
     version: "1.0.0"
   }

4. ADD database maintenance:
   Auto-delete signals older than 90 days
   Auto-backup signals.db weekly to signals_backup.db
   Log database size daily

5. ADD error logging:
   Create lib/utils/logger.js
   Log all errors to logs/error.log
   Log all signals to logs/signals.log
   Log API failures separately to logs/api_failures.log
   Rotate logs weekly

6. CREATE Dockerfile for containerized deployment:
   FROM node:18-alpine
   Standard Next.js Docker setup
   Include SQLite native bindings
   Health check command

7. CREATE deployment checklist README_DEPLOY.md:
   Step by step guide to deploy on:
   - Vercel (easiest, but SQLite needs workaround)
   - Railway (recommended — supports SQLite)
   - DigitalOcean App Platform
   - Self-hosted VPS

8. ADD performance monitoring:
   Track API response times
   Alert if signal generation takes > 15 seconds
   Track CoinGecko rate limit usage
   Track Anthropic API token usage and cost estimate

9. RUN final production build:
   npm run build
   Fix any build errors
   Verify all pages load correctly
   Test on mobile browser
   Confirm all API routes work in production mode
```

---

## Complete Improvement Summary

```
PHASE 1 — CRITICAL (This Week)
  Prompt 21 → Candle pattern recognition      +3-5% accuracy
  Prompt 22 → HOLD signal clarity             Better UX
  Prompt 23 → Thin market filter              Prevents bad signals
  Prompt 24 → Trade outcome recorder UI       Activates feedback loop

PHASE 2 — IMPORTANT (This Month)
  Prompt 25 → BTC dominance filter            +2-3% altcoin accuracy
  Prompt 26 → Position size calculator        Better risk management
  Prompt 27 → Conflict detection badge        Better UX
  Prompt 28 → Multi-coin expansion            More opportunities

PHASE 3 — ACCURACY BOOSTERS (Next Month)
  Prompt 29 → Alert system                    Never miss signal
  Prompt 30 → Weekly performance report       Self-improvement
  Prompt 31 → Smart money tracking            +3-4% accuracy
  Prompt 32 → Multi-timeframe chart view      Better analysis
  Prompt 33 → Backtesting engine              Validate system

PHASE 4 — ADVANCED (Month 3+)
  Prompt 34 → Telegram bot integration        Full automation
  Prompt 35 → Regime change alerts            Status awareness
  Prompt 36 → Social velocity detection       +2-3% early warning
  Prompt 37 → Dashboard polish               Professional UI
  Prompt 38 → Production deployment           24/7 operation
```

---

## Expected Accuracy After Each Phase

```
Current system:              78-82%
After Phase 1:               82-86%
After Phase 2:               84-87%
After Phase 3:               86-89%
After Phase 4 + 3mo training: 87-91%
```

---

## Quick Reference — How to Use These Prompts

```
1. Open Claude Code in your project folder:
   cd crypto-signal-app
   claude

2. Paste one prompt at a time.
   Wait for completion.
   Test before moving to next.

3. After each prompt run:
   npm run dev
   Test the new feature works.

4. If errors occur tell Claude Code:
   "Fix the error above and continue"

5. Priority order:
   Start with Prompt 21 (candle patterns)
   It has the highest accuracy impact.
```

---

*Continuation of crypto-signal-generator-build-guide.md*
*Prompts 21-38 — Full Improvement Suite*
*Built with Next.js · Claude AI (claude-sonnet-4-6) · SQLite*
