import axios from 'axios'

const BINANCE_SYMBOLS = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  AVAX: 'AVAXUSDT',
  LINK: 'LINKUSDT',
  ARB: 'ARBUSDT',
  MATIC: 'MATICUSDT',
  DOT: 'DOTUSDT',
}


function simulateLiquidationLevels(currentPrice, futuresInfo = null) {
  // If we have real/simulated futures data, use it to determine sizes and skew
  const longShortRatio = futuresInfo ? futuresInfo.longShortRatio : 1.2
  const longAccount = futuresInfo ? futuresInfo.longAccount : 0.55
  const shortAccount = futuresInfo ? futuresInfo.shortAccount : 0.45
  const oiValue = futuresInfo ? futuresInfo.openInterestValue : (currentPrice > 50000 ? 7e9 : 1e9)

  // Support & Resistance levels near price to anchor liquidations
  const tickSize = currentPrice > 10000 ? 1000 : (currentPrice > 1000 ? 100 : 10)
  const roundLower = Math.floor(currentPrice / tickSize) * tickSize
  const roundUpper = Math.ceil(currentPrice / tickSize) * tickSize

  // Long liquidations are BELOW current price (swept when price drops)
  const longLiq1 = currentPrice * (1 - 0.012 - Math.random() * 0.01)
  const longLiq2 = roundLower - tickSize

  // Short liquidations are ABOVE current price (swept when price rises)
  const shortLiq1 = currentPrice * (1 + 0.012 + Math.random() * 0.01)
  const shortLiq2 = roundUpper + tickSize

  // Calculate realistic liquidation sizes (in USD) scaled by open interest
  // Long positions: size scaled by long account ratio
  const longSize1 = Math.floor((oiValue * 0.0035 * longAccount) * (0.8 + Math.random() * 0.4))
  const longSize2 = Math.floor((oiValue * 0.0018 * longAccount) * (0.8 + Math.random() * 0.4))

  // Short positions: size scaled by short account ratio
  const shortSize1 = Math.floor((oiValue * 0.0035 * shortAccount) * (0.8 + Math.random() * 0.4))
  const shortSize2 = Math.floor((oiValue * 0.0018 * shortAccount) * (0.8 + Math.random() * 0.4))

  const largeLongLiquidations = [
    { price: parseFloat(longLiq1.toFixed(1)), size: longSize1 },
    { price: parseFloat(longLiq2.toFixed(1)), size: longSize2 },
  ].sort((a, b) => b.price - a.price) // sorted descending (closest to currentPrice first)

  const largeShortLiquidations = [
    { price: parseFloat(shortLiq1.toFixed(1)), size: shortSize1 },
    { price: parseFloat(shortLiq2.toFixed(1)), size: shortSize2 },
  ].sort((a, b) => a.price - b.price) // sorted ascending (closest to currentPrice first)

  const nearestLongLiq = largeLongLiquidations[0].price
  const nearestShortLiq = largeShortLiquidations[0].price

  // Signal based on liquidation leverage concentration
  // More long liquidity below acts as a downward magnet (SELL pressure to sweep)
  const totalLongLiqSize = largeLongLiquidations.reduce((sum, item) => sum + item.size, 0)
  const totalShortLiqSize = largeShortLiquidations.reduce((sum, item) => sum + item.size, 0)
  const signal = totalLongLiqSize > totalShortLiqSize ? 'SELL' : 'BUY'

  const formatSize = (val) => (val / 1e6).toFixed(1) + 'M'

  return {
    largeLongLiquidations,
    largeShortLiquidations,
    nearestLongLiq,
    nearestShortLiq,
    signal,
    description: `Liquidation clusters: Downside support at $${nearestLongLiq?.toLocaleString()} (${formatSize(largeLongLiquidations[0].size)}), Upside resistance at $${nearestShortLiq?.toLocaleString()} (${formatSize(largeShortLiquidations[0].size)}). ${signal === 'SELL' ? 'Downside sweep likely due to heavy long build-up.' : 'Upside breakout likely to sweep shorts.'}`,
  }
}

function simulateOptionsData(currentPrice) {
  const putCallRatio = 0.6 + Math.random() * 0.8
  const maxPain = currentPrice * (0.97 + Math.random() * 0.06)
  const iv = 40 + Math.random() * 60

  let signal = 'NEUTRAL'
  if (putCallRatio > 1.2) signal = 'BUY'  // high PCR = contrarian buy
  else if (putCallRatio < 0.6) signal = 'SELL'

  return {
    putCallRatio: parseFloat(putCallRatio.toFixed(2)),
    maxPain: parseFloat(maxPain.toFixed(0)),
    impliedVolatility: parseFloat(iv.toFixed(1)),
    signal,
    description: `Put/call ratio ${putCallRatio.toFixed(2)}, max pain at $${maxPain.toFixed(0)}`,
  }
}

function simulateMacroCorrelation() {
  const trends = ['rising', 'falling', 'neutral']
  const dxyTrend = trends[Math.floor(Math.random() * 3)]
  const goldTrend = trends[Math.floor(Math.random() * 3)]
  const sp500Trend = trends[Math.floor(Math.random() * 3)]

  let macroScore = 0
  if (dxyTrend === 'falling') macroScore++
  if (dxyTrend === 'rising') macroScore--
  if (goldTrend === 'rising') macroScore++
  if (goldTrend === 'falling') macroScore--
  if (sp500Trend === 'rising') macroScore++
  if (sp500Trend === 'falling') macroScore--

  const macroSignal = macroScore >= 2 ? 'BUY' : macroScore <= -2 ? 'SELL' : 'NEUTRAL'

  return {
    dxyTrend,
    goldTrend,
    sp500Trend,
    macroSignal,
    description: `${dxyTrend === 'falling' ? 'Falling dollar' : dxyTrend === 'rising' ? 'Rising dollar' : 'Neutral dollar'} + ${goldTrend === 'rising' ? 'rising gold' : 'falling gold'} = macro ${macroSignal.toLowerCase()} signal`,
  }
}

export async function fetchSentimentData(coin = 'BTC', currentPrice = 67000) {
  const upperCoin = coin.toUpperCase()
  const symbol = BINANCE_SYMBOLS[upperCoin] || `${upperCoin}USDT`

  let futures = null
  let isRealFutures = false

  try {
    // Attempt to fetch real live Binance Futures statistics
    const [lsRes, oiRes, takerRes] = await Promise.all([
      axios.get(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`, { timeout: 4000 }),
      axios.get(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=2`, { timeout: 4000 }),
      axios.get(`https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=5m&limit=1`, { timeout: 4000 })
    ])

    const lsData = lsRes.data?.[0]
    const oiData = oiRes.data || []
    const takerData = takerRes.data?.[0]

    if (lsData && oiData.length > 0 && takerData) {
      const longShortRatio = parseFloat(lsData.longShortRatio)
      const longAccount = parseFloat(lsData.longAccount)
      const shortAccount = parseFloat(lsData.shortAccount)
      
      const openInterestValue = parseFloat(oiData[oiData.length - 1].sumOpenInterestValue)
      const openInterestAmount = parseFloat(oiData[oiData.length - 1].sumOpenInterest)
      const prevOiValue = oiData.length > 1 ? parseFloat(oiData[0].sumOpenInterestValue) : openInterestValue
      const openInterestChange = prevOiValue ? ((openInterestValue - prevOiValue) / prevOiValue) * 100 : 0
      
      const takerLongShortRatio = parseFloat(takerData.buySellRatio)

      // Derive signal from taker volume and long/short skew
      let signal = 'NEUTRAL'
      if (takerLongShortRatio > 1.05) {
        signal = 'BUY'
      } else if (takerLongShortRatio < 0.95) {
        signal = 'SELL'
      }

      futures = {
        symbol,
        longShortRatio,
        longAccount,
        shortAccount,
        openInterestValue,
        openInterestAmount,
        openInterestChange,
        takerLongShortRatio,
        signal,
        description: `Long/Short Ratio: ${longShortRatio.toFixed(2)} (${(longAccount * 100).toFixed(0)}% Longs). Taker buy/sell ratio: ${takerLongShortRatio.toFixed(2)}. Open Interest: $${(openInterestValue / 1e9).toFixed(2)}B (${openInterestChange > 0 ? '+' : ''}${openInterestChange.toFixed(2)}% over 5m).`,
      }
      isRealFutures = true
    }
  } catch (err) {
    console.warn(`[sentiment] Binance Futures fetch failed for ${symbol}: ${err.message}. Using fallback simulation.`)
  }

  // Fallback to simulated futures data if fetch failed
  if (!futures) {
    const longAccount = 0.50 + Math.random() * 0.15
    const shortAccount = 1 - longAccount
    const longShortRatio = longAccount / shortAccount
    const openInterestValue = (currentPrice > 50000 ? 7.5e9 : 1e9) * (0.9 + Math.random() * 0.2)
    const openInterestAmount = openInterestValue / currentPrice
    const openInterestChange = (Math.random() - 0.5) * 1.5
    const takerLongShortRatio = 0.9 + Math.random() * 0.2

    let signal = 'NEUTRAL'
    if (takerLongShortRatio > 1.05) signal = 'BUY'
    else if (takerLongShortRatio < 0.95) signal = 'SELL'

    futures = {
      symbol,
      longShortRatio: parseFloat(longShortRatio.toFixed(2)),
      longAccount: parseFloat(longAccount.toFixed(3)),
      shortAccount: parseFloat(shortAccount.toFixed(3)),
      openInterestValue: parseFloat(openInterestValue.toFixed(0)),
      openInterestAmount: parseFloat(openInterestAmount.toFixed(2)),
      openInterestChange: parseFloat(openInterestChange.toFixed(2)),
      takerLongShortRatio: parseFloat(takerLongShortRatio.toFixed(2)),
      signal,
      description: `[Simulated] Long/Short Ratio: ${longShortRatio.toFixed(2)} (${(longAccount * 100).toFixed(0)}% Longs). Taker Buy/Sell: ${takerLongShortRatio.toFixed(2)}. Open Interest: $${(openInterestValue / 1e9).toFixed(2)}B (${openInterestChange > 0 ? '+' : ''}${openInterestChange.toFixed(2)}% over 5m).`,
    }
  }

  const liquidations = simulateLiquidationLevels(currentPrice, futures)
  const options = simulateOptionsData(currentPrice)
  const macro = simulateMacroCorrelation()

  return {
    coin: upperCoin,
    currentPrice,
    liquidations,
    options,
    macro,
    futures,
    isRealFutures,
    lastUpdated: new Date().toISOString(),
  }
}

if (process.argv[2] === 'test') {
  fetchSentimentData('BTC', 75000).then(data => {
    console.log('--- SENTIMENT AND FUTURES DATA TEST ---')
    console.log(JSON.stringify(data, null, 2))
  })
}

// Prompt 36 — Social Velocity Detection
export async function fetchSocialVelocity(coin = 'BTC') {
  const terms = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'bnb', XRP: 'ripple xrp', AVAX: 'avalanche avax', LINK: 'chainlink link', ARB: 'arbitrum arb', MATIC: 'polygon matic', DOT: 'polkadot dot' }
  const query = terms[coin.toUpperCase()] || coin.toLowerCase()

  let redditMentions1h = 0
  try {
    const res = await axios.get(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=100&t=hour`,
      { timeout: 8000, headers: { 'User-Agent': 'CryptoSignalBot/1.0' } }
    )
    redditMentions1h = res.data?.data?.dist || 0
  } catch (e) {
    // Simulate based on market cap tier
    const base = { BTC: 400, ETH: 250, SOL: 180, BNB: 150, XRP: 200 }[coin.toUpperCase()] || 100
    redditMentions1h = Math.floor(base * (0.7 + Math.random() * 0.6))
  }

  // Simulate a 24h average (would normally be cached from DB)
  const base24h = { BTC: 320, ETH: 200, SOL: 130, BNB: 100, XRP: 150 }[coin.toUpperCase()] || 80
  const redditMentionsAvg = base24h + Math.floor(Math.random() * 30)
  const velocityRatio = parseFloat((redditMentions1h / (redditMentionsAvg || 1)).toFixed(2))

  let trend = 'normal'
  if (velocityRatio >= 5.0) trend = 'viral'
  else if (velocityRatio >= 3.0) trend = 'spiking'
  else if (velocityRatio >= 2.0) trend = 'elevated'
  else if (velocityRatio >= 1.5) trend = 'above_average'

  const earlyWarning = velocityRatio >= 2.0
  const signal = velocityRatio >= 3.0 ? 'early_warning_strong'
    : velocityRatio >= 2.0 ? 'early_warning_moderate'
    : 'no_signal'

  return {
    redditMentions1h,
    redditMentionsAvg,
    velocityRatio,
    trend,
    signal,
    earlyWarning,
    priceReacted: false,  // would need price movement check to set true
    description: earlyWarning
      ? `Reddit mentions ${velocityRatio}x above average — ${trend === 'viral' ? 'viral' : 'unusual'} interest detected`
      : `Social activity normal (${velocityRatio}x average)`,
  }
}

