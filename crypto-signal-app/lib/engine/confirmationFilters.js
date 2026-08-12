/**
 * Breakout confirmation filters based on Fidelity Technical Analysis methodology
 */

export function applyConfirmationFilter(breakout, ohlcv, primaryFilterType = 'percentage') {
  if (!breakout || !ohlcv || !ohlcv.close || ohlcv.close.length < 5) {
    return {
      confirmed: false,
      filtersApplied: [],
      filtersPassed: [],
      filtersFailed: ['data_missing'],
      confidenceBoost: 0,
      reason: 'Insufficient OHLCV data for confirmation filtering',
    }
  }

  const closes = ohlcv.close
  const volumes = ohlcv.volume || closes.map(() => 1e6)
  const len = closes.length

  const level = breakout.level || breakout.price || closes[len - 1]
  const direction = breakout.direction || 'bullish'
  const breakoutIndex = breakout.index !== undefined ? breakout.index : len - 1

  const lastClose = closes[len - 1]
  const prevClose = len > 1 ? closes[len - 2] : lastClose
  const breakoutVolume = volumes[breakoutIndex] || volumes[len - 1]

  // Calculate 10-period volume average prior to breakout
  const startVolIdx = Math.max(0, breakoutIndex - 10)
  const volSlice = volumes.slice(startVolIdx, breakoutIndex > startVolIdx ? breakoutIndex : startVolIdx + 1)
  const avgVol = volSlice.length > 0 ? volSlice.reduce((a, b) => a + b, 0) / volSlice.length : breakoutVolume

  const filtersApplied = ['intrabar', 'multiple_closes', 'time', 'percentage', 'volume']
  const filtersPassed = []
  const filtersFailed = []
  let points = 0

  // 1. INTRABAR FILTER: Price closed beyond level (+3 pts)
  const intrabarPassed = direction === 'bullish' ? lastClose > level : lastClose < level
  if (intrabarPassed) {
    filtersPassed.push('intrabar')
    points += 3
  } else {
    filtersFailed.push('intrabar')
  }

  // 2. MULTIPLE CLOSES FILTER: 2 consecutive closes beyond level (+8 pts)
  const multiClosesPassed = direction === 'bullish'
    ? (lastClose > level && prevClose > level)
    : (lastClose < level && prevClose < level)
  if (multiClosesPassed) {
    filtersPassed.push('multiple_closes')
    points += 8
  } else {
    filtersFailed.push('multiple_closes')
  }

  // 3. TIME FILTER: Held beyond level for recent candles (+6 pts)
  const candlesHeld = direction === 'bullish'
    ? closes.slice(-3).every(c => c >= level)
    : closes.slice(-3).every(c => c <= level)
  if (candlesHeld) {
    filtersPassed.push('time')
    points += 6
  } else {
    filtersFailed.push('time')
  }

  // 4. PERCENTAGE FILTER: Closed 0.5% to 1.0% beyond level (+10 pts)
  const marginPercent = Math.abs(lastClose - level) / level * 100
  const percentagePassed = intrabarPassed && marginPercent >= 0.5
  if (percentagePassed) {
    filtersPassed.push('percentage')
    points += 10
  } else {
    filtersFailed.push('percentage')
  }

  // 5. VOLUME CONFIRMATION: Volume > 1.5x average (+12 pts)
  const volumeRatio = avgVol > 0 ? breakoutVolume / avgVol : 1
  const volumePassed = volumeRatio >= 1.5
  if (volumePassed) {
    filtersPassed.push('volume')
    points += 12
  } else {
    filtersFailed.push('volume')
  }

  // Best combination requirement for crypto: percentage (>=0.5%) + volume (>=1.5x)
  const confirmed = percentagePassed && volumePassed

  const reason = confirmed
    ? `Breakout confirmed by price close (${marginPercent.toFixed(2)}% > 0.5%) and volume expansion (${volumeRatio.toFixed(1)}x > 1.5x)`
    : `Breakout unconfirmed: ${!percentagePassed ? 'price penetration insufficient (<0.5%)' : ''} ${!volumePassed ? 'volume boost missing (<1.5x avg)' : ''}`.trim()

  return {
    confirmed,
    filtersApplied,
    filtersPassed,
    filtersFailed,
    confidenceBoost: points,
    marginPercent: parseFloat(marginPercent.toFixed(2)),
    volumeRatio: parseFloat(volumeRatio.toFixed(2)),
    reason,
  }
}
