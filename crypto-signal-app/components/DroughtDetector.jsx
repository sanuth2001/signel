'use client'
export default function DroughtDetector({ reason, regime, watchFor, recommendedAction, sessionAnalysis = null }) {
  if (sessionAnalysis?.adjustment?.block) {
    const nextSession = sessionAnalysis.current?.nextSession || 'Asia Session'
    const nextIn = sessionAnalysis.current?.minutesUntilNextSession || 0
    const currentHourStr = sessionAnalysis.current?.currentTime || '22:00 UTC'
    const formatMinutes = (m) => {
      const h = Math.floor(m / 60)
      const mins = m % 60
      return h > 0 ? `${h}h ${mins}m` : `${mins}m`
    }

    const curHour = sessionAnalysis.current?.currentHourUTC ?? 22
    const hoursToLondon = (8 - curHour + 24) % 24
    const hoursToOverlap = (13 - curHour + 24) % 24

    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-900/10 backdrop-blur-sm p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-2xl animate-pulse">⏸</div>
          <div>
            <div className="font-bold text-red-400 text-lg uppercase tracking-wider">Signals Suspended</div>
            <div className="text-[10px] text-red-500/70 font-bold">MARKET DEAD ZONE ACTIVE</div>
          </div>
        </div>

        <div className="bg-red-950/20 border border-red-700/20 rounded-xl p-4">
          <div className="text-xs text-red-400 mb-1 uppercase tracking-wider font-semibold">Reason</div>
          <p className="text-sm text-gray-200">{sessionAnalysis.adjustment.reason} (21:00-00:00 UTC)</p>
          <div className="text-xs text-gray-400 font-mono mt-1.5">Current: {currentHourStr}</div>
        </div>

        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/20 space-y-1">
          <div className="text-xs text-yellow-500 uppercase tracking-wider font-semibold">⏰ Next Active Session</div>
          <p className="text-sm text-gray-200 font-bold">{nextSession} opens in {formatMinutes(nextIn)}</p>
          <p className="text-xs text-gray-500 font-medium">(00:00 UTC — low confidence signals)</p>
        </div>

        <div className="bg-blue-950/10 border border-blue-700/20 rounded-xl p-4 text-xs space-y-1.5 text-gray-300">
          <div className="text-blue-400 uppercase tracking-wider font-semibold mb-1">Best next windows:</div>
          <div>• London Open in {hoursToLondon}h (08:00 UTC)</div>
          <div>• London-NY Overlap in {hoursToOverlap}h (13:00 UTC)</div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-2xl animate-pulse">⏳</div>
        <div>
          <div className="font-bold text-yellow-300 text-lg">Signal Drought</div>
          <div className="text-xs text-yellow-400/70 uppercase tracking-wider">No trade conditions met</div>
        </div>
      </div>

      {reason && (
        <div className="bg-yellow-900/20 border border-yellow-700/20 rounded-xl p-4 mb-3">
          <div className="text-xs text-yellow-500 mb-1 uppercase tracking-wider">Reason</div>
          <p className="text-sm text-yellow-200">{reason}</p>
        </div>
      )}

      {recommendedAction && (
        <div className="bg-gray-800/40 rounded-xl p-4 mb-3 border border-gray-700/20">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Recommended Action</div>
          <p className="text-sm text-gray-200">{recommendedAction}</p>
        </div>
      )}

      {watchFor && (
        <div className="bg-blue-900/10 border border-blue-700/20 rounded-xl p-4">
          <div className="text-xs text-blue-400 mb-1 uppercase tracking-wider">👀 Watch For</div>
          <p className="text-sm text-blue-200">{watchFor}</p>
        </div>
      )}
    </div>
  )
}
