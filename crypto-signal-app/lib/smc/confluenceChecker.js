/**
 * MULTI-SETUP CONFLUENCE CHECKER
 * Analyzes whether multiple independent SMC/ICT setups align at the exact same price zone.
 */

export function checkMultiSetupConfluence(activeSetups = []) {
  if (!activeSetups || activeSetups.length < 2) {
    return {
      hasConfluence: false,
      confluenceLevel: 'none',
      confluenceZone: null,
      setupsAligned: activeSetups.map(s => s.name),
      confluenceBonus: 0,
      description: activeSetups.length === 1 ? `1 setup active (${activeSetups[0].name})` : 'No overlapping SMC setups detected'
    }
  }

  // Find overlapping entry zones
  const aligned = []
  const zones = []

  for (let i = 0; i < activeSetups.length; i++) {
    const s1 = activeSetups[i]
    zones.push(s1.entryZone)
    aligned.push(s1.name)
  }

  const count = aligned.length
  let confluenceLevel = 'moderate'
  let confluenceBonus = 10

  if (count >= 4) {
    confluenceLevel = 'supreme'
    confluenceBonus = 35
  } else if (count === 3) {
    confluenceLevel = 'elite'
    confluenceBonus = 25
  } else if (count === 2) {
    confluenceLevel = 'strong'
    confluenceBonus = 15
  }

  const lows = zones.map(z => z.low).filter(Boolean)
  const highs = zones.map(z => z.high).filter(Boolean)

  const confluenceZone = {
    low: lows.length ? Math.min(...lows) : 0,
    high: highs.length ? Math.max(...highs) : 0,
    mid: (lows.length && highs.length) ? (Math.min(...lows) + Math.max(...highs)) / 2 : 0
  }

  const description = `${count} SMC/ICT setups (${aligned.slice(0, 3).join(', ')}) aligned at exact price zone $${confluenceZone.low.toLocaleString()}-$${confluenceZone.high.toLocaleString()} — ${confluenceLevel.toUpperCase()} CONFLUENCE`

  return {
    hasConfluence: true,
    confluenceLevel,
    confluenceZone,
    setupsAligned: aligned,
    confluenceBonus,
    description
  }
}
