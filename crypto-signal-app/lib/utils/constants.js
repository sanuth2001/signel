// Full COINS config — Prompt 28
export const COINS = {
  BTC: {
    id: 'bitcoin',
    pair: 'BTCUSDT',
    tier: 1,
    minVolume: 1000000000,
    decimals: 2,
    onchainExplorer: 'blockchain',
    color: '#F7931A',
  },
  ETH: {
    id: 'ethereum',
    pair: 'ETHUSDT',
    tier: 1,
    minVolume: 500000000,
    decimals: 2,
    onchainExplorer: 'etherscan',
    color: '#627EEA',
  },
  SOL: {
    id: 'solana',
    pair: 'SOLUSDT',
    tier: 2,
    minVolume: 100000000,
    decimals: 3,
    onchainExplorer: 'solscan',
    color: '#9945FF',
  },
  BNB: {
    id: 'binancecoin',
    pair: 'BNBUSDT',
    tier: 2,
    minVolume: 100000000,
    decimals: 2,
    onchainExplorer: 'bscscan',
    color: '#F0B90B',
  },
  XRP: {
    id: 'ripple',
    pair: 'XRPUSDT',
    tier: 2,
    minVolume: 50000000,
    decimals: 4,
    onchainExplorer: 'xrpscan',
    color: '#346AA9',
  },
  AVAX: {
    id: 'avalanche-2',
    pair: 'AVAXUSDT',
    tier: 3,
    minVolume: 50000000,
    decimals: 3,
    onchainExplorer: 'snowtrace',
    color: '#E84142',
  },
  LINK: {
    id: 'chainlink',
    pair: 'LINKUSDT',
    tier: 3,
    minVolume: 30000000,
    decimals: 3,
    onchainExplorer: 'etherscan',
    color: '#2A5ADA',
  },
  ARB: {
    id: 'arbitrum',
    pair: 'ARBUSDT',
    tier: 3,
    minVolume: 30000000,
    decimals: 3,
    onchainExplorer: 'arbiscan',
    color: '#28A0F0',
  },
  MATIC: {
    id: 'matic-network',
    pair: 'MATICUSDT',
    tier: 3,
    minVolume: 30000000,
    decimals: 4,
    onchainExplorer: 'polygonscan',
    color: '#8247E5',
  },
  DOT: {
    id: 'polkadot',
    pair: 'DOTUSDT',
    tier: 3,
    minVolume: 30000000,
    decimals: 3,
    onchainExplorer: 'subscan',
    color: '#E6007A',
  },
}

// Helper to get coin id for CoinGecko
export function getCoinId(coin) {
  return COINS[coin?.toUpperCase()]?.id || 'bitcoin'
}

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

export const REGIME_ICONS = {
  trending_up: '📈',
  trending_down: '📉',
  ranging: '↔️',
  high_volatility: '⚡',
  low_liquidity: '💧',
}
