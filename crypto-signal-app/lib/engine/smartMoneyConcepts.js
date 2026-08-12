// Smart Money Concepts (SMC) Analysis Engine
// Implements: Market Structure, BOS, CHoCH, Order Blocks, FVG, Liquidity, Premium/Discount

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert raw price-fetcher arrays into OHLCV objects array.
 * priceData.hourly = { open:[], high:[], low:[], close:[], timestamps:[] }
 */
export function toOHLCV(arrays) {
  if (!arrays || !arrays.close) return []
  const len = arrays.close.length
  const result = []
  for (let i = 0; i < len; i++) {
    result.push({
      open:      arrays.open?.[i]       ?? arrays.close[i],
      high:      arrays.high?.[i]       ?? arrays.close[i],
      low:       arrays.low?.[i]        ?? arrays.close[i],
      close:     arrays.close[i],
      volume:    arrays.volume?.[i]     ?? 0,
      timestamp: arrays.timestamps?.[i] ?? (Date.now() - (len - i) * 3600000),
    })
  }
  return result
}

function pct(a, b) {
  if (!b) return 0
  return ((a - b) / b) * 100
}

// ─── A. Market Structure ──────────────────────────────────────────────────────

export function findSwingHighs(ohlcv, lookback = 3) {
  const swings = []
  for (let i = lookback; i < ohlcv.length - lookback; i++) {
    let isSwing = true
    for (let j = 1; j <= lookback; j++) {
      if (ohlcv[i].high <= ohlcv[i - j].high || ohlcv[i].high <= ohlcv[i + j].high) {
        isSwing = false
        break
      }
    }
    if (isSwing) {
      swings.push({ index: i, price: ohlcv[i].high, timestamp: ohlcv[i].timestamp })
    }
  }
  return swings
}

export function findSwingLows(ohlcv, lookback = 3) {
  const swings = []
  for (let i = lookback; i < ohlcv.length - lookback; i++) {
    let isSwing = true
    for (let j = 1; j <= lookback; j++) {
      if (ohlcv[i].low >= ohlcv[i - j].low || ohlcv[i].low >= ohlcv[i + j].low) {
        isSwing = false
        break
      }
    }
    if (isSwing) {
      swings.push({ index: i, price: ohlcv[i].low, timestamp: ohlcv[i].timestamp })
    }
  }
  return swings
}

export function analyzeMarketStructure(ohlcv) {
  if (!ohlcv || ohlcv.length < 10) {
    return { structure: 'ranging', swingHighs: [], swingLows: [], structureStrength: 'weak' }
  }

  const swingHighs = findSwingHighs(ohlcv, 3).slice(-6)
  const swingLows  = findSwingLows(ohlcv, 3).slice(-6)

  const lastSH     = swingHighs[swingHighs.length - 1] || null
  const prevSH     = swingHighs[swingHighs.length - 2] || null
  const lastSL     = swingLows[swingLows.length - 1]   || null
  const prevSL     = swingLows[swingLows.length - 2]   || null

  let structure = 'ranging'
  let hhCount   = 0
  let hlCount   = 0
  let lhCount   = 0
  let llCount   = 0

  if (lastSH && prevSH) {
    if (lastSH.price > prevSH.price) hhCount++
    else                              lhCount++
  }
  if (lastSL && prevSL) {
    if (lastSL.price > prevSL.price) hlCount++
    else                              llCount++
  }

  if (hhCount > 0 && hlCount > 0)      structure = 'bullish'
  else if (lhCount > 0 && llCount > 0) structure = 'bearish'

  // Strength: how far apart are the swings
  let structureStrength = 'weak'
  if (lastSH && lastSL) {
    const range = Math.abs(pct(lastSH.price, lastSL.price))
    if (range > 3)      structureStrength = 'strong'
    else if (range > 1) structureStrength = 'moderate'
  }

  return {
    structure,
    swingHighs,
    swingLows,
    lastSwingHigh:     lastSH || null,
    lastSwingLow:      lastSL || null,
    previousSwingHigh: prevSH || null,
    previousSwingLow:  prevSL || null,
    structureStrength,
  }
}

// ─── B. Break of Structure ────────────────────────────────────────────────────

export function detectBOS(ohlcv, marketStructure) {
  if (!ohlcv || ohlcv.length < 5 || !marketStructure) {
    return { bullishBOS: { detected: false }, bearishBOS: { detected: false }, mostRecentBOS: null }
  }

  const { previousSwingHigh, previousSwingLow } = marketStructure
  const recent = ohlcv.slice(-10)

  let bullishBOS = { detected: false, level: null, candleIndex: null, candlesAgo: null, strength: 0 }
  let bearishBOS = { detected: false, level: null, candleIndex: null, candlesAgo: null, strength: 0 }

  if (previousSwingHigh) {
    for (let i = 0; i < recent.length; i++) {
      if (recent[i].close > previousSwingHigh.price) {
        bullishBOS = {
          detected:    true,
          level:       previousSwingHigh.price,
          candleIndex: ohlcv.length - recent.length + i,
          candlesAgo:  recent.length - 1 - i,
          strength:    pct(recent[i].close, previousSwingHigh.price),
        }
        break
      }
    }
  }

  if (previousSwingLow) {
    for (let i = 0; i < recent.length; i++) {
      if (recent[i].close < previousSwingLow.price) {
        bearishBOS = {
          detected:    true,
          level:       previousSwingLow.price,
          candleIndex: ohlcv.length - recent.length + i,
          candlesAgo:  recent.length - 1 - i,
          strength:    Math.abs(pct(recent[i].close, previousSwingLow.price)),
        }
        break
      }
    }
  }

  let mostRecentBOS = null
  if (bullishBOS.detected && bearishBOS.detected) {
    mostRecentBOS = bullishBOS.candlesAgo <= bearishBOS.candlesAgo ? bullishBOS : bearishBOS
  } else if (bullishBOS.detected) {
    mostRecentBOS = bullishBOS
  } else if (bearishBOS.detected) {
    mostRecentBOS = bearishBOS
  }

  return { bullishBOS, bearishBOS, mostRecentBOS }
}

// ─── C. Change of Character ───────────────────────────────────────────────────

export function detectCHoCH(ohlcv, marketStructure, signalDirection) {
  if (!ohlcv || ohlcv.length < 5 || !marketStructure) {
    return { detected: false, recommendation: 'HOLD', description: 'Insufficient data' }
  }

  const recent       = ohlcv.slice(-15)
  const currentPrice = ohlcv[ohlcv.length - 1].close

  let chochDetected   = false
  let chochType       = null
  let chochLevel      = null
  let chochCandleIdx  = null
  let chochCandleAgo  = null
  let chochPrice      = null
  let severity        = null

  if (signalDirection === 'long') {
    const swingLow = marketStructure.lastSwingLow
    if (swingLow) {
      for (let i = 0; i < recent.length; i++) {
        if (recent[i].close < swingLow.price) {
          chochDetected   = true
          chochType       = 'bearish'
          chochLevel      = swingLow.price
          chochCandleIdx  = ohlcv.length - recent.length + i
          chochCandleAgo  = recent.length - 1 - i
          chochPrice      = recent[i].close
          break
        }
      }
    }
  } else if (signalDirection === 'short') {
    const swingHigh = marketStructure.lastSwingHigh
    if (swingHigh) {
      for (let i = 0; i < recent.length; i++) {
        if (recent[i].close > swingHigh.price) {
          chochDetected   = true
          chochType       = 'bullish'
          chochLevel      = swingHigh.price
          chochCandleIdx  = ohlcv.length - recent.length + i
          chochCandleAgo  = recent.length - 1 - i
          chochPrice      = recent[i].close
          break
        }
      }
    }
  }

  let distFromChoCH = 0
  if (chochDetected && chochLevel) {
    distFromChoCH = Math.abs(pct(currentPrice, chochLevel))
    if (distFromChoCH < 0.2)      severity = 'mild'
    else if (distFromChoCH < 0.5) severity = 'moderate'
    else                           severity = 'severe'
  }

  const isInvalidating  = severity === 'severe' || (chochDetected && chochCandleAgo <= 2)
  let recommendation    = 'HOLD'
  if (severity === 'mild')     recommendation = 'HOLD'
  if (severity === 'moderate') recommendation = 'REDUCE'
  if (severity === 'severe')   recommendation = 'EXIT'

  let description = 'No CHoCH detected — signal structure intact'
  if (chochDetected) {
    const dir = signalDirection === 'long' ? 'below swing low' : 'above swing high'
    description = `CHoCH ${severity}: price closed ${dir} at $${chochLevel?.toLocaleString?.() ?? chochLevel}. ${
      severity === 'severe'
        ? 'Consider exiting — trend reversal likely.'
        : 'Monitor closely for continuation or recovery.'
    }`
  }

  return {
    detected:             chochDetected,
    type:                 chochType,
    severity,
    chochLevel,
    chochCandleIndex:     chochCandleIdx,
    candlesAgo:           chochCandleAgo,
    priceAtChoCH:         chochPrice,
    currentPrice,
    distanceFromChoCH:    parseFloat(distFromChoCH.toFixed(3)),
    isSignalInvalidating: isInvalidating,
    recommendation,
    description,
  }
}

// ─── D. Order Blocks ──────────────────────────────────────────────────────────

function avgBodySize(ohlcv) {
  const sizes = ohlcv.map(c => Math.abs(c.close - c.open))
  return sizes.reduce((a, b) => a + b, 0) / (sizes.length || 1)
}

export function detectOrderBlocks(ohlcv, signalEntry) {
  if (!ohlcv || ohlcv.length < 10) {
    return {
      bullishOBs: [], bearishOBs: [],
      nearestBullishOB: null, nearestBearishOB: null,
      signalSupportOB: null, signalThreatenOB: null,
    }
  }

  const slice   = ohlcv.slice(-50)
  const avgBody = avgBodySize(slice)
  const currentPrice = ohlcv[ohlcv.length - 1].close

  const bullishOBs = []
  const bearishOBs = []

  // Find displacement moves (3+ same-direction candles with large bodies)
  for (let i = 2; i < slice.length; i++) {
    // Bullish displacement → bearish OB before it
    if (
      slice[i].close > slice[i].open &&
      slice[i - 1].close > slice[i - 1].open &&
      Math.abs(slice[i].close - slice[i].open) > avgBody * 1.5 &&
      Math.abs(slice[i - 1].close - slice[i - 1].open) > avgBody * 1.5
    ) {
      // The candle BEFORE the displacement (bearish candle ideal)
      const ob = slice[i - 2]
      if (ob.close < ob.open) { // bearish candle
        const zone = { high: ob.open, low: ob.close }
        const mid  = (zone.high + zone.low) / 2
        // Check if mitigated
        const mitigated = slice.slice(i).some(c => c.low <= zone.low && c.high >= zone.high)
        const distPct   = Math.abs(pct(currentPrice, mid))
        bearishOBs.push({
          price:               mid,
          zone,
          strength:            Math.abs(ob.open - ob.close) > avgBody * 2 ? 'strong' : 'medium',
          mitigated,
          distanceFromCurrent: parseFloat(distPct.toFixed(2)),
          candlesAgo:          slice.length - 1 - (i - 2),
        })
      }
    }

    // Bearish displacement → bullish OB before it
    if (
      slice[i].close < slice[i].open &&
      slice[i - 1].close < slice[i - 1].open &&
      Math.abs(slice[i].close - slice[i].open) > avgBody * 1.5 &&
      Math.abs(slice[i - 1].close - slice[i - 1].open) > avgBody * 1.5
    ) {
      const ob = slice[i - 2]
      if (ob.close > ob.open) { // bullish candle
        const zone = { high: ob.close, low: ob.open }
        const mid  = (zone.high + zone.low) / 2
        const mitigated = slice.slice(i).some(c => c.low <= zone.low && c.high >= zone.high)
        const distPct   = Math.abs(pct(currentPrice, mid))
        bullishOBs.push({
          price:               mid,
          zone,
          strength:            Math.abs(ob.close - ob.open) > avgBody * 2 ? 'strong' : 'medium',
          mitigated,
          distanceFromCurrent: parseFloat(distPct.toFixed(2)),
          candlesAgo:          slice.length - 1 - (i - 2),
        })
      }
    }
  }

  // Remove duplicates by proximity (<0.5% apart)
  const dedup = (arr) => arr.filter((ob, i, a) =>
    !a.slice(0, i).some(prev => Math.abs(pct(ob.price, prev.price)) < 0.5)
  )

  const uniqueBullishOBs = dedup(bullishOBs)
  const uniqueBearishOBs = dedup(bearishOBs)

  const nearestBullishOB = uniqueBullishOBs
    .filter(ob => !ob.mitigated && ob.price < currentPrice)
    .sort((a, b) => b.price - a.price)[0] || null

  const nearestBearishOB = uniqueBearishOBs
    .filter(ob => !ob.mitigated && ob.price > currentPrice)
    .sort((a, b) => a.price - b.price)[0] || null

  // Relevance for signal direction
  let signalSupportOB  = null
  let signalThreatenOB = null
  if (signalEntry) {
    signalSupportOB  = nearestBullishOB  // support below for BUY
    signalThreatenOB = nearestBearishOB  // resistance above for BUY
  }

  return {
    bullishOBs:      uniqueBullishOBs,
    bearishOBs:      uniqueBearishOBs,
    nearestBullishOB,
    nearestBearishOB,
    signalSupportOB,
    signalThreatenOB,
  }
}

// ─── E. Fair Value Gaps ───────────────────────────────────────────────────────

export function detectFairValueGaps(ohlcv) {
  if (!ohlcv || ohlcv.length < 3) {
    return {
      bullishFVGs: [], bearishFVGs: [],
      nearestBullishFVG: null, nearestBearishFVG: null,
      priceInFVG: false, currentFVG: null,
    }
  }

  const slice        = ohlcv.slice(-30)
  const currentPrice = ohlcv[ohlcv.length - 1].close
  const bullishFVGs  = []
  const bearishFVGs  = []

  for (let i = 1; i < slice.length - 1; i++) {
    const c1 = slice[i - 1]
    const c2 = slice[i]     // the large candle
    const c3 = slice[i + 1]

    // Bullish FVG: c3.low > c1.high (gap up)
    if (c3.low > c1.high) {
      const zone     = { high: c3.low, low: c1.high }
      const midpoint = (zone.high + zone.low) / 2
      const sizePct  = pct(zone.high, zone.low)
      // Filled if any subsequent candle traded through
      const filled   = slice.slice(i + 1).some(c => c.low <= zone.low)
      const distPct  = Math.abs(pct(currentPrice, midpoint))
      bullishFVGs.push({
        zone, midpoint,
        size:                parseFloat(sizePct.toFixed(3)),
        filled,
        distanceFromCurrent: parseFloat(distPct.toFixed(2)),
        candlesAgo:          slice.length - 1 - i,
        type:                'bullish',
      })
    }

    // Bearish FVG: c3.high < c1.low (gap down)
    if (c3.high < c1.low) {
      const zone     = { high: c1.low, low: c3.high }
      const midpoint = (zone.high + zone.low) / 2
      const sizePct  = Math.abs(pct(zone.high, zone.low))
      const filled   = slice.slice(i + 1).some(c => c.high >= zone.high)
      const distPct  = Math.abs(pct(currentPrice, midpoint))
      bearishFVGs.push({
        zone, midpoint,
        size:                parseFloat(sizePct.toFixed(3)),
        filled,
        distanceFromCurrent: parseFloat(distPct.toFixed(2)),
        candlesAgo:          slice.length - 1 - i,
        type:                'bearish',
      })
    }
  }

  const nearestBullishFVG = bullishFVGs
    .filter(f => !f.filled && f.zone.high < currentPrice)
    .sort((a, b) => b.zone.high - a.zone.high)[0] || null

  const nearestBearishFVG = bearishFVGs
    .filter(f => !f.filled && f.zone.low > currentPrice)
    .sort((a, b) => a.zone.low - b.zone.low)[0] || null

  // Is current price inside any FVG?
  const allFVGs     = [...bullishFVGs, ...bearishFVGs]
  const currentFVG  = allFVGs.find(f => !f.filled && currentPrice >= f.zone.low && currentPrice <= f.zone.high) || null

  return {
    bullishFVGs,
    bearishFVGs,
    nearestBullishFVG,
    nearestBearishFVG,
    priceInFVG: !!currentFVG,
    currentFVG,
  }
}

// ─── F. Liquidity ─────────────────────────────────────────────────────────────

export function detectLiquidity(ohlcv, currentPrice) {
  if (!ohlcv || ohlcv.length < 10) {
    return {
      buySideLiquidity: [], sellSideLiquidity: [],
      nearestBSL: null, nearestSSL: null,
      liquiditySweepDetected: { ssl: false, bsl: false },
      riskToSignal: 'low',
      description: 'Insufficient data for liquidity analysis',
    }
  }

  const slice        = ohlcv.slice(-30)
  const EQUAL_PCT    = 0.2
  const buySide      = [] // equal highs above current price
  const sellSide     = [] // equal lows below current price

  // Find equal highs (BSL) — highs within 0.2% of each other
  for (let i = 0; i < slice.length; i++) {
    const matches = slice.filter((c, j) =>
      j !== i && Math.abs(pct(c.high, slice[i].high)) <= EQUAL_PCT
    )
    if (matches.length >= 1 && slice[i].high > currentPrice) {
      const existing = buySide.find(b => Math.abs(pct(b.price, slice[i].high)) < 0.5)
      if (!existing) {
        buySide.push({
          price:               slice[i].high,
          type:                'equal_highs',
          touches:             matches.length + 1,
          strength:            matches.length >= 2 ? 'strong' : 'medium',
          distanceFromCurrent: parseFloat(Math.abs(pct(currentPrice, slice[i].high)).toFixed(2)),
        })
      }
    }
  }

  // Find equal lows (SSL) — lows within 0.2% of each other
  for (let i = 0; i < slice.length; i++) {
    const matches = slice.filter((c, j) =>
      j !== i && Math.abs(pct(c.low, slice[i].low)) <= EQUAL_PCT
    )
    if (matches.length >= 1 && slice[i].low < currentPrice) {
      const existing = sellSide.find(s => Math.abs(pct(s.price, slice[i].low)) < 0.5)
      if (!existing) {
        sellSide.push({
          price:               slice[i].low,
          type:                'equal_lows',
          touches:             matches.length + 1,
          strength:            matches.length >= 2 ? 'strong' : 'medium',
          distanceFromCurrent: parseFloat(Math.abs(pct(currentPrice, slice[i].low)).toFixed(2)),
        })
      }
    }
  }

  // Also add recent swing highs/lows as liquidity
  const swingHighs = findSwingHighs(ohlcv, 3).slice(-4)
  const swingLows  = findSwingLows(ohlcv, 3).slice(-4)

  swingHighs.forEach(sh => {
    if (sh.price > currentPrice && !buySide.some(b => Math.abs(pct(b.price, sh.price)) < 0.5)) {
      buySide.push({
        price:               sh.price,
        type:                'swing_high',
        touches:             1,
        strength:            'medium',
        distanceFromCurrent: parseFloat(Math.abs(pct(currentPrice, sh.price)).toFixed(2)),
      })
    }
  })

  swingLows.forEach(sl => {
    if (sl.price < currentPrice && !sellSide.some(s => Math.abs(pct(s.price, sl.price)) < 0.5)) {
      sellSide.push({
        price:               sl.price,
        type:                'swing_low',
        touches:             1,
        strength:            'medium',
        distanceFromCurrent: parseFloat(Math.abs(pct(currentPrice, sl.price)).toFixed(2)),
      })
    }
  })

  const nearestBSL = buySide.sort((a, b) => a.price - b.price)[0] || null
  const nearestSSL = sellSide.sort((a, b) => b.price - a.price)[0] || null

  // Detect liquidity sweep (wick beyond level then close back inside)
  const lastCandle = ohlcv[ohlcv.length - 1]
  const prevCandle = ohlcv[ohlcv.length - 2]

  let sweepDetected = { ssl: false, bsl: false, sweptLevel: null, recoveredAfter: false, sweepValid: false }

  if (nearestSSL) {
    const sslSweep = prevCandle.low < nearestSSL.price && lastCandle.close > nearestSSL.price
    if (sslSweep) {
      sweepDetected = { ssl: true, bsl: false, sweptLevel: nearestSSL.price, recoveredAfter: true, sweepValid: true }
    }
  }

  if (nearestBSL && !sweepDetected.ssl) {
    const bslSweep = prevCandle.high > nearestBSL.price && lastCandle.close < nearestBSL.price
    if (bslSweep) {
      sweepDetected = { ssl: false, bsl: true, sweptLevel: nearestBSL.price, recoveredAfter: true, sweepValid: true }
    }
  }

  // Risk assessment
  let riskToSignal = 'low'
  if (nearestSSL && nearestSSL.distanceFromCurrent < 1 && nearestSSL.strength === 'strong') riskToSignal = 'high'
  else if (nearestSSL && nearestSSL.distanceFromCurrent < 2) riskToSignal = 'medium'

  let description = 'No significant liquidity clusters detected near price.'
  if (nearestSSL && nearestBSL) {
    description = `BSL at $${nearestBSL.price.toLocaleString()} above (${nearestBSL.distanceFromCurrent}% away). SSL at $${nearestSSL.price.toLocaleString()} below (${nearestSSL.distanceFromCurrent}% away). Risk: ${riskToSignal}.`
  } else if (nearestSSL) {
    description = `SSL at $${nearestSSL.price.toLocaleString()} below (${nearestSSL.distanceFromCurrent}% away) — watch for sweep.`
  } else if (nearestBSL) {
    description = `BSL at $${nearestBSL.price.toLocaleString()} above (${nearestBSL.distanceFromCurrent}% away) — target zone.`
  }

  return {
    buySideLiquidity:        buySide.sort((a, b) => a.price - b.price),
    sellSideLiquidity:       sellSide.sort((a, b) => b.price - a.price),
    nearestBSL,
    nearestSSL,
    liquiditySweepDetected:  sweepDetected,
    riskToSignal,
    description,
  }
}

// ─── G. Premium & Discount Zones ─────────────────────────────────────────────

export function analyzePremiumDiscount(ohlcv, signalEntry) {
  if (!ohlcv || ohlcv.length < 10) {
    return {
      swingHigh: null, swingLow: null, equilibrium: null,
      currentZone: 'ranging', currentZonePercent: 50,
      signalAligned: false, alignmentStrength: 'weak',
      description: 'Insufficient data for premium/discount analysis',
    }
  }

  const slice     = ohlcv.slice(-50)
  const swingHigh = Math.max(...slice.map(c => c.high))
  const swingLow  = Math.min(...slice.map(c => c.low))
  const range     = swingHigh - swingLow
  if (range === 0) {
    return {
      swingHigh, swingLow, equilibrium: swingLow,
      currentZone: 'equilibrium', currentZonePercent: 50,
      signalAligned: false, alignmentStrength: 'weak',
      description: 'Price in tight range — no clear premium/discount'
    }
  }

  const equilibrium   = swingLow + range * 0.5
  const currentPrice  = ohlcv[ohlcv.length - 1].close
  const zonePercent   = ((currentPrice - swingLow) / range) * 100

  let currentZone = 'equilibrium'
  if (zonePercent < 45)        currentZone = 'discount'
  else if (zonePercent > 55)   currentZone = 'premium'

  // Signal alignment
  const signalDir = signalEntry && currentPrice > signalEntry ? 'long' : 'short'
  let signalAligned = false
  if (currentZone === 'discount') signalAligned = true  // cheap → better to buy
  if (currentZone === 'premium')  signalAligned = false // expensive → better to sell

  let alignmentStrength = 'weak'
  if (zonePercent < 30 || zonePercent > 70) alignmentStrength = 'strong'
  else if (zonePercent < 40 || zonePercent > 60) alignmentStrength = 'moderate'

  const description = `Price at ${zonePercent.toFixed(0)}% of swing range — ${currentZone} zone. ${
    currentZone === 'discount'
      ? 'Institutional buying zone — bullish alignment.'
      : currentZone === 'premium'
      ? 'Institutional selling zone — bearish alignment.'
      : 'At equilibrium — direction uncertain.'
  }`

  return {
    swingHigh,
    swingLow,
    equilibrium,
    currentZone,
    currentZonePercent: parseFloat(zonePercent.toFixed(1)),
    signalAligned,
    alignmentStrength,
    description,
  }
}

// ─── H. Complete SMC Analysis ─────────────────────────────────────────────────

export function analyzeSMC(ohlcv, currentPrice, signalDirection, signalEntry) {
  if (!ohlcv || ohlcv.length < 10) {
    return {
      structure:     { structure: 'ranging' },
      bos:           { bullishBOS: { detected: false }, bearishBOS: { detected: false } },
      choch:         { detected: false, recommendation: 'HOLD' },
      orderBlocks:   { bullishOBs: [], bearishOBs: [] },
      fvg:           { bullishFVGs: [], bearishFVGs: [] },
      liquidity:     { riskToSignal: 'low' },
      premiumDiscount: { currentZone: 'equilibrium' },
      smcBias:       'neutral',
      smcBullishScore: 0,
      smcBearishScore: 0,
      smcStrength:   0,
      summary:       'Insufficient data for SMC analysis.',
      keyLevels:     { nextSupport: null, nextResistance: null, criticalLevel: null },
    }
  }

  const structure     = analyzeMarketStructure(ohlcv)
  const bos           = detectBOS(ohlcv, structure)
  const choch         = detectCHoCH(ohlcv, structure, signalDirection)
  const orderBlocks   = detectOrderBlocks(ohlcv, signalEntry)
  const fvg           = detectFairValueGaps(ohlcv)
  const liquidity     = detectLiquidity(ohlcv, currentPrice)
  const premiumDiscount = analyzePremiumDiscount(ohlcv, signalEntry)

  // Score calculation
  let bullScore = 0
  let bearScore = 0

  if (structure.structure === 'bullish') bullScore += 3
  if (structure.structure === 'bearish') bearScore += 3

  if (bos.bullishBOS.detected) bullScore += 2
  if (bos.bearishBOS.detected) bearScore += 2

  if (signalDirection === 'long') {
    if (!choch.detected)               bullScore += 2
    if (choch.detected)                bearScore += 3
    if (premiumDiscount.currentZone === 'discount') bullScore += 2
    if (premiumDiscount.currentZone === 'premium')  bearScore += 1
  } else if (signalDirection === 'short') {
    if (!choch.detected)               bearScore += 2
    if (choch.detected)                bullScore += 3
    if (premiumDiscount.currentZone === 'premium')  bearScore += 2
    if (premiumDiscount.currentZone === 'discount') bullScore += 1
  }

  if (orderBlocks.signalSupportOB && !orderBlocks.signalSupportOB.mitigated) bullScore += 2
  if (fvg.priceInFVG && fvg.currentFVG?.type === 'bullish') bullScore += 1
  if (fvg.priceInFVG && fvg.currentFVG?.type === 'bearish') bearScore += 1

  const smcStrength    = Math.abs(bullScore - bearScore)
  const smcBias        = bullScore > bearScore ? 'bullish' : bearScore > bullScore ? 'bearish' : 'neutral'

  // Key levels
  const nextSupport    = orderBlocks.nearestBullishOB?.price || liquidity.nearestSSL?.price || null
  const nextResistance = orderBlocks.nearestBearishOB?.price || liquidity.nearestBSL?.price || null
  const criticalLevel  = choch.chochLevel || structure.lastSwingLow?.price || null

  const summary = [
    `Market structure is ${structure.structure} with ${structure.structureStrength} conviction.`,
    choch.detected
      ? `⚠️ CHoCH ${choch.severity} detected — ${choch.description}`
      : `No CHoCH detected — ${signalDirection === 'long' ? 'bullish' : 'bearish'} thesis intact.`,
    `SMC bias is ${smcBias} (score ${bullScore}B vs ${bearScore}Be). ${liquidity.description}`,
  ].join(' ')

  return {
    structure,
    bos,
    choch,
    orderBlocks,
    fvg,
    liquidity,
    premiumDiscount,
    smcBias,
    smcBullishScore: bullScore,
    smcBearishScore: bearScore,
    smcStrength,
    summary,
    keyLevels: { nextSupport, nextResistance, criticalLevel },
  }
}
