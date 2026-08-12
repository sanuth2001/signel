// Prompt 38 — Health Check Endpoint
import { getDb } from '../../../lib/database/db.js'
import { getEnvStatus } from '../../../lib/utils/validateEnv.js'
import fs from 'fs'
import path from 'path'

const startTime = Date.now()
let apiCallsToday = 0

export function incrementApiCalls() {
  apiCallsToday++
}

export async function GET() {
  try {
    const uptime = Date.now() - startTime
    const uptimeStr = formatUptime(uptime)

    // DB size
    const dbPath = path.join(process.cwd(), 'signals.db')
    let dbSize = 'N/A'
    try {
      const stats = fs.statSync(dbPath)
      dbSize = `${(stats.size / 1024 / 1024).toFixed(1)}MB`
    } catch (e) {}

    // Last signal time
    let lastSignal = 'Never'
    try {
      const db = getDb()
      const row = db.prepare('SELECT timestamp FROM signals ORDER BY timestamp DESC LIMIT 1').get()
      if (row?.timestamp) {
        const diff = Math.floor((Date.now() - new Date(row.timestamp).getTime()) / 60000)
        lastSignal = diff < 60 ? `${diff} minutes ago` : `${Math.floor(diff / 60)}h ago`
      }
    } catch (e) {}

    const envStatus = getEnvStatus()

    return Response.json({
      status: 'ok',
      version: '1.1.0',
      uptime: uptimeStr,
      uptimeMs: uptime,
      lastSignal,
      dbSize,
      apiCallsToday,
      env: {
        anthropic: envStatus.anthropic ? '✅' : '❌',
        etherscan: envStatus.etherscan ? '✅' : '⚠️ optional',
        telegram: envStatus.telegram ? '✅' : '⚠️ optional',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 })
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
