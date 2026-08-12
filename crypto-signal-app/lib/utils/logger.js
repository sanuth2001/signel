// Prompt 38 — Logger Utility
import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'logs')

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function writeLog(filename, message) {
  try {
    ensureLogDir()
    const timestamp = new Date().toISOString()
    const line = `[${timestamp}] ${message}\n`
    fs.appendFileSync(path.join(LOG_DIR, filename), line, 'utf8')
  } catch (e) {
    // Logging should never break the app
  }
}

export const logger = {
  error: (message, data = '') => {
    const msg = data ? `${message} | ${JSON.stringify(data)}` : message
    console.error(`[ERROR] ${msg}`)
    writeLog('error.log', msg)
  },
  signal: (coin, signal, confidence) => {
    const msg = `SIGNAL | coin=${coin} signal=${signal} confidence=${confidence}%`
    console.log(`[SIGNAL] ${msg}`)
    writeLog('signals.log', msg)
  },
  apiFailure: (service, error) => {
    const msg = `API_FAILURE | service=${service} error=${error}`
    console.warn(`[API] ${msg}`)
    writeLog('api_failures.log', msg)
  },
  info: (message) => {
    console.log(`[INFO] ${message}`)
  },
}

export default logger
