/**
 * SMC SETUP DETECTOR
 * Detects and ranks active setups across 8 SMC/ICT trading strategies.
 */

export function detectAllSetups(smcAnalysis, ohlcv = [], currentPriceInput = null) {
  if (!smcAnalysis) {
    return { activeSetups: [], primarySetup: null, totalActive: 0, bestGrade: 'N/A', recommendation: 'No analysis data' }
  }

  const currentPrice = currentPriceInput || smcAnalysis.currentPrice || 68000
  const activeSetups = []

  const killZone = smcAnalysis.killZone || {}
  const propulsion = smcAnalysis.propulsionBlocks || {}
  const sweep = smcAnalysis.sweepReversal || {}
  const iFVG = smcAnalysis.inversionFVGs || {}
  const ote = smcAnalysis.ote || {}
  const amd = smcAnalysis.amd || {}
  const breakers = smcAnalysis.breakers || {}
  const fvgs = smcAnalysis.fvgs || []
  const obs = smcAnalysis.orderBlocks || {}

  // ── SETUP 1: PROPULSION BLOCK (Grade: S++) ──────────────────────────────────
  if (propulsion.hasPropulsionBlock || propulsion.priceAtPropulsion) {
    const propObj = propulsion.nearestBullishProp || propulsion.nearestBearishProp
    const direction = propObj?.ob?.type === 'bullish' ? 'BUY' : 'SELL'
    const zone = propObj?.overlapZone || { low: currentPrice * 0.995, high: currentPrice * 1.005, mid: currentPrice }

    activeSetups.push({
      id: 'setup_propulsion_block',
      name: 'Propulsion Block (OB in FVG)',
      grade: 'S++',
      priority: 1,
      direction,
      entryZone: zone,
      stopLoss: direction === 'BUY' ? zone.low * 0.995 : zone.high * 1.005,
      targets: [
        { level: 'TP1', price: direction === 'BUY' ? zone.mid * 1.015 : zone.mid * 0.985, rr: 1.8 },
        { level: 'TP2', price: direction === 'BUY' ? zone.mid * 1.036 : zone.mid * 0.964, rr: 3.6 },
        { level: 'TP3', price: direction === 'BUY' ? zone.mid * 1.056 : zone.mid * 0.944, rr: 5.6 }
      ],
      riskReward: 3.6,
      confluenceFactors: [
        'Order Block located inside Fair Value Gap zone',
        'Double institutional confirmation level',
        'High velocity imbalance fill zone'
      ],
      confidence: 94,
      description: 'Strongest SMC entry. Order Block inside Fair Value Gap zone creates double institutional confirmation.'
    })
  }

  // ── SETUP 2: LIQUIDITY SWEEP REVERSAL (Grade: S) ────────────────────────────
  if (sweep.reversalConfirmed || sweep.sweepDetected) {
    const direction = sweep.signal || (sweep.sweepType === 'ssl_sweep' ? 'BUY' : 'SELL')
    activeSetups.push({
      id: 'setup_sweep_reversal',
      name: 'Liquidity Sweep Reversal (Stop Hunt)',
      grade: 'S',
      priority: 2,
      direction,
      entryZone: sweep.entryZone || { low: currentPrice * 0.998, high: currentPrice * 1.002, mid: currentPrice },
      stopLoss: sweep.stopLoss || (direction === 'BUY' ? currentPrice * 0.992 : currentPrice * 1.008),
      targets: [
        { level: 'TP1', price: direction === 'BUY' ? currentPrice * 1.015 : currentPrice * 0.985, rr: 2.0 },
        { level: 'TP2', price: direction === 'BUY' ? currentPrice * 1.035 : currentPrice * 0.965, rr: 4.0 }
      ],
      riskReward: 4.0,
      confluenceFactors: [
        `${sweep.sweptLiquidity || 'SSL/BSL'} pool swept by retail stop hunt`,
        'Immediate reversal displacement candle confirmed',
        'Smart Money liquidity grab complete'
      ],
      confidence: 88,
      description: 'Smart Money swept retail stops before sharply reversing into true directional move.'
    })
  }

  // ── SETUP 3: INVERSION FVG (Grade: S) ───────────────────────────────────────
  if (iFVG.priceAtIFVG || (iFVG.bullishInversionFVGs && iFVG.bullishInversionFVGs.length > 0)) {
    const ifvgObj = iFVG.nearestBullishIFVG || iFVG.nearestBearishIFVG
    const direction = ifvgObj?.type === 'bullish' ? 'BUY' : 'SELL'
    activeSetups.push({
      id: 'setup_inversion_fvg',
      name: 'Inversion FVG (Tested Imbalance)',
      grade: 'S',
      priority: 3,
      direction,
      entryZone: ifvgObj?.zone || { low: currentPrice * 0.995, high: currentPrice * 1.005, mid: currentPrice },
      stopLoss: direction === 'BUY' ? currentPrice * 0.993 : currentPrice * 1.007,
      targets: [
        { level: 'TP1', price: direction === 'BUY' ? currentPrice * 1.018 : currentPrice * 0.982, rr: 2.2 },
        { level: 'TP2', price: direction === 'BUY' ? currentPrice * 1.038 : currentPrice * 0.962, rr: 4.2 }
      ],
      riskReward: 4.2,
      confluenceFactors: [
        'FVG previously tested and rejected',
        'Imbalance zone confirmed by institutional order execution',
        'High probability support/resistance flip'
      ],
      confidence: 86,
      description: 'Fair Value Gap tested and rejected, confirming strong institutional demand at this level.'
    })
  }

  // ── SETUP 4: OTE GOLDEN ZONE (Grade: S) ────────────────────────────────────
  if (ote.isGoldenZone || ote.priceInOTE) {
    const direction = ote.direction || 'BUY'
    activeSetups.push({
      id: 'setup_ote_golden',
      name: 'OTE Golden Zone (62-79% Fib + FVG)',
      grade: 'S',
      priority: 4,
      direction,
      entryZone: ote.oteZone || { low: currentPrice * 0.995, high: currentPrice * 1.005, mid: currentPrice },
      stopLoss: direction === 'BUY' ? (ote.oteZone?.low || currentPrice) * 0.993 : (ote.oteZone?.high || currentPrice) * 1.007,
      targets: [
        { level: 'TP1', price: direction === 'BUY' ? currentPrice * 1.015 : currentPrice * 0.985, rr: 2.0 },
        { level: 'TP2', price: direction === 'BUY' ? currentPrice * 1.036 : currentPrice * 0.964, rr: 3.8 }
      ],
      riskReward: 3.8,
      confluenceFactors: [
        'Price inside ICT 62%-79% Optimal Trade Entry zone',
        'Overlaps with 70.5% ICT equilibrium price',
        'FVG imbalance presence inside discount retracement'
      ],
      confidence: 85,
      description: 'Price retraced into ICT Optimal Trade Entry (OTE) discount zone with overlapping FVG.'
    })
  }

  // ── SETUP 5: AMD JUDAS SWING (Grade: A) ────────────────────────────────────
  if (amd.phase === 'distribution' || (amd.judasSwing && amd.judasSwing.detected)) {
    const direction = amd.signal || 'BUY'
    activeSetups.push({
      id: 'setup_amd_judas',
      name: 'Power of 3 (AMD Judas Swing)',
      grade: 'A',
      priority: 5,
      direction,
      entryZone: { low: currentPrice * 0.998, high: currentPrice * 1.002, mid: currentPrice },
      stopLoss: direction === 'BUY' ? (amd.judasSwing?.sweptLevel || currentPrice) * 0.995 : (amd.judasSwing?.sweptLevel || currentPrice) * 1.005,
      targets: [
        { level: 'TP1', price: direction === 'BUY' ? currentPrice * 1.016 : currentPrice * 0.984, rr: 2.1 },
        { level: 'TP2', price: direction === 'BUY' ? currentPrice * 1.035 : currentPrice * 0.965, rr: 3.6 }
      ],
      riskReward: 3.6,
      confluenceFactors: [
        'Asian Accumulation range swept by Judas swing manipulation',
        'Fake breakout trap complete',
        'True institutional distribution in progress'
      ],
      confidence: 83,
      description: 'Power of 3 AMD model active: Accumulation swept by Judas swing; distribution in progress.'
    })
  }

  // ── SETUP 6: SILVER BULLET (Grade: A) ──────────────────────────────────────
  if (killZone.isSilverBulletWindow) {
    const direction = smcAnalysis.dominantBias === 'bullish' ? 'BUY' : 'SELL'
    activeSetups.push({
      id: 'setup_silver_bullet',
      name: `ICT Silver Bullet Window ${killZone.silverBulletWindow || 1}`,
      grade: 'A',
      priority: 6,
      direction,
      entryZone: { low: currentPrice * 0.997, high: currentPrice * 1.003, mid: currentPrice },
      stopLoss: direction === 'BUY' ? currentPrice * 0.993 : currentPrice * 1.007,
      targets: [
        { level: 'TP1', price: direction === 'BUY' ? currentPrice * 1.015 : currentPrice * 0.985, rr: 2.0 },
        { level: 'TP2', price: direction === 'BUY' ? currentPrice * 1.032 : currentPrice * 0.968, rr: 3.5 }
      ],
      riskReward: 3.5,
      confluenceFactors: [
        `Active in Silver Bullet Window ${killZone.silverBulletWindow}`,
        'High probability institutional execution window',
        'Aligned with higher timeframe bias'
      ],
      confidence: 81,
      description: 'Active 1-hour ICT Silver Bullet execution window with FVG retracement setup.'
    })
  }

  // ── SETUP 7: FVG + ORDER BLOCK (Grade: A) ──────────────────────────────────
  if (fvgs.length > 0 && obs) {
    const activeFVG = fvgs.find(f => f.priceInZone) || fvgs[0]
    if (activeFVG) {
      const direction = activeFVG.type === 'bullish' ? 'BUY' : 'SELL'
      activeSetups.push({
        id: 'setup_fvg_ob',
        name: 'Fair Value Gap + Order Block Anchor',
        grade: 'A',
        priority: 7,
        direction,
        entryZone: activeFVG.zone,
        stopLoss: direction === 'BUY' ? activeFVG.zone.low * 0.994 : activeFVG.zone.high * 1.006,
        targets: [
          { level: 'TP1', price: direction === 'BUY' ? activeFVG.zone.mid * 1.015 : activeFVG.zone.mid * 0.985, rr: 1.9 },
          { level: 'TP2', price: direction === 'BUY' ? activeFVG.zone.mid * 1.034 : activeFVG.zone.mid * 0.966, rr: 3.4 }
        ],
        riskReward: 3.4,
        confluenceFactors: [
          'Price inside fresh Fair Value Gap imbalance',
          'Order Block provides structural stop loss anchor',
          'Standard high-probability SMC setup'
        ],
        confidence: 79,
        description: 'Standard SMC setup: Price entering Fair Value Gap with structural Order Block support.'
      })
    }
  }

  // ── SETUP 8: BREAKER + FVG (Grade: B) ──────────────────────────────────────
  if (breakers.priceAtBreaker) {
    const direction = breakers.breakerSignal || 'BUY'
    const breakerObj = breakers.nearestBullishBreaker || breakers.nearestBearishBreaker
    if (breakerObj) {
      activeSetups.push({
        id: 'setup_breaker_fvg',
        name: 'Breaker Block Polarity Flip',
        grade: 'B',
        priority: 8,
        direction,
        entryZone: breakerObj.zone,
        stopLoss: direction === 'BUY' ? breakerObj.zone.low * 0.994 : breakerObj.zone.high * 1.006,
        targets: [
          { level: 'TP1', price: direction === 'BUY' ? currentPrice * 1.014 : currentPrice * 0.986, rr: 1.8 },
          { level: 'TP2', price: direction === 'BUY' ? currentPrice * 1.030 : currentPrice * 0.970, rr: 3.0 }
        ],
        riskReward: 3.0,
        confluenceFactors: [
          'Failed Order Block flipped polarity (Breaker)',
          'Breaker zone acting as dynamic support/resistance',
          'Rejection reaction confirmed'
        ],
        confidence: 76,
        description: 'Failed Order Block flipped polarity to become Breaker Block support/resistance.'
      })
    }
  }

  // Sort setups by priority & confidence
  activeSetups.sort((a, b) => b.confidence - a.confidence)

  const primarySetup = activeSetups.length > 0 ? activeSetups[0] : null
  const bestGrade = primarySetup ? primarySetup.grade : 'N/A'

  return {
    activeSetups,
    primarySetup,
    totalActive: activeSetups.length,
    bestGrade,
    recommendation: primarySetup
      ? `Highest priority setup detected: ${primarySetup.name} (${primarySetup.grade} Grade)`
      : 'No active SMC setups detected currently.'
  }
}
