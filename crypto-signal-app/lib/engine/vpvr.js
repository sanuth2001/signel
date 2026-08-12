// ─── Volume Profile / VPVR Engine ─────────────────────────────────────────────
// Visible Range Volume Profile: identifies high-volume nodes (HVN) and
// low-volume nodes (LVN) which act as magnets and voids in price action.
// Point of Control (POC) = price level with highest traded volume.

// ─── A. COMPUTE VOLUME PROFILE ───────────────────────────────────────────────
/**
 * Build the volume profile for a given price range.
 * @param {Object} ohlcv - { high, low, close, volume }
 * @param {number} numBins - Number of price buckets (default 30)
 * @returns {Object} Volume profile with POC, HVN, LVN
 */
export function calculateVolumeProfile(ohlcv, numBins = 30) {
  const { high, low, close, volume } = ohlcv || {}
  if (!close || close.length < 10 || !volume || volume.length === 0) {
    return {
      poc: null,
      hvn: [],
      lvn: [],
      vaHigh: null,
      vaLow: null,
      bins: [],
      summary: 'Insufficient data for volume profile',
    }
  }

  const len = close.length
  const priceHigh = Math.max(...high)
  const priceLow = Math.min(...low)
  const binSize = (priceHigh - priceLow) / numBins

  if (binSize <= 0) {
    return { poc: null, hvn: [], lvn: [], vaHigh: null, vaLow: null, bins: [], summary: 'Price range too narrow' }
  }

  // Initialize bins
  const bins = Array.from({ length: numBins }, (_, i) => ({
    priceStart: parseFloat((priceLow + i * binSize).toFixed(2)),
    priceEnd: parseFloat((priceLow + (i + 1) * binSize).toFixed(2)),
    priceMid: parseFloat((priceLow + (i + 0.5) * binSize).toFixed(2)),
    volume: 0,
  }))

  // Distribute volume into bins using typical price
  for (let i = 0; i < len; i++) {
    const typicalPrice = (high[i] + low[i] + close[i]) / 3
    const binIdx = Math.min(Math.floor((typicalPrice - priceLow) / binSize), numBins - 1)
    if (binIdx >= 0 && binIdx < numBins) {
      bins[binIdx].volume += volume[i] || 0
    }
  }

  // Find POC (Point of Control) = highest volume bin
  const totalVolume = bins.reduce((s, b) => s + b.volume, 0)
  if (totalVolume === 0) return { poc: null, hvn: [], lvn: [], vaHigh: null, vaLow: null, bins, summary: 'No volume data' }

  const maxVol = Math.max(...bins.map(b => b.volume))
  const pocBin = bins.find(b => b.volume === maxVol)
  const poc = pocBin ? pocBin.priceMid : null

  // Calculate Value Area (70% of volume surrounding POC)
  // Sort bins by volume descending
  const sorted = [...bins].sort((a, b) => b.volume - a.volume)
  let vaVolume = 0
  const vaBins = []
  for (const bin of sorted) {
    vaVolume += bin.volume
    vaBins.push(bin)
    if (vaVolume >= totalVolume * 0.70) break
  }
  const vaPrices = vaBins.map(b => b.priceMid)
  const vaHigh = vaPrices.length > 0 ? parseFloat(Math.max(...vaPrices).toFixed(2)) : null
  const vaLow = vaPrices.length > 0 ? parseFloat(Math.min(...vaPrices).toFixed(2)) : null

  // Identify HVN (High Volume Nodes) = bins > 150% of average volume
  const avgVolume = totalVolume / numBins
  const hvn = bins
    .filter(b => b.volume >= avgVolume * 1.5)
    .map(b => ({ price: b.priceMid, volume: parseFloat(b.volume.toFixed(0)), relativeVolume: parseFloat((b.volume / avgVolume).toFixed(2)) }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)

  // Identify LVN (Low Volume Nodes) = bins < 40% of average volume
  const lvn = bins
    .filter(b => b.volume > 0 && b.volume <= avgVolume * 0.4)
    .map(b => ({ price: b.priceMid, volume: parseFloat(b.volume.toFixed(0)), relativeVolume: parseFloat((b.volume / avgVolume).toFixed(2)) }))
    .sort((a, b) => a.volume - b.volume)
    .slice(0, 5)

  return {
    poc: parseFloat(poc?.toFixed(2) || 0),
    hvn,
    lvn,
    vaHigh,
    vaLow,
    bins: bins.map(b => ({ ...b, volume: parseFloat(b.volume.toFixed(0)) })),
    summary: `POC: $${poc?.toFixed(0)} | VA: $${vaLow?.toFixed(0)}–$${vaHigh?.toFixed(0)} | ${hvn.length} HVN, ${lvn.length} LVN`,
  }
}

// ─── B. ANALYSE CURRENT PRICE RELATIVE TO VPVR ──────────────────────────────
/**
 * Analyse where current price sits in the volume profile
 * @returns insights about price position and expected behavior
 */
export function analyzeVPVRPosition(volumeProfile, currentPrice) {
  if (!volumeProfile?.poc || !currentPrice) {
    return { signal: 'NEUTRAL', description: 'Volume profile unavailable', confidenceBoost: 0 }
  }

  const { poc, vaHigh, vaLow, hvn, lvn } = volumeProfile
  const priceToPoC = ((currentPrice - poc) / poc) * 100

  // Is price at POC? (within 0.3%)
  const atPOC = Math.abs(priceToPoC) < 0.3

  // Is price inside Value Area?
  const insideVA = vaHigh && vaLow && currentPrice >= vaLow && currentPrice <= vaHigh

  // Is price above or below Value Area?
  const aboveVA = vaHigh && currentPrice > vaHigh
  const belowVA = vaLow && currentPrice < vaLow

  // Find nearest HVN and LVN
  const nearestHVN = hvn.reduce((best, node) => {
    const dist = Math.abs(node.price - currentPrice)
    const bestDist = best ? Math.abs(best.price - currentPrice) : Infinity
    return dist < bestDist ? node : best
  }, null)

  const nearestLVN = lvn.reduce((best, node) => {
    const dist = Math.abs(node.price - currentPrice)
    const bestDist = best ? Math.abs(best.price - currentPrice) : Infinity
    return dist < bestDist ? node : best
  }, null)

  const nearestHVNDist = nearestHVN ? Math.abs(nearestHVN.price - currentPrice) / currentPrice * 100 : Infinity
  const nearestLVNDist = nearestLVN ? Math.abs(nearestLVN.price - currentPrice) / currentPrice * 100 : Infinity

  // At an HVN → price tends to consolidate or reverse
  const atHVN = nearestHVNDist < 0.5
  // At an LVN → price tends to move through quickly (vacuum)
  const atLVN = nearestLVNDist < 0.5

  let signal = 'NEUTRAL'
  let description = ''
  let confidenceBoost = 0
  let behavior = 'neutral'

  if (atPOC) {
    signal = 'NEUTRAL'
    behavior = 'consolidation'
    description = `Price at Point of Control ($${poc.toLocaleString()}) — maximum congestion zone, expect slow chop or reversal`
    confidenceBoost = -5
  } else if (atHVN) {
    signal = 'NEUTRAL'
    behavior = 'support_resistance'
    description = `Price at High Volume Node ($${nearestHVN?.price?.toLocaleString()}) — strong S/R level, ${currentPrice > poc ? 'support' : 'resistance'} likely`
    confidenceBoost = currentPrice > poc ? 8 : -5
  } else if (atLVN) {
    signal = currentPrice > poc ? 'BUY' : 'SELL'
    behavior = 'fast_move'
    description = `Price in Low Volume Node ($${nearestLVN?.price?.toLocaleString()}) — vacuum zone, price tends to move quickly through here toward next HVN`
    confidenceBoost = 10
  } else if (aboveVA) {
    signal = 'BUY'
    behavior = 'breakout_strength'
    description = `Price above Value Area ($${vaHigh?.toLocaleString()}) — bullish breakout, continuation expected toward upper HVN at $${hvn.find(h => h.price > vaHigh)?.price?.toLocaleString() || 'extension'}`
    confidenceBoost = 8
  } else if (belowVA) {
    signal = 'SELL'
    behavior = 'breakdown_strength'
    description = `Price below Value Area ($${vaLow?.toLocaleString()}) — bearish breakdown, continuation expected toward lower HVN at $${hvn.filter(h => h.price < vaLow).slice(-1)[0]?.price?.toLocaleString() || 'extension'}`
    confidenceBoost = 8
  } else if (insideVA) {
    signal = 'NEUTRAL'
    behavior = 'ranging'
    description = `Price inside Value Area ($${vaLow?.toLocaleString()}–$${vaHigh?.toLocaleString()}) — ranging territory, POC at $${poc?.toLocaleString()} acts as magnet`
    confidenceBoost = -8
  }

  return {
    signal,
    behavior,
    description,
    confidenceBoost,
    poc,
    vaHigh,
    vaLow,
    atPOC,
    atHVN,
    atLVN,
    insideVA,
    aboveVA,
    belowVA,
    nearestHVN,
    nearestLVN,
    priceToPoC: parseFloat(priceToPoC.toFixed(2)),
  }
}

// ─── C. FIND SUPPORT & RESISTANCE FROM VPVR ──────────────────────────────────
/**
 * Extract S/R levels from the volume profile to use as stops and targets
 */
export function vpvrSupportResistance(volumeProfile, currentPrice) {
  if (!volumeProfile?.hvn || !currentPrice) return { support: null, resistance: null, targets: [] }

  const { hvn, poc } = volumeProfile

  const above = hvn.filter(h => h.price > currentPrice).sort((a, b) => a.price - b.price)
  const below = hvn.filter(h => h.price < currentPrice).sort((a, b) => b.price - a.price)

  const nearestResistance = above[0]?.price || null
  const nearestSupport = below[0]?.price || null

  const targets = above.slice(0, 3).map(h => ({
    price: h.price,
    strength: h.relativeVolume > 2 ? 'strong' : 'moderate',
    relativeVolume: h.relativeVolume,
  }))

  return {
    support: nearestSupport ? parseFloat(nearestSupport.toFixed(2)) : null,
    resistance: nearestResistance ? parseFloat(nearestResistance.toFixed(2)) : null,
    poc,
    targets,
    supportStrength: below[0]?.relativeVolume > 2 ? 'strong' : 'moderate',
    resistanceStrength: above[0]?.relativeVolume > 2 ? 'strong' : 'moderate',
  }
}

// ─── D. MASTER VPVR ANALYSIS ──────────────────────────────────────────────────
export function analyzeVPVR(ohlcv, currentPrice) {
  if (!ohlcv || !currentPrice) return null

  const profile = calculateVolumeProfile(ohlcv, 30)
  const position = analyzeVPVRPosition(profile, currentPrice)
  const levels = vpvrSupportResistance(profile, currentPrice)

  return {
    profile,
    position,
    levels,
    summary: position.description,
  }
}

// ─── TEST CLI ─────────────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  const n = 100
  const close = Array.from({ length: n }, (_, i) => 65000 + Math.sin(i * 0.3) * 3000 + (Math.random() - 0.5) * 500)
  const high = close.map(c => c * 1.005)
  const low = close.map(c => c * 0.995)
  const volume = Array.from({ length: n }, (_, i) => {
    // Cluster volume near 64000 and 67000
    const distTo64k = Math.abs(close[i] - 64000)
    const distTo67k = Math.abs(close[i] - 67000)
    const baseVol = 1e9
    const boost = Math.max(0, 1 - distTo64k / 2000) + Math.max(0, 1 - distTo67k / 2000)
    return baseVol * (1 + boost * 3)
  })

  const currentPrice = 65500
  const result = analyzeVPVR({ high, low, close, volume }, currentPrice)

  console.log('=== VPVR Test ===')
  console.log('POC:', '$' + result.profile.poc?.toLocaleString())
  console.log('Value Area:', '$' + result.profile.vaLow?.toLocaleString(), '—', '$' + result.profile.vaHigh?.toLocaleString())
  console.log('HVN count:', result.profile.hvn.length)
  console.log('LVN count:', result.profile.lvn.length)
  console.log('Top HVNs:', result.profile.hvn.slice(0, 3).map(h => '$' + h.price.toLocaleString()))
  console.log('Position Signal:', result.position.signal)
  console.log('Behavior:', result.position.behavior)
  console.log('Description:', result.position.description)
  console.log('Confidence Boost:', result.position.confidenceBoost)
  console.log('Nearest Support:', '$' + result.levels.support?.toLocaleString())
  console.log('Nearest Resistance:', '$' + result.levels.resistance?.toLocaleString())
  console.log('\n✅ VPVR test passed!')
}
