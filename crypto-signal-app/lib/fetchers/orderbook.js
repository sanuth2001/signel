import axios from 'axios'

const SYMBOL_MAP = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
}

function getMockOrderBook(coin) {
  const base = { BTC: 67000, ETH: 3500, SOL: 180, BNB: 580 }[coin] || 67000
  return {
    buyWall: { price: base * 0.97, size: Math.random() * 400 + 100, strength: 'strong' },
    sellWall: { price: base * 1.03, size: Math.random() * 300 + 80, strength: 'medium' },
    bidAskRatio: 1.2 + Math.random() * 0.8,
    signal: 'BUY',
    description: `Large buy wall near ${(base * 0.97).toFixed(0)}, thin resistance above`,
  }
}

export async function fetchOrderBook(coin = 'BTC') {
  const symbol = SYMBOL_MAP[coin.toUpperCase()] || 'BTCUSDT'
  try {
    const res = await axios.get(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`, { timeout: 10000 })
    const { bids, asks } = res.data

    // Parse all levels
    const parsedBids = bids.map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) }))
    const parsedAsks = asks.map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) }))

    if (parsedBids.length === 0 || parsedAsks.length === 0) return getMockOrderBook(coin)

    const midPrice = (parsedBids[0].price + parsedAsks[0].price) / 2
    const onePercent = midPrice * 0.01

    // Find buy wall: biggest bid cluster within 1% of price
    const nearBids = parsedBids.filter(b => b.price >= midPrice - onePercent)
    const buyWallEntry = nearBids.reduce((max, b) => b.qty > max.qty ? b : max, nearBids[0] || { price: midPrice * 0.97, qty: 0 })

    // Find sell wall: biggest ask cluster within 1% of price
    const nearAsks = parsedAsks.filter(a => a.price <= midPrice + onePercent)
    const sellWallEntry = nearAsks.reduce((max, a) => a.qty > max.qty ? a : max, nearAsks[0] || { price: midPrice * 1.03, qty: 0 })

    // Bid/ask ratio top 20 levels
    const top20Bids = parsedBids.slice(0, 20).reduce((s, b) => s + b.qty * b.price, 0)
    const top20Asks = parsedAsks.slice(0, 20).reduce((s, a) => s + a.qty * a.price, 0)
    const bidAskRatio = top20Bids / (top20Asks || 1)

    const buyWallSize = buyWallEntry.qty * buyWallEntry.price / 1e6
    const sellWallSize = sellWallEntry.qty * sellWallEntry.price / 1e6

    const signal = bidAskRatio > 1.3 ? 'BUY' : bidAskRatio < 0.7 ? 'SELL' : 'NEUTRAL'

    return {
      buyWall: {
        price: buyWallEntry.price,
        size: parseFloat(buyWallSize.toFixed(2)),
        strength: buyWallSize > 5 ? 'strong' : buyWallSize > 2 ? 'medium' : 'weak',
      },
      sellWall: {
        price: sellWallEntry.price,
        size: parseFloat(sellWallSize.toFixed(2)),
        strength: sellWallSize > 5 ? 'strong' : sellWallSize > 2 ? 'medium' : 'weak',
      },
      bidAskRatio: parseFloat(bidAskRatio.toFixed(2)),
      signal,
      description: `${signal === 'BUY' ? 'Large buy wall' : 'Large sell wall'} detected. Bid/ask ratio: ${bidAskRatio.toFixed(2)}`,
    }
  } catch (err) {
    console.error('fetchOrderBook error:', err.message)
    return getMockOrderBook(coin.toUpperCase())
  }
}

if (process.argv[2] === 'test') {
  fetchOrderBook('BTC').then(data => {
    console.log(JSON.stringify(data, null, 2))
  })
}
