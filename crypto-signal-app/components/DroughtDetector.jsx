'use client'
export default function DroughtDetector({ reason, regime, watchFor, recommendedAction }) {
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
