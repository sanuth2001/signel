'use client'

export default function SetupDetailModal({ setup, onClose, onGenerateSignal }) {
  if (!setup) return null

  const isBuy = setup.direction === 'BUY'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${
              isBuy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {setup.direction} SETUP
            </span>
            <span className="text-[11px] font-black bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40">
              GRADE: {setup.grade} 🔥
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-all text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Setup Title & Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">{setup.name}</h3>
          <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-xl border border-gray-800">
            "{setup.description}"
          </p>
        </div>

        {/* Price & Target Levels */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-2 font-mono text-xs">
          <div className="text-gray-400 font-medium font-sans">Setup Entry & Stop Boundaries</div>
          <div className="flex items-center justify-between font-bold text-white text-sm">
            <span>Entry Zone: ${setup.entryZone?.low?.toLocaleString()} - ${setup.entryZone?.high?.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-rose-400 pt-1 border-t border-gray-800">
            <span>Stop Loss: ${setup.stopLoss?.toLocaleString()}</span>
            <span>Target R:R: {setup.riskReward}:1</span>
          </div>
        </div>

        {/* Confluence Factors */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">Confluence Factors</div>
          <ul className="space-y-1 text-xs text-gray-300">
            {setup.confluenceFactors?.map((factor, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-emerald-400">✅</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all border border-gray-700"
          >
            Close Window
          </button>

          <button
            onClick={() => {
              onClose()
              onGenerateSignal && onGenerateSignal(setup)
            }}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950 transition-all"
          >
            ⚡ Generate Supreme Signal
          </button>
        </div>

      </div>
    </div>
  )
}
