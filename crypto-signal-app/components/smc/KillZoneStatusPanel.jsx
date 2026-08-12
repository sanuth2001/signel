'use client'

export default function KillZoneStatusPanel({ killZone }) {
  const kz = killZone || {
    currentKillZone: 'ny_open',
    killZoneName: 'New York Open & Overlap Kill Zone 🔥',
    killZoneAccuracy: 84,
    timeInKillZone: 45,
    timeRemainingInKillZone: 97,
    isSilverBulletWindow: true,
    silverBulletWindow: 3,
    qualityMultiplier: 1.25,
    isDeadZone: false,
    nextKillZone: { name: 'NY PM Zone', startsIn: 240 },
    recommendation: '🔥 PEAK NY KILL ZONE — Look for Judas reversal distribution'
  }

  const isPeak = kz.currentKillZone === 'london_open' || kz.currentKillZone === 'ny_open'

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏰</span>
          <div>
            <h3 className="font-bold text-white tracking-wide">ICT KILL ZONE STATUS</h3>
            <p className="text-xs text-gray-400">Institutional Execution Windows</p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
          kz.isDeadZone
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : (isPeak ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40')
        }`}>
          {kz.isDeadZone ? '🛑 DEAD ZONE' : (isPeak ? '🟢 PEAK LIQUIDITY' : '🔵 ACTIVE')}
        </span>
      </div>

      {/* Main Kill Zone Info */}
      <div className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">{kz.killZoneName}</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {kz.killZoneAccuracy}% Historical Accuracy
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-gray-800/80">
          <div>
            <span className="text-gray-400">Remaining in Window:</span>
            <div className="font-bold font-mono text-white text-sm mt-0.5">{kz.timeRemainingInKillZone} mins</div>
          </div>
          <div>
            <span className="text-gray-400">Quality Multiplier:</span>
            <div className="font-bold font-mono text-amber-400 text-sm mt-0.5">+{kz.qualityMultiplier}× Bonus</div>
          </div>
        </div>
      </div>

      {/* Silver Bullet Window Badge */}
      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
        kz.isSilverBulletWindow
          ? 'bg-gradient-to-r from-amber-950/40 to-gray-900 border-amber-500/50 shadow-md shadow-amber-950/40'
          : 'bg-gray-900/40 border-gray-800 text-gray-400'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{kz.isSilverBulletWindow ? '⭐' : '⏳'}</span>
          <div>
            <div className="font-bold text-white">
              ICT Silver Bullet Window: {kz.isSilverBulletWindow ? `ACTIVE (Window ${kz.silverBulletWindow})` : 'INACTIVE'}
            </div>
            <div className="text-[11px] text-gray-400">
              {kz.isSilverBulletWindow ? 'Highest 1-hour FVG probability window' : 'Next Silver Bullet in upcoming session'}
            </div>
          </div>
        </div>

        {kz.isSilverBulletWindow && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
            +15% Conf
          </span>
        )}
      </div>

      {/* Recommendation & Next Window */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800 text-gray-400">
        <div>
          <span>Next: <strong className="text-gray-200">{kz.nextKillZone?.name}</strong></span>
        </div>
        <div className="font-mono text-blue-400">
          In {Math.floor(kz.nextKillZone?.startsIn / 60)}h {kz.nextKillZone?.startsIn % 60}m
        </div>
      </div>
    </div>
  )
}
