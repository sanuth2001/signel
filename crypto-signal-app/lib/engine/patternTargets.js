/**
 * Target price formulas based on Fidelity Technical Analysis methodology (Charles D. Kirkpatrick II, CMT)
 */

export function calculatePatternTarget(pattern, currentPrice) {
  if (!pattern) return null

  const patternName = (pattern.pattern || pattern.name || '').toLowerCase()
  const direction = pattern.direction || 'bullish'
  let primaryTarget = currentPrice
  let height = 0
  let invalidationLevel = pattern.invalidationLevel || currentPrice

  if (patternName.includes('double top')) {
    const resistance = pattern.resistanceLine || pattern.highestPeak || currentPrice * 1.05
    const neckline = pattern.neckline || pattern.lowestTrough || currentPrice * 0.98
    height = Math.abs(resistance - neckline)
    primaryTarget = neckline - height
    invalidationLevel = resistance * 1.01
  } else if (patternName.includes('double bottom')) {
    const support = pattern.supportLine || pattern.lowestTrough || currentPrice * 0.95
    const neckline = pattern.resistanceLine || pattern.highestPeak || currentPrice * 1.02
    height = Math.abs(neckline - support)
    primaryTarget = neckline + height
    invalidationLevel = support * 0.99
  } else if (patternName.includes('triple top')) {
    const highestPeak = pattern.highestPeak || pattern.resistanceLine || currentPrice * 1.05
    const lowestTrough = pattern.lowestTrough || pattern.neckline || currentPrice * 0.98
    height = Math.abs(highestPeak - lowestTrough)
    primaryTarget = lowestTrough - height
    invalidationLevel = highestPeak * 1.01
  } else if (patternName.includes('triple bottom')) {
    const highestPeak = pattern.highestPeak || pattern.resistanceLine || currentPrice * 1.02
    const lowestTrough = pattern.lowestTrough || pattern.supportLine || currentPrice * 0.95
    height = Math.abs(highestPeak - lowestTrough)
    primaryTarget = highestPeak + height
    invalidationLevel = lowestTrough * 0.99
  } else if (patternName.includes('rectangle')) {
    const resistance = pattern.resistanceLine || currentPrice * 1.03
    const support = pattern.supportLine || currentPrice * 0.97
    height = Math.abs(resistance - support)
    if (direction === 'bullish') {
      primaryTarget = resistance + height
      invalidationLevel = support
    } else {
      primaryTarget = support - height
      invalidationLevel = resistance
    }
  } else if (patternName.includes('symmetrical triangle')) {
    const highestPeak = pattern.highestPeak || currentPrice * 1.04
    const lowestTrough = pattern.lowestTrough || currentPrice * 0.96
    height = Math.abs(highestPeak - lowestTrough)
    const breakoutPrice = pattern.breakoutPrice || currentPrice
    primaryTarget = direction === 'bullish' ? breakoutPrice + height : breakoutPrice - height
    invalidationLevel = direction === 'bullish' ? lowestTrough : highestPeak
  } else if (patternName.includes('ascending triangle') || patternName.includes('descending triangle')) {
    const resistance = pattern.resistanceLine || pattern.highestPeak || currentPrice * 1.04
    const lowestTrough = pattern.lowestTrough || currentPrice * 0.96
    height = Math.abs(resistance - lowestTrough)
    const breakoutPrice = pattern.breakoutPrice || currentPrice
    primaryTarget = direction === 'bullish' ? breakoutPrice + height : breakoutPrice - height
    invalidationLevel = direction === 'bullish' ? lowestTrough : resistance
  } else if (patternName.includes('wedge')) {
    const highestPeak = pattern.highestPeak || currentPrice * 1.05
    const lowestTrough = pattern.lowestTrough || currentPrice * 0.95
    const breakoutPrice = pattern.breakoutPrice || currentPrice
    if (direction === 'bearish') {
      primaryTarget = lowestTrough
      height = Math.abs(breakoutPrice - lowestTrough)
      invalidationLevel = highestPeak
    } else {
      height = Math.abs(highestPeak - lowestTrough)
      primaryTarget = breakoutPrice + height
      invalidationLevel = lowestTrough
    }
  } else if (patternName.includes('head and shoulders top') || (patternName.includes('head and shoulders') && !patternName.includes('inverse'))) {
    const head = pattern.head || pattern.highestPeak || currentPrice * 1.06
    const neckline = pattern.neckline || currentPrice * 0.98
    height = Math.abs(head - neckline)
    primaryTarget = neckline - height
    invalidationLevel = head * 1.01
  } else if (patternName.includes('inverse head and shoulders')) {
    const head = pattern.head || pattern.lowestTrough || currentPrice * 0.94
    const neckline = pattern.neckline || currentPrice * 1.02
    height = Math.abs(neckline - head)
    primaryTarget = neckline + height
    invalidationLevel = head * 0.99
  } else if (patternName.includes('cup and handle')) {
    const rim = pattern.cupRim || currentPrice * 1.04
    const bottom = pattern.cupBottom || currentPrice * 0.92
    height = Math.abs(rim - bottom)
    const breakoutPrice = pattern.breakoutPrice || rim
    primaryTarget = breakoutPrice + height
    invalidationLevel = pattern.handleBottom || currentPrice * 0.98
  } else if (patternName.includes('pennant') || patternName.includes('flag') || patternName.includes('bull flag')) {
    const flagpoleHeight = pattern.flagpoleHeight || Math.abs((pattern.flagpoleTop || currentPrice * 1.05) - (pattern.flagpoleBase || currentPrice * 0.95))
    height = flagpoleHeight
    const breakoutPrice = pattern.breakoutPrice || pattern.breakoutTarget || currentPrice
    primaryTarget = direction === 'bullish' ? breakoutPrice + height : breakoutPrice - height
    invalidationLevel = pattern.invalidationLevel || (direction === 'bullish' ? currentPrice * 0.97 : currentPrice * 1.03)
  } else if (patternName.includes('pipe bottom')) {
    const tallerHigh = pattern.breakoutLevel || Math.max(pattern.bar1?.high || 0, pattern.bar2?.high || 0) || currentPrice * 1.02
    const lowerLow = pattern.stopLoss || Math.min(pattern.bar1?.low || Infinity, pattern.bar2?.low || Infinity) || currentPrice * 0.96
    height = Math.abs(tallerHigh - lowerLow)
    primaryTarget = tallerHigh + height
    invalidationLevel = lowerLow
  } else {
    // Default measured move calculation
    height = Math.abs(currentPrice * 0.05)
    primaryTarget = direction === 'bullish' ? currentPrice + height : currentPrice - height
  }

  const measuredMove = Math.abs(primaryTarget - currentPrice)
  const conservativeTarget = direction === 'bullish'
    ? currentPrice + measuredMove * 0.5
    : currentPrice - measuredMove * 0.5
  const aggressiveTarget = direction === 'bullish'
    ? currentPrice + measuredMove * 1.5
    : currentPrice - measuredMove * 1.5

  const measuredMovePercent = parseFloat(((measuredMove / currentPrice) * 100).toFixed(2))

  return {
    conservativeTarget: parseFloat(conservativeTarget.toFixed(2)),
    primaryTarget: parseFloat(primaryTarget.toFixed(2)),
    aggressiveTarget: parseFloat(aggressiveTarget.toFixed(2)),
    measuredMovePercent,
    invalidationLevel: parseFloat(invalidationLevel.toFixed(2)),
  }
}
