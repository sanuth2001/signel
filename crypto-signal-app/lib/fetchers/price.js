import axios from 'axios'

const COIN_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
}

function getMockPriceData(coin) {
  const base = { BTC: 75000, ETH: 3500, SOL: 180, BNB: 580 }[coin] || 67000
  const daily = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
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
  }
}

async function fetchWithRetry(url, retries = 1) {
  try {
    const res = await axios.get(url, { timeout: 15000 })
    return res.data
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      console.error('Rate limited, waiting 60s...')
      await new Promise(r => setTimeout(r, 60000))
      return fetchWithRetry(url, retries - 1)
    }
    throw err
  }
}

async function fetchLivePriceFromBinance(coin) {
  try {
    const symbol = {
      BTC: 'BTCUSDT',
      ETH: 'ETHUSDT',
      SOL: 'SOLUSDT',
      BNB: 'BNBUSDT',
    }[coin.toUpperCase()] || `${coin.toUpperCase()}USDT`
    const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { timeout: 4000 })
    return parseFloat(res.data?.price)
  } catch (e) {
    console.warn(`[price] Binance live price fetch failed for ${coin}: ${e.message}`)
    return null
  }
}

export async function fetchPriceData(coin = 'BTC') {
  const coinId = COIN_IDS[coin.toUpperCase()] || 'bitcoin'
  try {
    // Fetch CoinGecko chart data and live Binance price in parallel
    const [chartRaw90, chartRaw7, livePrice] = await Promise.all([
      fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=90&interval=daily`),
      fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=hourly`),
      fetchLivePriceFromBinance(coin),
    ])

    // Build daily OHLCV from price + volume arrays
    const prices90 = chartRaw90.prices || []
    const volumes90 = chartRaw90.total_volumes || []

    const daily = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }

    for (let i = 0; i < prices90.length; i++) {
      const [ts, closePrice] = prices90[i]
      const open = i > 0 ? prices90[i - 1][1] : closePrice
      const range = Math.abs(closePrice - open) * 1.5 + closePrice * 0.003
      const high = Math.max(open, closePrice) + range * Math.random()
      const low = Math.min(open, closePrice) - range * Math.random()

      daily.timestamps.push(ts)
      daily.open.push(open)
      daily.high.push(high)
      daily.low.push(Math.max(low, closePrice * 0.95)) // safety floor
      daily.close.push(closePrice)
      daily.volume.push(volumes90[i]?.[1] || closePrice * 1e6)
    }

    // Build hourly OHLCV
    const prices7 = chartRaw7.prices || []
    const volumes7 = chartRaw7.total_volumes || []
    const hourly = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }

    for (let i = 0; i < prices7.length; i++) {
      const [ts, closePrice] = prices7[i]
      const open = i > 0 ? prices7[i - 1][1] : closePrice
      const range = Math.abs(closePrice - open) * 1.5 + closePrice * 0.001
      const high = Math.max(open, closePrice) + range * Math.random()
      const low = Math.min(open, closePrice) - range * Math.random()

      hourly.timestamps.push(ts)
      hourly.open.push(open)
      hourly.high.push(high)
      hourly.low.push(Math.max(low, closePrice * 0.98))
      hourly.close.push(closePrice)
      hourly.volume.push(volumes7[i]?.[1] || closePrice * 1e5)
    }

    // Inject live price into the last element of both daily and hourly series
    let currentPrice = daily.close[daily.close.length - 1]
    if (livePrice !== null && livePrice !== undefined) {
      currentPrice = livePrice
      
      // Update last daily candle
      if (daily.close.length > 0) {
        daily.close[daily.close.length - 1] = livePrice
        if (livePrice > daily.high[daily.high.length - 1]) daily.high[daily.high.length - 1] = livePrice
        if (livePrice < daily.low[daily.low.length - 1]) daily.low[daily.low.length - 1] = livePrice
      }
      
      // Update last hourly candle
      if (hourly.close.length > 0) {
        hourly.close[hourly.close.length - 1] = livePrice
        if (livePrice > hourly.high[hourly.high.length - 1]) hourly.high[hourly.high.length - 1] = livePrice
        if (livePrice < hourly.low[hourly.low.length - 1]) hourly.low[hourly.low.length - 1] = livePrice
      }
    }

    const prevPrice = daily.close[daily.close.length - 2]
    const priceChange24h = parseFloat((((currentPrice - prevPrice) / prevPrice) * 100).toFixed(2))

    console.log(`[price] ${coin} — ${daily.close.length} daily candles, ${hourly.close.length} hourly candles | Live: $${currentPrice.toLocaleString()}`)

    return {
      coin: coin.toUpperCase(),
      currentPrice,
      priceChange24h,
      daily,
      hourly,
      lastUpdated: new Date().toISOString(),
    }
  } catch (err) {
    console.error(`fetchPriceData error for ${coin}:`, err.message)
    return getMockPriceData(coin.toUpperCase())
  }
}

export async function fetchCurrentPrice(coin = 'BTC') {
  const coinId = COIN_IDS[coin.toUpperCase()] || 'bitcoin'
  try {
    const data = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    )
    const info = data[coinId]
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
    console.log('Sample close[last]:', data.daily.close.slice(-3))
  })
}
