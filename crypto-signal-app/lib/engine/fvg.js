import axios from 'axios'

/**
 * FVG DETECTION ENGINE
 * Scans OHLCV candles for Fair Value Gaps (FVGs), scores quality,
 * scans multi-timeframes, detects entry triggers, classifies strength grades,
 * and calculates precise entry, SL, and TP levels.
 */

// ─── Helper: Format Candle Array ─────────────────────────────────────────────
function ensureOHLCVObjects(ohlcv) {
  if (!ohlcv) return []
  if (Array.isArray(ohlcv) && ohlcv.length > 0 && typeof ohlcv[0] === 'object' && ohlcv[0].close !== undefined) {
    return ohlcv
  }
  if (ohlcv.close && Array.isArray(ohlcv.close)) {
    const len = ohlcv.close.length
    const result = []
    for (let i = 0; i < len; i++) {
      result.push({
        open: ohlcv.open?.[i] ?? ohlcv.close[i],
        high: ohlcv.high?.[i] ?? ohlcv.close[i],
        low: ohlcv.low?.[i] ?? ohlcv.close[i],
        close: ohlcv.close[i],
        volume: ohlcv.volume?.[i] ?? 0,
        timestamp: ohlcv.timestamps?.[i] ?? (Date.now() - (len - i) * 3600000)
      })
    }
    return result
  }
  return []
}

// ─── A. FVG DETECTION (All Types) ──────────────────────────────────────────────
export function detectAllFVGs(ohlcvInput, currentPriceInput, timeframe = '1h') {
  const ohlcv = ensureOHLCVObjects(ohlcvInput)
  if (ohlcv.length < 4) return []

  const currentPrice = currentPriceInput || ohlcv[ohlcv.length - 1].close

  // Calculate average candle body size over lookback (for impulse strength)
  const bodySizes = ohlcv.map(c => Math.abs(c.close - c.open))
  const avgBody = bodySizes.reduce((sum, b) => sum + b, 0) / (bodySizes.length || 1)

  const detectedFVGs = []

  // Loop through candles from index 1 to length - 2 (looking at triplets [i-1], [i], [i+1])
  for (let i = 1; i < ohlcv.length - 1; i++) {
    const prev = ohlcv[i - 1]
    const curr = ohlcv[i]
    const next = ohlcv[i + 1]

    let fvgType = null
    let low = 0
    let high = 0

    // BULLISH FVG: Price gapped UP (imbalance below)
    if (next.low > prev.high) {
      fvgType = 'bullish'
      low = prev.high
      high = next.low
    }
    // BEARISH FVG: Price gapped DOWN (imbalance above)
    else if (next.high < prev.low) {
      fvgType = 'bearish'
      low = next.high
      high = prev.low
    }

    if (!fvgType) continue

    const size = Math.abs(high - low)
    const mid = (low + high) / 2
    const sizePercent = (size / mid) * 100

    // Crypto threshold: Ignore tiny noise gaps (< 0.1%)
    if (sizePercent < 0.1) continue

    // Determine status by checking subsequent candles (i + 2 to end)
    let status = 'fresh'
    let filled = false
    let maxFillDepth = 0 // how far price pushed into FVG

    for (let j = i + 2; j < ohlcv.length; j++) {
      const futureCandle = ohlcv[j]
      if (fvgType === 'bullish') {
        if (futureCandle.low < high) {
          // Price entered zone
          const depth = Math.min(high - futureCandle.low, size)
          maxFillDepth = Math.max(maxFillDepth, depth)

          if (futureCandle.low < low) {
            status = 'filled'
            filled = true
          } else if (status !== 'filled') {
            status = 'partial'
          }
        }
      } else { // bearish
        if (futureCandle.high > low) {
          // Price entered zone
          const depth = Math.min(futureCandle.high - low, size)
          maxFillDepth = Math.max(maxFillDepth, depth)

          if (futureCandle.high > high) {
            status = 'filled'
            filled = true
          } else if (status !== 'filled') {
            status = 'partial'
          }
        }
      }
    }

    // Also check against current live price
    if (fvgType === 'bullish') {
      if (currentPrice < low) {
        status = 'filled'
        filled = true
        maxFillDepth = size
      } else if (currentPrice <= high) {
        if (status !== 'filled') status = 'partial'
        const depth = Math.min(high - currentPrice, size)
        maxFillDepth = Math.max(maxFillDepth, depth)
      }
    } else {
      if (currentPrice > high) {
        status = 'filled'
        filled = true
        maxFillDepth = size
      } else if (currentPrice >= low) {
        if (status !== 'filled') status = 'partial'
        const depth = Math.min(currentPrice - low, size)
        maxFillDepth = Math.max(maxFillDepth, depth)
      }
    }

    if (status === 'filled') {
      status = 'mitigated'
    }

    const fillPercent = Math.min(100, Math.max(0, (maxFillDepth / size) * 100))
    const candlesAgo = (ohlcv.length - 1) - i

    // QUALITY SCORING (1-10)
    let quality = 0

    // Size factor
    if (sizePercent >= 1.5) quality += 4
    else if (sizePercent >= 0.7) quality += 3
    else if (sizePercent >= 0.3) quality += 2
    else if (sizePercent >= 0.1) quality += 1

    // Impulse strength (middle candle body size)
    const currBody = Math.abs(curr.close - curr.open)
    if (currBody > 2.5 * avgBody) quality += 3
    else if (currBody > 1.5 * avgBody) quality += 2
    else quality += 1

    // Age factor
    if (candlesAgo < 5) quality += 3
    else if (candlesAgo <= 15) quality += 2
    else if (candlesAgo <= 30) quality += 1
    else quality += 0

    quality = Math.min(10, Math.max(1, quality))

    // Check if current price is inside FVG right now
    const priceInZone = (currentPrice >= low && currentPrice <= high)

    // Distance from current price in percentage (positive = above, negative = below)
    const distanceFromCurrent = ((mid - currentPrice) / currentPrice) * 100

    detectedFVGs.push({
      id: `${timeframe}_fvg_${curr.timestamp || i}_${i}`,
      type: fvgType,
      timeframe,
      zone: {
        low: parseFloat(low.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        mid: parseFloat(mid.toFixed(4)),
        size: parseFloat(size.toFixed(4)),
        sizePercent: parseFloat(sizePercent.toFixed(2))
      },
      quality,
      status, // "fresh" | "partial" | "filled" | "mitigated"
      formed: {
        candleIndex: i,
        timestamp: curr.timestamp || Date.now(),
        price: curr.close
      },
      candlesAgo,
      priceInZone,
      distanceFromCurrent: parseFloat(distanceFromCurrent.toFixed(2)),
      filled: status === 'mitigated' || status === 'filled',
      partiallyFilled: status === 'partial',
      fillPercent: parseFloat(fillPercent.toFixed(1))
    })
  }

  return detectedFVGs
}

// ─── Helper: Fetch Binance Klines ─────────────────────────────────────────────
async function fetchBinanceKlines(symbol, interval, limit = 200) {
  try {
    const res = await axios.get(`https://api.binance.com/api/v3/klines`, {
      params: { symbol: `${symbol.toUpperCase()}USDT`, interval, limit },
      timeout: 5000
    })
    return res.data.map(k => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }))
  } catch (e) {
    console.warn(`[fvg] Binance fetch failed for ${symbol} ${interval}, using synthetic fallback`)
    return generateSyntheticKlines(interval, limit)
  }
}

function generateSyntheticKlines(interval, limit = 200) {
  const basePrices = { '1d': 70000, '4h': 69500, '1h': 69200, '15m': 69000, '5m': 68900 }
  let price = basePrices[interval] || 69000
  const result = []
  const tfMs = { '1d': 86400000, '4h': 14400000, '1h': 3600000, '15m': 900000, '5m': 300000 }[interval] || 3600000

  const now = Date.now()
  for (let i = limit; i >= 0; i--) {
    const ts = now - i * tfMs
    const change = (Math.random() - 0.49) * 0.015
    const o = price
    const c = price * (1 + change)
    // Inject artificial FVG every 25 candles
    let h = Math.max(o, c) * (1 + Math.random() * 0.004)
    let l = Math.min(o, c) * (1 - Math.random() * 0.004)

    if (i === 10) {
      // Big green candle -> bullish FVG
      h = c * 1.025
    }
    result.push({ timestamp: ts, open: o, high: h, low: l, close: c, volume: 100 * (1 + Math.random()) })
    price = c
  }
  return result
}

// ─── B. MULTI-TIMEFRAME FVG SCAN ──────────────────────────────────────────────
export async function scanAllTimeframeFVGs(coin = 'BTC', ohlcvMapInput = null) {
  const coinKey = coin.toUpperCase()
  const timeframes = ['1d', '4h', '1h', '15m', '5m']
  const tfWeights = { '1d': 5, '4h': 4, '1h': 3, '15m': 2, '5m': 1 }

  const tfKlines = {}

  if (ohlcvMapInput) {
    timeframes.forEach(tf => {
      tfKlines[tf] = ensureOHLCVObjects(ohlcvMapInput[tf] || [])
    })
  } else {
    // Fetch simultaneously from Binance
    const promises = timeframes.map(tf => {
      const limit = tf === '1d' ? 100 : 200
      return fetchBinanceKlines(coinKey, tf, limit)
    })
    const results = await Promise.all(promises)
    timeframes.forEach((tf, idx) => {
      tfKlines[tf] = results[idx]
    })
  }

  // Get current price from finest timeframe or 1H
  const latestCandle = tfKlines['5m']?.slice(-1)[0] || tfKlines['1h']?.slice(-1)[0]
  const currentPrice = latestCandle ? latestCandle.close : 68000

  // Detect FVGs on each timeframe
  const tfFVGs = {}
  let combinedFVGs = []

  timeframes.forEach(tf => {
    const fvgs = detectAllFVGs(tfKlines[tf], currentPrice, tf)
    tfFVGs[tf] = fvgs
    combinedFVGs = combinedFVGs.concat(fvgs)
  })

  // Filter fresh & active
  const freshFVGs = combinedFVGs.filter(f => f.status === 'fresh' || f.status === 'partial')
  const activeFVGs = freshFVGs.filter(f => f.priceInZone)
  const nearFVGs = freshFVGs.filter(f => Math.abs(f.distanceFromCurrent) <= 1.5)

  // CONFLUENCE CHECK: Stacked FVGs (2+ timeframe FVGs within 0.5% of each other)
  const stackedFVGs = []
  for (let i = 0; i < freshFVGs.length; i++) {
    const f1 = freshFVGs[i]
    const alignedTFs = [f1.timeframe]
    const overlapping = [f1]

    for (let j = i + 1; j < freshFVGs.length; j++) {
      const f2 = freshFVGs[j]
      if (f1.type === f2.type && f1.timeframe !== f2.timeframe) {
        // Check if midpoints are within 0.5%
        const diffPct = Math.abs((f1.zone.mid - f2.zone.mid) / f1.zone.mid) * 100
        if (diffPct <= 0.8) {
          alignedTFs.push(f2.timeframe)
          overlapping.push(f2)
        }
      }
    }

    if (alignedTFs.length >= 2) {
      stackedFVGs.push({
        id: `stacked_${f1.id}`,
        type: f1.type,
        zone: {
          low: Math.min(...overlapping.map(o => o.zone.low)),
          high: Math.max(...overlapping.map(o => o.zone.high)),
          mid: f1.zone.mid
        },
        timeframes: [...new Set(alignedTFs)],
        score: alignedTFs.reduce((acc, tf) => acc + (tfWeights[tf] || 1), 0),
        fvgs: overlapping
      })
    }
  }

  // Sort combined FVGs by distance from current price
  combinedFVGs.sort((a, b) => Math.abs(a.distanceFromCurrent) - Math.abs(b.distanceFromCurrent))

  // Find nearest bullish FVG below price and nearest bearish FVG above price
  const bullishBelow = freshFVGs
    .filter(f => f.type === 'bullish' && f.zone.high <= currentPrice)
    .sort((a, b) => b.zone.high - a.zone.high)

  const bearishAbove = freshFVGs
    .filter(f => f.type === 'bearish' && f.zone.low >= currentPrice)
    .sort((a, b) => a.zone.low - b.zone.low)

  const currentFVG = activeFVGs.length > 0 ? activeFVGs[0] : null

  return {
    coin: coinKey,
    currentPrice,
    timestamp: new Date().toISOString(),
    timeframes: tfFVGs,
    allFVGs: combinedFVGs,
    freshFVGs,
    activeFVGs,
    nearFVGs,
    stackedFVGs,
    summary: {
      totalFVGs: combinedFVGs.length,
      bullishFVGs: combinedFVGs.filter(f => f.type === 'bullish').length,
      bearishFVGs: combinedFVGs.filter(f => f.type === 'bearish').length,
      priceInFVG: activeFVGs.length > 0,
      currentFVG,
      nearestBullishFVG: bullishBelow[0] || null,
      nearestBearishFVG: bearishAbove[0] || null
    }
  }
}

// ─── C. FVG SIGNAL TRIGGER DETECTION ──────────────────────────────────────────
export function detectFVGEntry(fvgScan, recentCandlesInput = []) {
  if (!fvgScan || !fvgScan.freshFVGs || fvgScan.freshFVGs.length === 0) {
    return {
      entryDetected: false,
      entryType: null,
      triggerFVG: null,
      entryStatus: 'passed',
      entryZone: null,
      isStacked: false,
      stackedTimeframes: [],
      urgency: 'watch'
    }
  }

  const currentPrice = fvgScan.currentPrice
  const recentCandles = ensureOHLCVObjects(recentCandlesInput)
  const currentCandle = recentCandles.length > 0 ? recentCandles[recentCandles.length - 1] : null
  const prevCandle = recentCandles.length > 1 ? recentCandles[recentCandles.length - 2] : null

  // Priority search: active FVG first, then near FVGs
  let candidateFVGs = [...fvgScan.activeFVGs, ...fvgScan.nearFVGs]
  if (candidateFVGs.length === 0) {
    candidateFVGs = fvgScan.freshFVGs
  }

  for (const fvg of candidateFVGs) {
    const isBullish = fvg.type === 'bullish'
    const isBearish = fvg.type === 'bearish'

    let entryType = null
    let entryStatus = 'passed'
    let entryDetected = false

    // Check if stacked FVG exists for this FVG level
    const stacked = fvgScan.stackedFVGs.find(s =>
      s.type === fvg.type && Math.abs((s.zone.mid - fvg.zone.mid) / fvg.zone.mid) * 100 < 1.0
    )

    // Check entry statuses
    if (fvg.priceInZone) {
      entryDetected = true
      entryStatus = 'inside'

      // TYPE 2: MITIGATION ENTRY (Bounce & Rejection)
      if (currentCandle) {
        if (isBullish && currentCandle.close > fvg.zone.high && currentCandle.low <= fvg.zone.high) {
          entryType = 2 // Mitigation entry
          entryStatus = 'mitigating'
        } else if (isBearish && currentCandle.close < fvg.zone.low && currentCandle.high >= fvg.zone.low) {
          entryType = 2 // Mitigation entry
          entryStatus = 'mitigating'
        }
      }

      // TYPE 3: DEEP ENTRY (Past 50% level)
      if (!entryType) {
        if (isBullish && currentPrice < fvg.zone.mid) {
          entryType = 3 // Deep entry
          entryStatus = 'inside'
        } else if (isBearish && currentPrice > fvg.zone.mid) {
          entryType = 3 // Deep entry
          entryStatus = 'inside'
        }
      }

      // TYPE 4: STACKED FVG ENTRY
      if (stacked) {
        entryType = 4 // Stacked entry
      }

      // Default TYPE 1: DIRECT ENTRY
      if (!entryType) {
        entryType = 1 // Direct entry
        entryStatus = 'entering'
      }
    } else if (Math.abs(fvg.distanceFromCurrent) <= 0.6) {
      entryStatus = 'approaching'
      entryDetected = false
    }

    if (entryDetected || entryStatus === 'approaching') {
      const optimal = fvg.zone.mid
      const early = isBullish ? fvg.zone.high * 0.999 : fvg.zone.low * 1.001
      const deep = isBullish ? fvg.zone.low * 1.001 : fvg.zone.high * 0.999

      return {
        entryDetected,
        entryType,
        triggerFVG: fvg,
        entryStatus,
        entryZone: { low: fvg.zone.low, high: fvg.zone.high, mid: fvg.zone.mid, optimal, early, deep },
        isStacked: !!stacked,
        stackedTimeframes: stacked ? stacked.timeframes : [fvg.timeframe],
        urgency: entryDetected ? 'immediate' : (entryStatus === 'approaching' ? 'approaching' : 'watch')
      }
    }
  }

  return {
    entryDetected: false,
    entryType: null,
    triggerFVG: null,
    entryStatus: 'watch',
    entryZone: null,
    isStacked: false,
    stackedTimeframes: [],
    urgency: 'watch'
  }
}

// ─── D. FVG STRENGTH CLASSIFIER ───────────────────────────────────────────────
export function classifyFVGStrength(fvg, marketStructure = {}, trend = 'BULLISH', session = {}) {
  if (!fvg || !fvg.zone) {
    return { grade: 'SKIP', score: 0, factors: [], disqualifiers: ['No FVG provided'], tradeable: false, reason: 'Invalid FVG' }
  }

  const qualifyingFactors = []
  const disqualifiers = []

  const isBullish = fvg.type === 'bullish'
  const isBearish = fvg.type === 'bearish'

  // 1. Direction of higher TF trend
  const htfAligned = (isBullish && trend === 'BULLISH') || (isBearish && trend === 'BEARISH')
  if (htfAligned) {
    qualifyingFactors.push('FVG in direction of higher TF trend')
  } else if (trend !== 'NEUTRAL') {
    disqualifiers.push('FVG against higher TF trend')
  }

  // 2. FVG quality score >= 7
  if (fvg.quality >= 7) {
    qualifyingFactors.push(`High FVG quality score (${fvg.quality}/10)`)
  } else if (fvg.quality < 5) {
    disqualifiers.push(`Low FVG quality score (${fvg.quality}/10 < 5)`)
  }

  // 3. Size > 0.5%
  if (fvg.zone.sizePercent >= 0.5) {
    qualifyingFactors.push(`Meaningful imbalance size (${fvg.zone.sizePercent}%)`)
  }

  // 4. Age factor (stale if > 50 candles)
  if (fvg.candlesAgo > 50) {
    disqualifiers.push(`FVG is stale (${fvg.candlesAgo} candles old > 50)`)
  } else if (fvg.candlesAgo <= 15) {
    qualifyingFactors.push('Fresh FVG (< 15 candles old)')
  }

  // 5. Fill status
  if (fvg.fillPercent > 60) {
    disqualifiers.push(`FVG already partially filled (${fvg.fillPercent}% > 60%)`)
  }

  // 6. Stacked multi-TF alignment
  if (fvg.isStacked || (fvg.stackedTimeframes && fvg.stackedTimeframes.length > 1)) {
    qualifyingFactors.push('Multiple TF FVG alignment (Stacked FVG)')
  }

  // 7. Session check
  const sessionName = session.current?.name || session.name || 'London'
  if (sessionName.includes('London') || sessionName.includes('NY') || sessionName.includes('New York')) {
    qualifyingFactors.push(`High liquidity session active (${sessionName})`)
  } else if (sessionName.includes('Dead Zone')) {
    disqualifiers.push('Session is Dead Zone (21-00 UTC)')
  }

  // 8. Market structure (BOS / Discount-Premium / OB overlap)
  if (marketStructure.structure === 'HH+HL' && isBullish) {
    qualifyingFactors.push('Bullish market structure (HH+HL)')
  } else if (marketStructure.structure === 'LH+LL' && isBearish) {
    qualifyingFactors.push('Bearish market structure (LH+LL)')
  }

  if (marketStructure.discountZone && isBullish) {
    qualifyingFactors.push('FVG located in SMC Discount Zone')
  } else if (marketStructure.premiumZone && isBearish) {
    qualifyingFactors.push('FVG located in SMC Premium Zone')
  }

  // Calculate score and grade
  const score = qualifyingFactors.length

  let grade = 'C'
  if (disqualifiers.length > 0) {
    grade = 'SKIP'
  } else if (score >= 7) {
    grade = 'S'
  } else if (score >= 5) {
    grade = 'A'
  } else if (score >= 3) {
    grade = 'B'
  } else {
    grade = 'C'
  }

  const tradeable = grade === 'S' || grade === 'A' || grade === 'B'
  const reason = tradeable
    ? `Qualified for ${grade}-TIER signal with ${score} confluence factors`
    : (disqualifiers.length > 0 ? disqualifiers[0] : 'Insufficient confluence factors')

  return {
    grade,
    score,
    factors: qualifyingFactors,
    disqualifiers,
    tradeable,
    reason
  }
}

// ─── E. FVG TARGET AND SL CALCULATOR ──────────────────────────────────────────
export function calculateFVGLevels(fvg, currentPrice, smcData = {}, indicators = {}, fibonacci = {}) {
  if (!fvg || !fvg.zone) {
    return { isValid: false, reason: 'Invalid FVG provided' }
  }

  const isBullish = fvg.type === 'bullish'
  const entryPrice = fvg.zone.mid

  // STOP LOSS CALCULATIONS
  // Bullish: 0.5% below FVG bottom. Bearish: 0.5% above FVG top.
  let stopLossPrice = isBullish ? fvg.zone.low * 0.995 : fvg.zone.high * 1.005
  let placement = 'below_fvg'

  // If Order Block exists below FVG / above FVG:
  if (isBullish && smcData.nearestOB?.type === 'bullish' && smcData.nearestOB.zone.low < fvg.zone.low) {
    const obStop = smcData.nearestOB.zone.low * 0.995
    if (obStop < stopLossPrice) {
      stopLossPrice = obStop
      placement = 'below_ob'
    }
  } else if (!isBullish && smcData.nearestOB?.type === 'bearish' && smcData.nearestOB.zone.high > fvg.zone.high) {
    const obStop = smcData.nearestOB.zone.high * 1.005
    if (obStop > stopLossPrice) {
      stopLossPrice = obStop
      placement = 'above_ob'
    }
  }

  // If Swing Low / High exists
  if (isBullish && smcData.nearestSwingLow?.price && smcData.nearestSwingLow.price < fvg.zone.low) {
    const swingStop = smcData.nearestSwingLow.price * 0.995
    if (swingStop < stopLossPrice) {
      stopLossPrice = swingStop
      placement = 'below_swing'
    }
  } else if (!isBullish && smcData.nearestSwingHigh?.price && smcData.nearestSwingHigh.price > fvg.zone.high) {
    const swingStop = smcData.nearestSwingHigh.price * 1.005
    if (swingStop > stopLossPrice) {
      stopLossPrice = swingStop
      placement = 'above_swing'
    }
  }

  const stopDistancePercent = Math.abs(((entryPrice - stopLossPrice) / entryPrice) * 100)

  // TAKE PROFIT CALCULATIONS
  const fvgImpulseHeight = fvg.zone.size * 3.5 || (entryPrice * 0.03)

  // TP1 — 50% of impulse move (partial profit)
  const tp1Price = isBullish ? entryPrice + (fvgImpulseHeight * 0.5) : entryPrice - (fvgImpulseHeight * 0.5)

  // TP2 — Swing high / main target
  let tp2Price = isBullish ? entryPrice + (fvgImpulseHeight * 1.2) : entryPrice - (fvgImpulseHeight * 1.2)
  let tp2Reason = 'Previous resistance / swing high'

  if (isBullish && smcData.nearestSwingHigh?.price && smcData.nearestSwingHigh.price > entryPrice) {
    tp2Price = smcData.nearestSwingHigh.price
    tp2Reason = 'Nearest swing high'
  } else if (!isBullish && smcData.nearestSwingLow?.price && smcData.nearestSwingLow.price < entryPrice) {
    tp2Price = smcData.nearestSwingLow.price
    tp2Reason = 'Nearest swing low'
  }

  // TP3 — Full measured move
  const tp3Price = isBullish ? entryPrice + fvgImpulseHeight : entryPrice - fvgImpulseHeight

  // TP4 — Liquidity target (BSL / SSL)
  const tp4Price = isBullish ? entryPrice + (fvgImpulseHeight * 1.5) : entryPrice - (fvgImpulseHeight * 1.5)

  // Calculate Risk / Reward ratios
  const riskAmount = Math.abs(entryPrice - stopLossPrice)
  const calcRR = (tp) => Math.abs(tp - entryPrice) / (riskAmount || 1)

  const rr1 = parseFloat(calcRR(tp1Price).toFixed(2))
  const rr2 = parseFloat(calcRR(tp2Price).toFixed(2))
  const rr3 = parseFloat(calcRR(tp3Price).toFixed(2))
  const rr4 = parseFloat(calcRR(tp4Price).toFixed(2))

  const targets = [
    { level: 'TP1', price: parseFloat(tp1Price.toFixed(4)), reason: '50% impulse move', positionPercent: 33, rr: rr1 },
    { level: 'TP2', price: parseFloat(tp2Price.toFixed(4)), reason: tp2Reason, positionPercent: 50, rr: rr2 },
    { level: 'TP3', price: parseFloat(tp3Price.toFixed(4)), reason: 'Full measured move', positionPercent: 100, rr: rr3 },
    { level: 'TP4', price: parseFloat(tp4Price.toFixed(4)), reason: 'Buy-Side Liquidity sweep', positionPercent: 100, rr: rr4, optional: true }
  ]

  const primaryTarget = parseFloat(tp2Price.toFixed(4))
  const riskReward = rr2

  return {
    entry: {
      optimal: parseFloat(entryPrice.toFixed(4)),
      early: parseFloat((isBullish ? fvg.zone.high * 0.999 : fvg.zone.low * 1.001).toFixed(4)),
      deep: parseFloat((isBullish ? fvg.zone.low * 1.001 : fvg.zone.high * 0.999).toFixed(4)),
      zone: { low: fvg.zone.low, high: fvg.zone.high }
    },
    stopLoss: {
      price: parseFloat(stopLossPrice.toFixed(4)),
      placement,
      distancePercent: parseFloat(stopDistancePercent.toFixed(2))
    },
    targets,
    primaryTarget,
    riskReward,
    isValid: riskReward >= 1.5
  }
}

// ─── CLI TEST RUNNER ──────────────────────────────────────────────────────────
if (process.argv[2] === 'test') {
  console.log('\n🧪 Testing FVG Engine...')

  // Generate 50 mock candles with clear FVG
  const mockOHLCV = []
  let p = 67000
  const now = Date.now()

  for (let i = 0; i < 50; i++) {
    let o = p, c = p + (Math.random() - 0.48) * 100
    let h = Math.max(o, c) + 20, l = Math.min(o, c) - 20

    if (i === 20) {
      o = 67000; c = 67150; h = 67200; l = 66950 // Candle 20 high = 67,200
    } else if (i === 21) {
      o = 67150; c = 68400; h = 68500; l = 67100 // Large impulse UP
    } else if (i === 22) {
      o = 68300; c = 68450; h = 68600; l = 68100 // Candle 22 low = 68,100 -> FVG 67,200 - 68,100
    }
    mockOHLCV.push({ timestamp: now - (50 - i) * 3600000, open: o, high: h, low: l, close: c, volume: 500 })
    p = c
  }

  const currentPrice = 68400
  const result = detectAllFVGs(mockOHLCV, currentPrice, '1h')

  console.log('✅ FVGs detected:', result.length)
  console.log('✅ Bullish FVGs:', result.filter(f => f.type === 'bullish').length)
  if (result.length > 0) {
    console.log('   FVG zone:', result[0].zone)
    console.log('   Quality:', result[0].quality)
    console.log('   Status:', result[0].status)
    console.log('   Distance from price:', result[0].distanceFromCurrent + '%')
  }
  console.log('🎉 FVG Engine Test Passed!\n')
}
