# CryptoSignal AI

> Professional AI-powered crypto signal generator combining Technical Analysis, On-Chain Analytics, Order Book Analysis, and Claude AI into a self-improving trading signal system.

**Target accuracy:** 78–84% in trending markets | **Stack:** Next.js 14 · Tailwind CSS · SQLite · Claude AI

---

## Quick Start

```bash
# 1. Clone and install
cd crypto-signal-app
npm install

# 2. Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env.local

# 3. Start the app
npm run dev

# 4. Open dashboard
open http://localhost:3000
```

---

## Setup

Copy `.env.example` to `.env.local` and fill in your keys:

```env
ANTHROPIC_API_KEY=your_key_here          # Required — get from https://console.anthropic.com
ETHERSCAN_API_KEY=your_key_here          # Optional — free from https://etherscan.io/apis
COINGLASS_API_KEY=your_key_here          # Optional — free tier from https://coinglass.com
NEXT_PUBLIC_APP_NAME=CryptoSignal AI
```

The app works without Etherscan/Coinglass — it uses realistic mock/simulation data as fallback.

---

## System Architecture

```
LAYER 1 — DATA SOURCES
  Price        → CoinGecko API (free, no key needed)
  On-chain     → Alternative.me + Binance Futures + Etherscan (optional)
  Order book   → Binance REST API (free, no key needed)
  Sentiment    → Coinglass (optional) + simulated options/macro

LAYER 2 — PROCESSING
  CVD          → lib/engine/cvd.js
  Indicators   → lib/engine/indicators.js (RSI, MACD, BB, EMA, Volume)
  Patterns     → lib/engine/patterns.js (Bull Flag, Double Bottom, H&S, etc.)
  Confluence   → lib/engine/confluence.js (multi-timeframe scoring)

LAYER 3 — REGIME FILTER (critical)
  Regime       → lib/engine/regime.js
  Blocks signals in ranging/volatile/low-liquidity markets

LAYER 4 — CLAUDE AI BRAIN
  Signal       → lib/claude/signal.js (claude-sonnet-4-6)
  Only fires when regime is tradeable AND confluence confidence ≥ 70%

LAYER 5 — DASHBOARD
  Main         → app/dashboard/page.jsx
  Insights     → app/dashboard/insights/page.jsx
  API Routes   → app/api/signal|history|outcome|accuracy|postmortem|memory

LAYER 6 — FEEDBACK LOOP
  Database     → lib/database/db.js (SQLite, signals.db)
  Post-mortem  → lib/claude/postmortem.js (diagrams why losses happened)
  Memory       → lib/claude/memory.js (pattern recognition across all trades)
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/signal?coin=BTC` | GET | Run full analysis pipeline, get AI signal |
| `/api/history` | GET | Last 50 signals + accuracy stats |
| `/api/outcome` | POST | Record trade outcome `{ id, outcome, closePrice }` |
| `/api/accuracy` | GET | Win rate breakdown + Claude strategy insights |
| `/api/postmortem?id=123` | GET | Get/generate post-mortem for a signal |
| `/api/memory` | GET | Full AI pattern memory analysis |

---

## How to Read Signals

### Signal Types
- **BUY** — Long opportunity detected with confidence ≥ 70%
- **SELL** — Short opportunity detected with confidence ≥ 70%
- **HOLD** — Confidence below threshold or conflicting signals
- **WAIT** — Regime blocked (ranging/volatile/low-liquidity market)

### Confidence Score
- **90%+** Very High — Strong multi-timeframe confluence
- **80–89%** High — Good setup with most indicators aligned
- **70–79%** Medium — Proceed with smaller position size
- **< 70%** — Signal automatically converted to HOLD

### Regime Filter
| Regime | Signals | Expected Win Rate |
|---|---|---|
| Trending Up | All BUY signals enabled | 82% |
| Trending Down | All SELL signals enabled | 78% |
| Ranging | Signals blocked | 55% (blocked) |
| High Volatility | Signals blocked | 45% (blocked) |
| Low Liquidity | All signals blocked | — |

---

## After Each Trade

1. Click **Win** or **Loss** on the signal in the history table
2. Enter the close price when prompted
3. For losses: Claude automatically generates a **post-mortem** explaining what went wrong
4. Visit `/dashboard/insights` to see AI-detected patterns across all trades

---

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check

# Test individual modules
node lib/fetchers/price.js test
node lib/fetchers/onchain.js test
node lib/fetchers/orderbook.js test
node lib/fetchers/sentiment.js test
node lib/engine/indicators.js test
node lib/engine/confluence.js test
node lib/engine/patterns.js test
node lib/engine/regime.js test
node lib/database/db.js test
node lib/claude/signal.js test    # Requires ANTHROPIC_API_KEY

# Test full API
curl http://localhost:3000/api/signal?coin=BTC
```

---

*Built with Next.js 14 · Tailwind CSS · Claude AI (claude-sonnet-4-6) · SQLite · lightweight-charts*
