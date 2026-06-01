import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'signals.db')

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initializeSchema()
  }
  return db
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      signal TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      reasoning TEXT,
      risk TEXT,
      stopLoss REAL,
      target REAL,
      entryPrice REAL,
      regime TEXT,
      confluenceScore INTEGER,
      indicators TEXT,
      onchainData TEXT,
      outcome TEXT DEFAULT 'pending',
      closePrice REAL,
      pnlPercent REAL,
      postMortem TEXT
    );

    CREATE TABLE IF NOT EXISTS accuracy_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      updatedAt TEXT,
      totalSignals INTEGER,
      wins INTEGER,
      losses INTEGER,
      pending INTEGER,
      winRate REAL,
      avgConfidence REAL,
      bestRegime TEXT,
      worstSignalType TEXT,
      patternSummary TEXT
    );
  `)
}

export function saveSignal(signalData) {
  const stmt = getDb().prepare(`
    INSERT INTO signals (coin, timestamp, signal, confidence, reasoning, risk, stopLoss, target, entryPrice, regime, confluenceScore, indicators, onchainData, outcome)
    VALUES (@coin, @timestamp, @signal, @confidence, @reasoning, @risk, @stopLoss, @target, @entryPrice, @regime, @confluenceScore, @indicators, @onchainData, @outcome)
  `)
  const result = stmt.run({
    coin: signalData.coin || 'BTC',
    timestamp: signalData.timestamp || new Date().toISOString(),
    signal: signalData.signal || 'HOLD',
    confidence: signalData.confidence || 0,
    reasoning: signalData.reasoning || null,
    risk: signalData.risk || null,
    stopLoss: signalData.stopLoss || null,
    target: signalData.target || null,
    entryPrice: signalData.entryPrice || null,
    regime: signalData.regime || null,
    confluenceScore: signalData.confluenceScore || null,
    indicators: signalData.indicators || null,
    onchainData: signalData.onchainData || null,
    outcome: signalData.outcome || 'pending',
  })
  return result.lastInsertRowid
}

export function updateOutcome(id, outcome, closePrice, pnlPercent) {
  getDb().prepare(`
    UPDATE signals SET outcome = ?, closePrice = ?, pnlPercent = ? WHERE id = ?
  `).run(outcome, closePrice, pnlPercent, id)
}

export function getSignalById(id) {
  return getDb().prepare('SELECT * FROM signals WHERE id = ?').get(id) || null
}

export function getHistory(limit = 50) {
  return getDb().prepare('SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?').all(limit)
}

export function getPendingSignals() {
  return getDb().prepare("SELECT * FROM signals WHERE outcome = 'pending' ORDER BY timestamp DESC").all()
}

export function getLosingSignals(limit = 20) {
  return getDb().prepare("SELECT * FROM signals WHERE outcome = 'loss' ORDER BY timestamp DESC LIMIT ?").all(limit)
}

export function getAllSignals() {
  return getDb().prepare('SELECT * FROM signals ORDER BY timestamp DESC').all()
}

export function savePostMortem(id, postMortemData) {
  getDb().prepare('UPDATE signals SET postMortem = ? WHERE id = ?').run(JSON.stringify(postMortemData), id)
}

export function getAccuracyStats() {
  const all = getDb().prepare("SELECT * FROM signals WHERE outcome != 'pending'").all()
  const pending = getDb().prepare("SELECT COUNT(*) as count FROM signals WHERE outcome = 'pending'").get()

  const wins = all.filter(s => s.outcome === 'win').length
  const losses = all.filter(s => s.outcome === 'loss').length
  const total = all.length

  const winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0
  const avgConfidence = total > 0 ? parseFloat((all.reduce((s, r) => s + (r.confidence || 0), 0) / total).toFixed(1)) : 0

  // Best regime
  const regimeStats = {}
  for (const s of all) {
    if (!s.regime) continue
    if (!regimeStats[s.regime]) regimeStats[s.regime] = { wins: 0, total: 0 }
    regimeStats[s.regime].total++
    if (s.outcome === 'win') regimeStats[s.regime].wins++
  }
  const bestRegime = Object.entries(regimeStats).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0]?.[0] || null

  return {
    totalSignals: total + (pending?.count || 0),
    wins,
    losses,
    pending: pending?.count || 0,
    winRate,
    avgConfidence,
    bestRegime,
    byRegime: regimeStats,
  }
}

if (process.argv[2] === 'test') {
  const id = saveSignal({ coin: 'BTC', timestamp: new Date().toISOString(), signal: 'BUY', confidence: 82, reasoning: 'Test signal', risk: 'medium', stopLoss: 64000, target: 72000, entryPrice: 67000, regime: 'trending_up', confluenceScore: 75 })
  console.log('Saved signal id:', id)
  updateOutcome(id, 'win', 70000, 4.4)
  console.log('History:', getHistory(5))
  console.log('Stats:', getAccuracyStats())
}
