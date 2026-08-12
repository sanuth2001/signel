// Prompt 29 — Browser Alert System (Client-side only)
'use client'

const NOTIFICATION_HISTORY_KEY = 'crypto_signal_notifications'
const MAX_HISTORY = 50

export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  Notification.requestPermission()
  return 'requesting'
}

export function sendBrowserAlert(title, body, signalType = 'HOLD') {
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const icons = { BUY: '🟢', SELL: '🔴', HOLD: '🟡', WAIT: '⏳' }
  const icon = icons[signalType?.toUpperCase()] || '📊'
  try {
    new Notification(`${icon} ${title}`, {
      body,
      icon: '/favicon.ico',
      tag: 'crypto-signal',
    })
  } catch (e) {
    console.warn('Notification failed:', e.message)
  }
}

export function sendSignalAlert(signal, coin, confidence, entryPrice, target) {
  const icons = { BUY: '🟢', SELL: '🔴', HOLD: '🟡' }
  const icon = icons[signal] || '📊'
  const title = `${icon} ${signal} Signal — ${coin}`
  const body = `Confidence: ${confidence}% | Entry: $${entryPrice?.toLocaleString()} | Target: $${target?.toLocaleString()}`
  sendBrowserAlert(title, body, signal)
  addToNotificationHistory({ type: signal, coin, confidence, title, body, timestamp: new Date().toISOString() })
}

export function playAlertSound(type = 'signal') {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    if (type === 'buy') {
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2)
    } else if (type === 'sell') {
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2)
    } else {
      osc.frequency.setValueAtTime(660, ctx.currentTime)
    }

    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {
    // Audio API not available in all environments
  }
}

export function addToNotificationHistory(notification) {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(localStorage.getItem(NOTIFICATION_HISTORY_KEY) || '[]')
    const updated = [notification, ...existing].slice(0, MAX_HISTORY)
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(updated))
  } catch (e) {}
}

export function getNotificationHistory() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_HISTORY_KEY) || '[]')
  } catch (e) {
    return []
  }
}

export function clearNotificationHistory() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(NOTIFICATION_HISTORY_KEY)
}

export function markAllNotificationsRead() {
  if (typeof window === 'undefined') return
  try {
    const history = getNotificationHistory().map(n => ({ ...n, read: true }))
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history))
  } catch (e) {}
}

export function getUnreadCount() {
  return getNotificationHistory().filter(n => !n.read).length
}
