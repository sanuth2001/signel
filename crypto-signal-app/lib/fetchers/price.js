import axios from 'axios'
import { COINS, getCoinId } from '../utils/constants.js'

// ─── Price sanity ranges per coin ────────────────────────────────────────────
const PRICE_RANGES = {
  BTC:   { min: 1_000,    max: 1_000_000 },
  ETH:   { min: 100,      max: 100_000   },
  SOL:   { min: 1,        max: 10_000    },
  BNB:   { min: 10,       max: 10_000    },
  XRP:   { min: 0.01,     max: 100       },
  AVAX:  { min: 0.5,      max: 5_000     },
  LINK:  { min: 0.1,      max: 1_000     },
  ARB:   { min: 0.01,     max: 100       },
  MATIC: { min: 0.001,    max: 100       },
  DOT:   { min: 0.1,      max: 1_000     },
}

const DEFAULT_RANGE = { min: 0.0001, max: 1_000_000 }

// ─── In-memory Map cache (5-min TTL) ─────────────────────────────────────────
const priceCache = new Map() // key → { data, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCached(coinKey) {
  const entry = priceCache.get(coinKey)
  if (!entry) return null
  return entry
}

function setCached(coinKey, data) {
  priceCache.set(coinKey, { data, timestamp: Date.now() })
}

function isFresh(entry) {
  return entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validatePriceData(data, coinKey) {
  if (!data) return false
  const { min, max } = PRICE_RANGES[coinKey] || DEFAULT_RANGE

  if (!data.currentPrice || data.currentPrice <= 0) {
    console.warn(`[price] Validation failed for ${coinKey}: currentPrice=${data.currentPrice}`)
    return false
  }
  if (data.currentPrice < min || data.currentPrice > max) {
    console.warn(`[price] Validation failed for ${coinKey}: price $${data.currentPrice} outside range [$${min}, $${max}]`)
    return false
  }
  if (!data.daily?.close || data.daily.close.length < 30) {
    console.warn(`[price] Validation failed for ${coinKey}: only ${data.daily?.close?.length ?? 0} daily candles (need ≥30)`)
    return false
  }
  return true
}

// ─── Mock data generator (last resort) ───────────────────────────────────────
function getMockPriceData(coin) {
  const base = {
    BTC: 75000, ETH: 3500, SOL: 180, BNB: 580,
    XRP: 1.30, AVAX: 35, LINK: 18, ARB: 1.10, MATIC: 0.65, DOT: 6.20,
  }[coin] || 10.0

  const daily  = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
  const hourly = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }

  let price = base * 0.85
  for (let i = 90; i >= 0; i--) {
    const ts = Date.now() - i * 86400000
    const change = (Math.random() - 0.48) * 0.03
    const o = price
    const c = price * (1 + change)
    const h = Math.max(o, c) * (1 + Math.random() * 0.01)
    const l = Math.min(o, c) * (1 - Math.random() * 0.01)
    daily.timestamps.push(ts)
    daily.open.push(o)
    daily.high.push(h)
    daily.low.push(l)
    daily.close.push(c)
    daily.volume.push(base * 1e6 * (0.5 + Math.random()))
    price = c
  }

  price = daily.close[daily.close.length - 1] * 0.97
  for (let i = 168; i >= 0; i--) {
    const ts = Date.now() - i * 3600000
    const change = (Math.random() - 0.48) * 0.008
    const o = price
    const c = price * (1 + change)
    const h = Math.max(o, c) * (1 + Math.random() * 0.003)
    const l = Math.min(o, c) * (1 - Math.random() * 0.003)
    hourly.timestamps.push(ts)
    hourly.open.push(o)
    hourly.high.push(h)
    hourly.low.push(l)
    hourly.close.push(c)
    hourly.volume.push(base * 1e5 * (0.5 + Math.random()))
    price = c
  }

  const currentPrice = price
  const change24h = ((currentPrice - daily.close[daily.close.length - 2]) / daily.close[daily.close.length - 2]) * 100

  return {
    coin,
    currentPrice,
    priceChange24h: parseFloat(change24h.toFixed(2)),
    daily,
    hourly,
    lastUpdated: new Date().toISOString(),
    isMock: true,
    isStale: false,
  }
}

// ─── Binance live price ───────────────────────────────────────────────────────
async function fetchLivePriceFromBinance(coin) {
  try {
    const symbol = `${coin.toUpperCase()}USDT`
    const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { timeout: 4000 })
    const p = parseFloat(res.data?.price)
    return isNaN(p) ? null : p
  } catch (e) {
    console.warn(`[price] Binance live price fetch failed for ${coin}: ${e.message}`)
    return null
  }
}

// ─── Merge live price into a deep-copied OHLCV dataset ───────────────────────
function mergeLivePrice(base, livePrice) {
  const daily  = JSON.parse(JSON.stringify(base.daily))
  const hourly = JSON.parse(JSON.stringify(base.hourly))

  if (daily.close.length > 0) {
    daily.close[daily.close.length - 1] = livePrice
    if (livePrice > daily.high[daily.high.length - 1]) daily.high[daily.high.length - 1] = livePrice
    if (livePrice < daily.low[daily.low.length  - 1]) daily.low[daily.low.length  - 1] = livePrice
  }
  if (hourly.close.length > 0) {
    hourly.close[hourly.close.length - 1] = livePrice
    if (livePrice > hourly.high[hourly.high.length - 1]) hourly.high[hourly.high.length - 1] = livePrice
    if (livePrice < hourly.low[hourly.low.length  - 1]) hourly.low[hourly.low.length  - 1] = livePrice
  }

  const prevPrice = daily.close[daily.close.length - 2] || livePrice
  const priceChange24h = parseFloat((((livePrice - prevPrice) / prevPrice) * 100).toFixed(2))

  return { daily, hourly, currentPrice: livePrice, priceChange24h }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function fetchPriceData(coin = 'BTC') {
  const coinKey  = coin.toUpperCase()
  const coinId   = getCoinId(coinKey)
  const coinConfig = COINS[coinKey] || COINS.BTC

  const cached = getCached(coinKey)

  // ── 1. Fresh cache hit: update live price from Binance only ──────────────
  if (isFresh(cached)) {
    console.log(`[price] Cache hit for ${coinKey}. Fetching live price from Binance…`)
    const livePrice = await fetchLivePriceFromBinance(coinKey)

    if (livePrice !== null) {
      const merged = mergeLivePrice(cached.data, livePrice)
      const result = {
        coin: coinKey,
        currentPrice: merged.currentPrice,
        priceChange24h: merged.priceChange24h,
        daily:  merged.daily,
        hourly: merged.hourly,
        lastUpdated: new Date().toISOString(),
        volumeDrought: cached.data.volumeDrought,
        volumeDroughtReason: cached.data.volumeDroughtReason,
        isStale: false,
        isMock: false,
      }
      if (validatePriceData(result, coinKey)) {
        setCached(coinKey, result)
        return result
      }
      // validation failed on fresh + live — fall through to full fetch
    } else {
      // Binance down but cache is fresh — return as-is (still fresh)
      return { ...cached.data, lastUpdated: new Date().toISOString(), isStale: false, isMock: false }
    }
  }

  // ── 2. Full fetch from CoinGecko + Binance ────────────────────────────────
  try {
    // Volume drought check
    try {
      const volRes = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true`,
        { timeout: 8000 }
      )
      const vol24h = volRes.data?.[coinId]?.usd_24h_vol || 0
      const minVol = coinConfig.minVolume || 20_000_000
      if (vol24h > 0 && vol24h < minVol) {
        console.warn(`[price] ${coinKey} 24h volume $${(vol24h / 1e6).toFixed(1)}M below minimum`)
        const droughtResult = {
          coin: coinKey,
          currentPrice: 0,
          priceChange24h: 0,
          daily:  { timestamps: [], open: [], high: [], low: [], close: [], volume: [] },
          hourly: { timestamps: [], open: [], high: [], low: [], close: [], volume: [] },
          lastUpdated: new Date().toISOString(),
          volumeDrought: true,
          volumeDroughtReason: `24h volume ($${(vol24h / 1e6).toFixed(1)}M) below minimum ($${(minVol / 1e6).toFixed(0)}M)`,
          isStale: false,
          isMock: false,
        }
        setCached(coinKey, droughtResult)
        return droughtResult
      }
    } catch (volErr) {
      console.warn('[price] Volume check failed, continuing:', volErr.message)
    }

    // Parallel chart + live price fetch
    const [chartRaw90, chartRaw7, livePrice] = await Promise.all([
      axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=90&interval=daily`, { timeout: 10000 }).then(r => r.data),
      axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=hourly`,  { timeout: 10000 }).then(r => r.data),
      fetchLivePriceFromBinance(coinKey),
    ])

    // Build daily OHLCV
    const prices90  = chartRaw90.prices        || []
    const volumes90 = chartRaw90.total_volumes || []
    const daily = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }

    for (let i = 0; i < prices90.length; i++) {
      const [ts, closePrice] = prices90[i]
      const open  = i > 0 ? prices90[i - 1][1] : closePrice
      const range = Math.abs(closePrice - open) * 1.5 + closePrice * 0.003
      daily.timestamps.push(ts)
      daily.open.push(open)
      daily.high.push(Math.max(open, closePrice) + range * Math.random())
      daily.low.push(Math.max(Math.min(open, closePrice) - range * Math.random(), closePrice * 0.95))
      daily.close.push(closePrice)
      daily.volume.push(volumes90[i]?.[1] || closePrice * 1e6)
    }

    // Build hourly OHLCV
    const prices7  = chartRaw7.prices        || []
    const volumes7 = chartRaw7.total_volumes || []
    const hourly = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }

    for (let i = 0; i < prices7.length; i++) {
      const [ts, closePrice] = prices7[i]
      const open  = i > 0 ? prices7[i - 1][1] : closePrice
      const range = Math.abs(closePrice - open) * 1.5 + closePrice * 0.001
      hourly.timestamps.push(ts)
      hourly.open.push(open)
      hourly.high.push(Math.max(open, closePrice) + range * Math.random())
      hourly.low.push(Math.max(Math.min(open, closePrice) - range * Math.random(), closePrice * 0.98))
      hourly.close.push(closePrice)
      hourly.volume.push(volumes7[i]?.[1] || closePrice * 1e5)
    }

    // Inject live price into last candle of each series
    let currentPrice = daily.close[daily.close.length - 1]
    if (livePrice !== null) {
      currentPrice = livePrice
      if (daily.close.length > 0) {
        daily.close[daily.close.length - 1] = livePrice
        if (livePrice > daily.high[daily.high.length - 1]) daily.high[daily.high.length - 1] = livePrice
        if (livePrice < daily.low[daily.low.length  - 1]) daily.low[daily.low.length  - 1] = livePrice
      }
      if (hourly.close.length > 0) {
        hourly.close[hourly.close.length - 1] = livePrice
        if (livePrice > hourly.high[hourly.high.length - 1]) hourly.high[hourly.high.length - 1] = livePrice
        if (livePrice < hourly.low[hourly.low.length  - 1]) hourly.low[hourly.low.length  - 1] = livePrice
      }
    }

    const prevPrice    = daily.close[daily.close.length - 2]
    const priceChange24h = parseFloat((((currentPrice - prevPrice) / prevPrice) * 100).toFixed(2))

    console.log(`[price] ${coinKey} — ${daily.close.length} daily, ${hourly.close.length} hourly | Live: $${currentPrice.toLocaleString()}`)

    const result = {
      coin: coinKey,
      currentPrice,
      priceChange24h,
      daily,
      hourly,
      lastUpdated: new Date().toISOString(),
      isStale: false,
      isMock: false,
    }

    // Validate before caching/returning
    if (!validatePriceData(result, coinKey)) {
      throw new Error(`Data validation failed for ${coinKey} (price=$${currentPrice}, candles=${daily.close.length})`)
    }

    setCached(coinKey, result)
    return result

  } catch (err) {
    // ── 3. Rate limit: return stale cache immediately ──────────────────────
    if (err.response?.status === 429) {
      console.warn(`[price] 429 rate limit for ${coinKey}. Returning cached data.`)
      if (cached) {
        return {
          ...cached.data,
          lastUpdated: cached.data.lastUpdated,
          isStale: true,
          isRateLimited: true,
          isMock: false,
        }
      }
    }

    console.error(`[price] fetchPriceData error for ${coinKey}:`, err.message)

    // ── 4. Stale cache as fallback ─────────────────────────────────────────
    if (cached) {
      console.warn(`[price] ${coinKey}: Using stale cache (age: ${Math.round((Date.now() - cached.timestamp) / 60000)}min)`)
      return {
        ...cached.data,
        lastUpdated: cached.data.lastUpdated,
        isStale: true,
        isMock: false,
      }
    }

    // ── 5. Mock data — last resort ─────────────────────────────────────────
    console.warn(`[price] ${coinKey}: No cache available. Returning mock data.`)
    return getMockPriceData(coinKey)
  }
}

export async function fetchCurrentPrice(coin = 'BTC') {
  const coinId = getCoinId(coin.toUpperCase())
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      { timeout: 8000 }
    )
    const info = res.data[coinId]
    return { price: info.usd, change24h: parseFloat(info.usd_24h_change?.toFixed(2) || 0) }
  } catch (err) {
    console.error(`fetchCurrentPrice error:`, err.message)
    const base = { BTC: 75000, ETH: 3500, SOL: 180, BNB: 580 }[coin.toUpperCase()] || 67000
    return { price: base, change24h: (Math.random() - 0.5) * 4 }
  }
}

if (process.argv[2] === 'test') {
  fetchPriceData('BTC').then(data => {
    console.log('Price:', data.currentPrice)
    console.log('Daily candles:', data.daily.close.length)
    console.log('Hourly candles:', data.hourly.close.length)
    console.log('Last updated:', data.lastUpdated)
    console.log('isStale:', data.isStale, 'isMock:', data.isMock)
  })
}
