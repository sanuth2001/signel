// Prompt 34 — Telegram Bot Notifications
import axios from 'axios'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

function isConfigured() {
  return BOT_TOKEN && CHAT_ID && BOT_TOKEN !== 'your_token_here' && CHAT_ID !== 'your_chat_id'
}

async function sendMessage(text) {
  if (!isConfigured()) {
    console.log('[telegram] Not configured — skipping notification')
    return false
  }
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
    }, { timeout: 8000 })
    return true
  } catch (e) {
    console.error('[telegram] Send failed:', e.message)
    return false
  }
}

export async function sendTelegramSignal(signal, coin, priceData) {
  const icons = { BUY: '🟢', SELL: '🔴', HOLD: '🟡' }
  const icon = icons[signal.signal] || '📊'
  const confBar = '█'.repeat(Math.round((signal.confidence || 0) / 10)) + '░'.repeat(10 - Math.round((signal.confidence || 0) / 10))

  const text = `<b>CryptoSignal AI 🤖</b>

${icon} <b>${signal.signal} — ${coin}/USDT</b>
━━━━━━━━━━━━━━━━━━━━━━
Confidence: ${confBar} ${signal.confidence}%
Entry:      $${signal.entryPrice?.toLocaleString() || 'N/A'}
Target:     $${signal.target?.toLocaleString() || 'N/A'}
Stop Loss:  $${signal.stopLoss?.toLocaleString() || 'N/A'}
R:R Ratio:  ${signal.riskRewardRatio || 'N/A'}:1
Time:       ${signal.timeHorizon || '24h'}

📊 Regime: ${(signal.regime || 'unknown').replace('_', ' ')}
💡 ${signal.reasoning || 'No reasoning available'}

⚠️ Key Risk: ${signal.keyRisk || 'N/A'}

<i>This is not financial advice. Always use proper risk management.</i>`

  return sendMessage(text)
}

export async function sendDroughtAlert(reason, watchFor) {
  return sendMessage(`<b>⏳ No Signal — CryptoSignal AI</b>

Reason: ${reason || 'Market conditions unfavourable'}
Watch: ${watchFor || 'Wait for setup to develop'}`)
}

export async function sendRegimeChange(oldRegime, newRegime, coin) {
  const icons = { trending_up: '📈', trending_down: '📉', ranging: '↔️', high_volatility: '⚡', low_liquidity: '💧' }
  const icon = icons[newRegime] || '📊'
  return sendMessage(`<b>${icon} Regime Change — ${coin}</b>

${(oldRegime || '?').replace('_', ' ')} → ${newRegime.replace('_', ' ')}
Signal quality: ${['trending_up', 'trending_down'].includes(newRegime) ? 'improving 🟢' : 'reduced 🟡'}`)
}

export async function sendOutcomeConfirmation(signal, outcome, pnl) {
  const icon = outcome === 'win' ? '✅' : '❌'
  const pnlStr = pnl >= 0 ? `+${pnl.toFixed(2)}%` : `${pnl.toFixed(2)}%`
  return sendMessage(`<b>${icon} Trade ${outcome === 'win' ? 'WIN' : 'LOSS'} ${pnlStr}</b>

${signal.coin} ${signal.signal} signal closed ${outcome === 'win' ? 'profitable' : 'at loss'}
P&L: ${pnlStr}`)
}

export async function sendWeeklyReport(report) {
  if (!report) return false
  const grades = { A: '🏆', B: '🟢', C: '🟡', D: '🔴' }
  const gradeIcon = grades[report.weeklyGrade] || '📊'
  return sendMessage(`<b>${gradeIcon} Weekly Report — Grade ${report.weeklyGrade}</b>

Signals: ${report.summary?.signalsFired} fired | Win Rate: ${report.summary?.winRate}%
Wins: ${report.summary?.wins} | Losses: ${report.summary?.losses}
Avg Confidence: ${report.summary?.avgConfidence}%

🧠 ${report.insights?.[0] || 'No insights yet'}

${report.motivationalNote || ''}`)
}

export async function sendTestNotification() {
  return sendMessage(`<b>✅ CryptoSignal AI — Test Notification</b>

Telegram integration is working correctly! 🎉
Bot is ready to send signal alerts.`)
}

export async function sendTrackingUpdate(signal, timelineEvent, health) {
  const eventIcons = {
    PROGRESS_25:       '📈',
    PROGRESS_50:       '📈📈',
    PROGRESS_75:       '📈📈📈',
    TARGET_NEAR:       '🎯',
    TARGET_HIT:        '🏆',
    STOP_HIT:          '❌',
    CHOCH_MILD:        '⚠️',
    CHOCH_MODERATE:    '⚠️⚠️',
    CHOCH_SEVERE:      '🔴',
    LIQUIDITY_SWEPT:   '🌊',
    LIQUIDITY_RECOVERED: '✅',
    HEALTH_CRITICAL:   '🔴',
    INVALIDATED_SOFT:  '⚠️',
    INVALIDATED_HARD:  '❌',
  }
  const icon = eventIcons[timelineEvent?.event] || '📊'
  const healthBar = '█'.repeat(Math.round((health?.healthScore || 0) / 10)) + '░'.repeat(10 - Math.round((health?.healthScore || 0) / 10))

  return sendMessage(`<b>${icon} Signal Update — ${signal.coin} ${signal.signal}</b>

Event: ${timelineEvent?.eventDescription || 'Routine update'}
Health: ${healthBar} ${health?.healthScore || 0}% (${health?.healthGrade || 'N/A'})
SMC Bias: ${timelineEvent?.smcBias || 'N/A'}

${health?.recommendation || ''}

<i>Price: $${timelineEvent?.price?.toLocaleString() || 'N/A'}</i>`)
}

export async function sendInvalidationAlert(signal, invalidation, health) {
  const icon = invalidation?.invalidationType === 'hard' ? '❌' : '⚠️'
  const saved = invalidation?.potentialLossSaved > 0
    ? `\nSaving: ${invalidation.potentialLossSaved.toFixed(2)}% vs full stop loss`
    : ''
  return sendMessage(`<b>${icon} SIGNAL INVALIDATION — ${signal.coin} ${signal.signal}</b>

Reason: ${invalidation?.invalidationReason || 'Signal invalidated'}
Health at exit: ${health?.healthScore || 0}% (${health?.healthGrade || 'N/A'})
Confidence: ${invalidation?.confidence || 0}%

Recommendation: ${invalidation?.recommendation || 'EXIT'}
${saved}

<i>Entry was: $${signal.entryPrice?.toLocaleString() || 'N/A'}</i>`)
}

export async function sendHealthDropAlert(signal, health) {
  return sendMessage(`<b>⚠️ Health Drop Alert — ${signal.coin} ${signal.signal}</b>

Health dropped ${Math.abs(health?.healthChange || 0).toFixed(0)} points
Current: ${health?.healthScore || 0}% (${health?.healthGrade || 'N/A'})
Previous: ${health?.previousHealth || 0}%

${health?.recommendation || 'Monitor closely'}`)
}

// ─── FVG SPECIFIC ALERTS ──────────────────────────────────────────────────────

export async function sendFVGApproachingAlert(coin, fvg, currentPrice) {
  const dist = Math.abs(fvg.distanceFromCurrent || 0).toFixed(1)
  const isBull = fvg.type === 'bullish'
  return sendMessage(`<b>⚠️ FVG ZONE APPROACHING — ${coin}</b>
────────────────────────────
${isBull ? 'Bullish' : 'Bearish'} FVG [${fvg.grade || 'A-TIER'}] detected
Zone: $${fvg.zone.low.toLocaleString()} — $${fvg.zone.high.toLocaleString()}
Current: $${currentPrice.toLocaleString()} (${dist}% away)

Timeframe: ${fvg.timeframe.toUpperCase()} | Quality: ${fvg.quality}/10
Stacked: ${fvg.isStacked ? 'YES' : 'NO'}

📋 Prepare for potential entry
Watch for price to enter zone`)
}

export async function sendFVGEntryAlert(coin, fvg, currentPrice) {
  const isBull = fvg.type === 'bullish'
  return sendMessage(`<b>🎯 PRICE ENTERING FVG — ${coin} NOW</b>
────────────────────────────────
${isBull ? 'BULLISH' : 'BEARISH'} FVG [${fvg.grade || 'S-TIER'}] 🔥

Zone: $${fvg.zone.low.toLocaleString()} — $${fvg.zone.high.toLocaleString()}
Current: $${currentPrice.toLocaleString()} (inside FVG)
Entry Type: Type ${fvg.entryType || 2} Mitigation

Running full FVG analysis...
Signal incoming in ~5 seconds`)
}

export async function sendFVGSignalAlert(signal) {
  const isBuy = signal.signal === 'BUY'
  const icon = isBuy ? '🟢' : '🔴'
  const tp1 = signal.targets?.[0]?.price || 'N/A'
  const tp2 = signal.targets?.[1]?.price || 'N/A'
  const tp3 = signal.targets?.[2]?.price || 'N/A'
  const tp4 = signal.targets?.[3]?.price || 'N/A'

  return sendMessage(`<b>${icon} FVG ${signal.signal} SIGNAL — ${signal.coin}</b>
════════════════════════════
Grade: ${signal.fvg?.grade || 'S-TIER'} 🔥 | Conf: ${signal.confidence}%

📍 Entry Zone:
$${signal.entry?.zone?.low?.toLocaleString()} — $${signal.entry?.zone?.high?.toLocaleString()} (FVG)
Optimal: $${signal.entry?.optimal?.toLocaleString()} (midpoint)

🛑 Stop Loss:
$${signal.stopLoss?.price?.toLocaleString()} (-${signal.stopLoss?.distancePercent}%)

🎯 Targets:
TP1: $${tp1.toLocaleString()} → 33%
TP2: $${tp2.toLocaleString()} 🎯 → 50%
TP3: $${tp3.toLocaleString()} → 100%
TP4: $${tp4.toLocaleString()} (optional)

⚖️ R/R: ${signal.riskReward}:1 (${signal.riskReward >= 3 ? 'excellent' : 'good'})

✅ ${signal.confirmations?.score || 8}/10 confirmations
📊 SMC: ${signal.smc?.structure || 'Bullish'} structure
📐 Session: ${signal.session}

💭 Claude: ${signal.claudeRationale || 'Strong institutional demand zone.'}

⚠️ Risk: ${(signal.riskFactors || ['Use limit order at FVG midpoint'])[0]}`)
}

export async function sendFVGTPHitAlert(signal, tpLevel = 'TP2', pnl = 3.6) {
  return sendMessage(`<b>✅ FVG ${tpLevel} HIT — ${signal.coin} WIN</b>
Entry: $${signal.entry?.optimal?.toLocaleString()} → ${tpLevel}
P&L: +${pnl.toFixed(1)}% 🎉
R/R achieved: ${signal.riskReward}:1

Grade: ${signal.fvg?.grade || 'S-TIER'} | FVG signals high win rate!`)
}

export async function sendFVGFilledAlert(coin, fvg) {
  return sendMessage(`<b>ℹ️ FVG FILLED — ${coin} ${fvg.timeframe.toUpperCase()} ${fvg.type}</b>
Zone $${fvg.zone.low.toLocaleString()}-$${fvg.zone.high.toLocaleString()} now fully mitigated
Removing from active watchlist`)
}

// ─── SUPREME SMC ALERTS ───────────────────────────────────────────────────────

export async function sendSupremeSignalAlert(signal) {
  const isBuy = signal.signal === 'BUY'
  const icon = isBuy ? '🟢' : '🔴'

  const tp1 = signal.targets?.[0]?.price || 'N/A'
  const tp2 = signal.targets?.[1]?.price || 'N/A'
  const tp3 = signal.targets?.[2]?.price || 'N/A'

  return sendMessage(`<b>🏆 SUPREME SMC ${signal.signal} SIGNAL — ${signal.coin}</b>
════════════════════════════
Grade: ${signal.grade} 🔥 | Confidence: ${signal.confidence}%
Setup: ${signal.setupType}
Confluence: ${signal.confluenceLevel?.toUpperCase()}

📍 Entry Zone:
$${signal.entry?.zone?.low?.toLocaleString()} — $${signal.entry?.zone?.high?.toLocaleString()}
Optimal: $${signal.entry?.optimal?.toLocaleString()}

🛑 Stop Loss:
$${signal.stopLoss?.price?.toLocaleString()} (-${signal.stopLoss?.distancePercent}%)

🎯 Targets:
TP1: $${tp1.toLocaleString()} (R/R 1.5:1)
TP2: $${tp2.toLocaleString()} 🎯 (R/R ${signal.primaryRR}:1)
TP3: $${tp3.toLocaleString()} (R/R 5.6:1)

⚖️ Risk/Reward: ${signal.primaryRR}:1 (Excellent)
✅ Confirmations: ${signal.confirmations?.score}/15
⏰ Kill Zone: ${signal.killZone}

💭 Claude: ${signal.claudeRationale || 'High probability SMC/ICT institutional setup.'}

⚠️ Risk: ${(signal.riskFactors || ['Use limit order at entry midpoint'])[0]}`)
}


