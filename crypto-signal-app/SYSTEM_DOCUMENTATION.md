# CryptoSignal AI — Complete System Architecture & Reference Documentation

> **CryptoSignal AI** is an enterprise-grade, self-improving AI crypto trading signal system. It merges quantitative multi-timeframe Technical Analysis, On-Chain Intelligence, Order Book Depth & CVD, Funding & Open Interest dynamics, Market Regime Filtering, and Claude AI (incorporating Multimodal Vision and Post-Mortem Feedback Loops).

---

## 1. Executive Summary

CryptoSignal AI automates high-probability cryptocurrency trading setup identification and risk management. 

### Key Performance Targets & Features
- **Target Win Rate:** 78% – 84% in active trending regimes.
- **Strict Risk Management:** Mandatory Regime Filtering blocks trades during ranging, choppy, or high-volatility markets.
- **Multimodal AI Validation:** Uses Claude AI to synthesize raw technical indicators + visual chart rendering analysis via canvas screenshots.
- **Self-Improving Closed Feedback Loop:** Automatically runs post-mortem analyses on failed trades ('losses') to refine system parameters over time.
- **Full-Stack Stack:** Next.js (App Router), React, Tailwind CSS, SQLite (`better-sqlite3`), Lightweight-Charts, Anthropic AI SDK (`claude-3-7-sonnet` / `claude-3-5-sonnet`).

---

## 2. End-to-End System Architecture

The architecture consists of six strictly isolated pipeline layers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                LAYER 1 — DATA FETCHERS                                 │
│  - Price & Candles (Binance / CoinGecko)  - On-Chain Flows (Etherscan / CryptoQuant)   │
│  - Order Book & CVD (Binance REST)        - Sentiment & Macro (Alternative.me)         │
│  - Funding Rates & Open Interest          - Smart Money Wallet Tracking                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Raw Data Feeds
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            LAYER 2 — QUANT ENGINE & TA FEEDS                           │
│  - Indicators (RSI, MACD, BB, EMA, ATR)   - Pattern Detection (Double Bot, H&S, Flags)│
│  - Candlestick Formations (Engulfing, Star)- Fibonacci Retracements & Extension Levels  │
│  - Cumulative Volume Delta (CVD)          - Session Detection (Asia/London/NY)         │
│  - Multi-Timeframe Confluence Scoring     - Confirmation Filters (Sweeps/Breakouts)    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Aggregated Signal Metrics
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LAYER 3 — MARKET REGIME FILTER (GATEKEEPER)                     │
│  Evaluates market state: Trending Up | Trending Down | Ranging | Volatile | Low Liq    │
│  --> BLOCKS signals if market is Ranging, Choppy, Volatile, or Illiquid                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Tradeable Regime Confirmed
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 4 — CLAUDE AI BRAIN & VISION                             │
│  - Claude Signal Generation Prompting (JSON structured output)                         │
│  - Multimodal Vision Analysis (Lightweight-charts HTML canvas snapshot evaluation)    │
│  - Validates stop-loss, take-profit levels, risk-to-reward ratio (min 1:2 R:R)        │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ AI Decision Package
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       LAYER 5 — INTERACTIVE DASHBOARD & REST API                       │
│  - Next.js Dashboard UI (Real-time chart, Order Book, Indicators, Signal Cards)        │
│  - REST Endpoints (/api/signal, /api/history, /api/outcome, /api/accuracy, etc.)       │
│  - Notification Engine (Telegram Alerts)                                               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Trade Outcomes (Win/Loss)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 6 — SELF-IMPROVING FEEDBACK LOOP & MEMORY                   │
│  - SQLite Database (`signals.db`) tracking all historical trades                       │
│  - Automated Post-Mortem diagnostic generator on loss execution                        │
│  - AI Memory module identifying recurring traps and optimal setup characteristics     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure & Codebase Map

```
/Users/sanuth/Downloads/sys/crypto-signal-app
├── app/                        # Next.js 14+ App Router
│   ├── api/                    # Serverless API routes
│   │   ├── accuracy/           # Win-rate statistics & AI strategy summaries
│   │   ├── backtest/           # Historical strategy backtesting
│   │   ├── cron/               # Scheduled automated scanner
│   │   ├── health/             # System diagnostic check
│   │   ├── history/            # Signal history log
│   │   ├── memory/             # AI memory pattern insights
│   │   ├── outcome/            # Trade result recorder (Win/Loss/Close price)
│   │   ├── postmortem/         # AI loss diagnostic trigger & retriever
│   │   ├── price/ & prices/    # Real-time ticker data API
│   │   ├── signal/             # Main signal generation endpoint
│   │   └── telegram/           # Bot notification webhook
│   ├── dashboard/              # Frontend view pages
│   │   ├── backtest/           # Backtesting dashboard interface
│   │   ├── insights/           # Memory & post-mortem insights interface
│   │   └── page.jsx            # Core Trading Dashboard UI
│   ├── globals.css             # Base styles & Tailwind utilities
│   └── layout.js               # Dashboard layout wrapper
├── components/                 # Modular React UI Components
│   ├── AccuracyStats.jsx       # Win rate breakdown & performance key metrics
│   ├── ChartPanel.jsx          # Interactive Lightweight-Charts TradingView UI
│   ├── ConflictPanel.jsx       # Signal conflict & divergence warnings
│   ├── DivergencePanel.jsx     # RSI/MACD price divergence detector view
│   ├── DroughtDetector.jsx     # No-signal period & market regime status detector
│   ├── FibonacciPanel.jsx      # Auto-calculated Fibonacci retracement levels
│   ├── FundingPanel.jsx        # Multi-exchange funding rates view
│   ├── HistoryTable.jsx        # Signal history table with manual win/loss marking
│   ├── OnchainPanel.jsx        # Whale metrics, exchange flow & stablecoin stats
│   ├── OpenInterestPanel.jsx   # Open Interest & leverage surge monitoring
│   ├── OrderBookPanel.jsx      # Bid/Ask depth & liquidity wall visualizer
│   ├── PatternPanel.jsx        # Detected technical chart patterns list
│   ├── RegimeHistory.jsx       # Historical market regime tracker table
│   ├── RegimeIndicator.jsx     # Current market regime badge & status
│   ├── SessionPanel.jsx        # Trading session status (Asia/London/NY)
│   ├── SettingsPanel.jsx       # Risk configuration & API key management
│   ├── SignalCard.jsx          # Active signal display (Buy/Sell/Hold/Wait)
│   └── VisionPanel.jsx         # Claude Vision chart analysis inspector
├── lib/                        # Core Engine Architecture
│   ├── backtest/
│   │   └── engine.js           # Quantitative historical backtesting framework
│   ├── claude/
│   │   ├── memory.js           # AI long-term pattern memory analyzer
│   │   ├── postmortem.js       # AI loss failure analysis generator
│   │   ├── signal.js           # Main Claude AI signal generator prompt engine
│   │   └── visionAnalysis.js   # Multimodal image analysis prompt engine
│   ├── database/
│   │   └── db.js               # SQLite database client & schema manager
│   ├── engine/
│   │   ├── candlePatterns.js   # Candlestick formation recognizer
│   │   ├── confirmationFilters.js # Volume & liquidity sweep verification
│   │   ├── confluence.js       # Weighted multi-factor score calculator
│   │   ├── cvd.js              # Cumulative Volume Delta calculator
│   │   ├── fibonacci.js        # Dynamic Fibonacci swing level generator
│   │   ├── indicators.js       # RSI, MACD, BB, EMA, ATR TA algorithms
│   │   ├── patternTargets.js   # Automated Stop-Loss & Take-Profit targets
│   │   ├── patterns.js         # Technical chart pattern detector
│   │   ├── regime.js           # Market Regime Filter logic
│   │   └── sessions.js         # Institutional trading session detector
│   ├── fetchers/
│   │   ├── fundingrate.js      # Exchange funding rate scraper
│   │   ├── onchain.js          # On-chain metric collector
│   │   ├── openinterest.js     # Derivative Open Interest tracker
│   │   ├── orderbook.js        # Depth & liquidity wall fetcher
│   │   ├── price.js            # OHLCV price history aggregator
│   │   ├── sentiment.js        # Crypto Fear & Greed / Options skew
│   │   └── smartmoney.js       # Smart Money wallet tracker
│   ├── jobs/
│   │   └── autoRefresh.js      # Background scheduled task runner
│   ├── notifications/
│   │   └── telegram.js         # Telegram bot messaging engine
│   └── utils/
│       ├── alerts.js           # Audio & browser alert manager
│       ├── chartCapture.js     # HTML5 canvas snapshot utility
│       ├── constants.js        # Global configuration constants
│       ├── formatters.js       # Currency & percentage formatters
│       ├── logger.js           # Console & file logging utility
│       └── validateEnv.js      # Environment variable validator
├── public/                     # Static assets
├── scripts/                    # Maintenance & diagnostic scripts
│   ├── buildPatternDB.js       # Pattern database generator
│   └── testVision.js           # Standalone test runner for Claude Vision
├── Dockerfile                  # Container deployment specification
├── signals.db                  # Local SQLite database file
├── package.json                # Project dependencies & scripts
└── README.md                   # Project quick-start overview
```

---

## 4. Deep-Dive: Core System Modules

### 4.1 Data Fetching Layer (`lib/fetchers/`)

The fetching layer pulls real-time and historical market data. Every fetcher features **automatic fallback to realistic simulated mock data** if external APIs fail or are rate-limited.

1. **`price.js`**
   - Fetches multi-timeframe OHLCV candles (1m, 5m, 15m, 1h, 4h, 1d) from Binance REST API (`/api/v3/klines`).
   - Falls back gracefully to CoinGecko REST API if Binance is unreachable.
2. **`onchain.js`**
   - Collects whale transaction flow, exchange net inflows/outflows, and stablecoin supply ratio (SSR).
   - Integrates optional Etherscan API for real-time ERC-20 movement.
3. **`orderbook.js`**
   - Fetches top 100 bid/ask depth levels from Binance order book (`/api/v3/depth`).
   - Identifies institutional liquidity walls (large orders > 5x average depth) and bid/ask volume imbalance ratio.
4. **`sentiment.js`**
   - Scrapes Alternative.me Crypto Fear & Greed Index.
   - Summarizes derivative options skew and put/call ratios.
5. **`fundingrate.js`**
   - Fetches perpetual swap funding rates across Binance, Bybit, and OKX.
   - Calculates annualized yield and detects extreme funding imbalances (overleveraged longs/shorts).
6. **`openinterest.js`**
   - Monitors changes in aggregate Open Interest (OI) alongside price action to identify leverage expansion and potential squeeze conditions.
7. **`smartmoney.js`**
   - Tracks high-winrate smart money wallet addresses for directional bias.

---

### 4.2 Quantitative Engine & Technical Analysis (`lib/engine/`)

The quant engine processes raw candle data into actionable trading metrics:

1. **`indicators.js`**
   - **RSI (14):** Identifies overbought (>70) and oversold (<30) zones.
   - **MACD (12, 26, 9):** Signal line crossovers, histogram momentum, zero-line transitions.
   - **Bollinger Bands (20, 2):** Bandwidth expansion/squeeze, price touch signals.
   - **EMAs (9, 21, 50, 200):** Golden Cross / Death Cross detection, dynamic trend alignment.
   - **ATR (14):** Average True Range calculation for dynamic volatility-based stop-loss placement.
2. **`patterns.js` & `candlePatterns.js`**
   - Scans for classical multi-bar patterns: Bull/Bear Flags, Head & Shoulders, Double Top/Bottom, Ascending/Descending Triangles, Rectangles.
   - Scans for single/double candlestick patterns: Bullish/Bearish Engulfing, Hammer, Shooting Star, Morning/Evening Star, Doji, Marubozu, Pinbars.
3. **`fibonacci.js`**
   - Dynamically calculates swing highs and swing lows over recent $N$ candles.
   - Computes key Fibonacci retracement levels: 0.236, 0.382, 0.500, **0.618 (Golden Pocket)**, 0.650, 0.786.
   - Calculates extension targets: 1.272, 1.618, 2.618.
4. **`cvd.js` (Cumulative Volume Delta)**
   - Tracks cumulative net difference between buyer-initiated market orders and seller-initiated market orders.
   - Detects CVD-Price divergences (e.g., price rising while CVD declines = weak buyers).
5. **`regime.js` (Market Regime Filter)**
   - Classifies current market state into one of five states:
     - `TRENDING_UP`: Price > EMA50 > EMA200, positive slope.
     - `TRENDING_DOWN`: Price < EMA50 < EMA200, negative slope.
     - `RANGING`: Bollinger Bandwidth squeezed, ADX < 20, chop index high.
     - `HIGH_VOLATILITY`: ATR > 2.5x standard deviation.
     - `LOW_LIQUIDITY`: Volume < 30% of 20-day moving average.
   - **CRITICAL GATEKEEPER:** If market regime is `RANGING`, `HIGH_VOLATILITY`, or `LOW_LIQUIDITY`, all BUY/SELL signals are strictly overridden to `WAIT` or `HOLD`.
6. **`sessions.js`**
   - Determines active market session (Asia: 00:00–09:00 UTC, London: 07:00–16:00 UTC, New York: 13:00–22:00 UTC, London/NY Overlap: 13:00–16:00 UTC).
   - Identifies institutional killzones and session opening range breakouts.
7. **`confluence.js`**
   - Computes a weighted overall Confluence Score ($0-100\%$) combining:
     - Trend Alignment (25%)
     - Momentum & RSI (20%)
     - On-chain & Order Book Depth (20%)
     - Pattern & Fibonacci Confluence (20%)
     - CVD & Volume Confirmation (15%)

---

### 4.3 Claude AI Brain Integration (`lib/claude/`)

When the market regime is tradeable and Confluence Confidence is $\ge 70\%$, data is passed to Claude AI via the `@anthropic-ai/sdk`.

#### 1. Signal Generation (`lib/claude/signal.js`)
- Uses Anthropic model (e.g., `claude-3-7-sonnet` / `claude-3-5-sonnet`).
- Prompts Claude as an elite institutional quantitative trader.
- Receives structured JSON output containing:
  ```json
  {
    "signal": "BUY",
    "confidence": 86,
    "entryPrice": 64500.00,
    "target": 68200.00,
    "stopLoss": 63100.00,
    "riskRewardRatio": "2.64",
    "reasoning": "Strong confluence at 0.618 Fib retracement with bullish engulfing candle on 4H, backed by $45M exchange net outflow and positive CVD delta.",
    "risk": "Watch for upcoming FOMC rate release at 18:00 UTC."
  }
  ```

#### 2. Multimodal Vision Analysis (`lib/claude/visionAnalysis.js`)
- Captures an HTML5 canvas rendering of the interactive Lightweight-Chart (`ChartPanel.jsx`).
- Converts chart to base64 image data and sends to Claude's Vision API.
- Claude visually verifies support/resistance lines, trendline integrity, and visual price pattern setups prior to final signal emission.

#### 3. Loss Post-Mortem Engine (`lib/claude/postmortem.js`)
- When a user logs a trade outcome as a **Loss**, Claude is invoked to analyze the market context at entry vs close price.
- Identifies the root cause (e.g., "Liquidity Stop Hunt", "Sudden Macro News Spike", "Fakeout Breakout").
- Saves structured post-mortem analysis directly to SQLite.

#### 4. Pattern Memory System (`lib/claude/memory.js`)
- Analyzes all historical trade outcomes stored in the database.
- Synthesizes recurring success factors and failure patterns across different market regimes and coins, creating a self-improving memory loop.

---

## 5. Database Schema (`signals.db`)

CryptoSignal AI uses local SQLite via `better-sqlite3` with `WAL` (Write-Ahead Logging) enabled for maximum performance and durability.

### Table: `signals`
| Column Name | Type | Description |
|---|---|---|
| `id` | `INTEGER` | Primary Key (Autoincrement) |
| `coin` | `TEXT` | Asset ticker symbol (e.g., `BTC`, `ETH`, `SOL`) |
| `timestamp` | `TEXT` | ISO 8601 creation timestamp |
| `signal` | `TEXT` | Emission state: `BUY`, `SELL`, `HOLD`, `WAIT` |
| `confidence` | `INTEGER` | Confidence score percentage ($0–100\%$) |
| `reasoning` | `TEXT` | AI technical and fundamental narrative |
| `risk` | `TEXT` | Risk warning and invalidation commentary |
| `entryPrice` | `REAL` | Suggested trade entry price |
| `target` | `REAL` | Take-profit price target |
| `stopLoss` | `REAL` | Invalidation stop-loss price |
| `regime` | `TEXT` | Market regime state at signal generation |
| `confluenceScore` | `INTEGER` | Quantitative confluence score ($0–100\%$) |
| `indicators` | `TEXT` | Serialized JSON string of indicator values |
| `onchainData` | `TEXT` | Serialized JSON string of on-chain metrics |
| `divergence` | `TEXT` | Serialized JSON string of detected divergences |
| `openInterest` | `TEXT` | Serialized JSON string of OI statistics |
| `session` | `TEXT` | Active institutional trading session |
| `visionAnalysis` | `TEXT` | Serialized JSON output from Claude Vision API |
| `outcome` | `TEXT` | Status: `pending`, `win`, `loss` |
| `closePrice` | `REAL` | User-submitted or auto-detected trade close price |
| `pnlPercent` | `REAL` | Realized profit/loss percentage |
| `postMortem` | `TEXT` | Serialized JSON post-mortem diagnostic report |

### Table: `accuracy_stats`
Stores snapshot statistics over time including overall win rate, total win/loss counts, average confidence, streak length, and week-over-week performance comparisons.

### Table: `regime_history`
Tracks historical market regime transitions, duration in each regime, and win rate broken down by market state.

---

## 6. REST API Reference

All API routes are implemented inside Next.js App Router under `app/api/`.

### 1. `GET /api/signal`
Runs the entire multi-layered analysis pipeline for a target asset.
- **Query Parameters:** `coin` (default: `BTC`), `timeframe` (default: `1h`)
- **Response Example:**
  ```json
  {
    "id": 142,
    "coin": "BTC",
    "signal": "BUY",
    "confidence": 84,
    "entryPrice": 64250,
    "target": 67800,
    "stopLoss": 62900,
    "regime": "TRENDING_UP",
    "confluenceScore": 82,
    "reasoning": "Bullish breakout above 4H EMA50 with 0.618 Fib support...",
    "timestamp": "2026-08-02T18:30:00.000Z"
  }
  ```

### 2. `GET /api/history`
Returns the recent signal log and aggregate accuracy metrics.
- **Query Parameters:** `limit` (default: `50`)

### 3. `POST /api/outcome`
Logs the final result of an emitted signal.
- **Request Body:**
  ```json
  {
    "id": 142,
    "outcome": "win",
    "closePrice": 67850
  }
  ```

### 4. `GET /api/accuracy`
Returns performance breakdown, win rates by regime, signal type accuracy, and AI strategy recommendations.

### 5. `GET /api/postmortem`
Retrieves or triggers a Claude AI post-mortem diagnostic report for a specific signal ID.
- **Query Parameters:** `id` (e.g. `?id=142`)

### 6. `GET /api/memory`
Retrieves synthesized long-term trading memory and pattern recognition analysis.

### 7. `GET /api/backtest`
Executes strategy backtests across historical candle datasets.
- **Query Parameters:** `coin`, `timeframe`, `days`

---

## 7. Frontend Dashboard & User Interface

The UI is built with Next.js App Router, Tailwind CSS, and `lightweight-charts`.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ Header: Ticker Selector | Market Regime Badge | Win Rate Stats | Refresh Button ]    │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│                                           │                                            │
│   MAIN CHART PANEL (ChartPanel.jsx)       │   ACTIVE SIGNAL CARD (SignalCard.jsx)      │
│   - Interactive Candlestick Chart         │   - Signal: BUY / SELL / HOLD / WAIT       │
│   - Dynamic EMA 9/21/50/200 Overlay       │   - Confidence Score & Risk Meter          │
│   - Auto-drawn Fibonacci Golden Pocket    │   - Entry, Take-Profit, Stop-Loss Levels   │
│   - Volume & CVD Sub-charts               │   - AI Analysis Narrative                  │
│                                           │                                            │
├───────────────────────────────────────────┴────────────────────────────────────────────┤
│                                 TECHNICAL INDICATOR GRID                               │
│ [ Order Book Depth ] [ On-Chain Metrics ] [ Funding & OI ] [ Session & Patterns ]     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                   HISTORICAL LOG TABLE                                 │
│ [ Date | Coin | Signal | Confidence | Entry | TP / SL | Status | Win/Loss Buttons ]     │
└────────────────────────────────────────────────(SYSTEM_DOCUMENTATION.md)───────────────┘
```

---

## 8. Configuration & Environment Variables

Copy `.env.example` to `.env.local` inside `crypto-signal-app/`:

```env
# Required — Anthropic Claude AI API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional — Extended On-Chain ERC-20 Tracking
ETHERSCAN_API_KEY=your_etherscan_key

# Optional — Derivative Liquidation Data
COINGLASS_API_KEY=your_coinglass_key

# Optional — Telegram Signal Alerts
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# System Name
NEXT_PUBLIC_APP_NAME=CryptoSignal AI
```

---

## 9. Operating Playbook & Development Commands

### Local Development Setup
```bash
# 1. Navigate to application folder
cd crypto-signal-app

# 2. Install dependencies
npm install

# 3. Launch Next.js development server
npm run dev

# 4. Access UI in browser
open http://localhost:3000
```

### Module Verification & Test Commands
```bash
# Test Price Fetcher
node lib/fetchers/price.js test

# Test On-Chain Fetcher
node lib/fetchers/onchain.js test

# Test Order Book & CVD
node lib/fetchers/orderbook.js test

# Test Indicators & Patterns
node lib/engine/indicators.js test
node lib/engine/patterns.js test

# Test Market Regime Gatekeeper
node lib/engine/regime.js test

# Test Database Connection
node lib/database/db.js test

# Test Claude AI Signal Engine (Requires ANTHROPIC_API_KEY)
node lib/claude/signal.js test

# Run API Pipeline Test
curl http://localhost:3000/api/signal?coin=BTC
```

---

## 10. Summary

CryptoSignal AI brings institutional quantitative rigor and multi-modal AI feedback loops into a unified, self-improving crypto trading workspace. By combining data fetchers, technical indicators, regime filters, Claude AI reasoning, and automatic loss post-mortems, the system ensures high-probability setup execution with strict capital protection.
