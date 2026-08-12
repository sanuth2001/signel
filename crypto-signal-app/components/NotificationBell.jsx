'use client'
// Prompt 29 — In-App Notification Bell with browser push + history dropdown
import { useState, useEffect, useCallback, useRef } from 'react'

const MAX_NOTIFICATIONS = 50

// ─── Browser push permission ──────────────────────────────────────────────────
export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported')
  if (Notification.permission === 'granted') return Promise.resolve('granted')
  return Notification.requestPermission()
}

export function sendBrowserAlert(title, body, tag = 'signal') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag, icon: '/favicon.ico' })
  } catch (e) {}
}

// ─── In-memory notification store (shared via window) ────────────────────────
function getStore() {
  if (typeof window === 'undefined') return []
  if (!window.__signalNotifications) window.__signalNotifications = []
  return window.__signalNotifications
}

export function pushNotification(notification) {
  const store = getStore()
  store.unshift({ ...notification, id: Date.now(), read: false, timestamp: new Date().toISOString() })
  if (store.length > MAX_NOTIFICATIONS) store.splice(MAX_NOTIFICATIONS)
  // dispatch event so bell re-renders
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('signal-notification'))
}

// ─── Notification Bell Component ─────────────────────────────────────────────
export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const sync = useCallback(() => {
    setNotifications([...getStore()])
  }, [])

  useEffect(() => {
    sync()
    window.addEventListener('signal-notification', sync)
    return () => window.removeEventListener('signal-notification', sync)
  }, [sync])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    getStore().forEach(n => { n.read = true })
    sync()
  }

  const clearAll = () => {
    getStore().splice(0)
    sync()
  }

  const signalIcon = (type) => {
    if (type === 'BUY')  return '🟢'
    if (type === 'SELL') return '🔴'
    if (type === 'win')  return '✅'
    if (type === 'loss') return '❌'
    return '🔔'
  }

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead() }}
        className="relative p-2 rounded-lg hover:bg-gray-800/60 transition-colors"
        id="notification-bell-btn"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-red-500 text-white flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-gray-700/50 bg-gray-900 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30">
            <span className="text-sm font-bold text-white">🔔 Notifications</span>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <>
                  <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Mark all read</button>
                  <span className="text-gray-700">·</span>
                  <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Clear all</button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? 'opacity-60' : 'bg-gray-800/20'}`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{signalIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{n.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{n.body}</div>
                  </div>
                  <span className="text-[9px] text-gray-600 flex-shrink-0 mt-0.5">{timeAgo(n.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
