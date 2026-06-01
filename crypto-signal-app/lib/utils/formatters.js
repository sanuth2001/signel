export function formatPrice(price) {
  if (!price && price !== 0) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)
}

export function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${parseFloat(value).toFixed(2)}%`
}

export function formatLargeNumber(n) {
  if (!n && n !== 0) return 'N/A'
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

export function getSignalColor(signal) {
  switch (signal?.toUpperCase()) {
    case 'BUY': return '#22c55e'
    case 'SELL': return '#ef4444'
    case 'HOLD': return '#eab308'
    case 'WAIT': return '#6b7280'
    default: return '#6b7280'
  }
}

export function getSignalBgClass(signal) {
  switch (signal?.toUpperCase()) {
    case 'BUY': return 'bg-green-500/10 border-green-500/30 text-green-400'
    case 'SELL': return 'bg-red-500/10 border-red-500/30 text-red-400'
    case 'HOLD': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
    default: return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
  }
}

export function getConfidenceLabel(score) {
  if (score >= 90) return 'Very High'
  if (score >= 80) return 'High'
  if (score >= 70) return 'Medium'
  if (score >= 60) return 'Low'
  return 'Very Low'
}

export function getConfidenceColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 70) return '#eab308'
  if (score >= 50) return '#f97316'
  return '#ef4444'
}

export function timeAgo(timestamp) {
  if (!timestamp) return 'Never'
  const diff = Date.now() - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
