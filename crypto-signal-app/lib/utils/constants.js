export const COINS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin' }
export const SIGNAL_TYPES = ['BUY', 'SELL', 'HOLD']
export const REGIMES = ['trending_up', 'trending_down', 'ranging', 'high_volatility', 'low_liquidity']
export const CONFIDENCE_THRESHOLD = 70
export const REFRESH_INTERVAL = 300000  // 5 minutes in ms

export const REGIME_LABELS = {
  trending_up: 'Trending Up',
  trending_down: 'Trending Down',
  ranging: 'Ranging',
  high_volatility: 'High Volatility',
  low_liquidity: 'Low Liquidity',
}

export const REGIME_COLORS = {
  trending_up: '#22c55e',
  trending_down: '#ef4444',
  ranging: '#eab308',
  high_volatility: '#f97316',
  low_liquidity: '#6b7280',
}
