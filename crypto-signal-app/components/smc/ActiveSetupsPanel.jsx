'use client'

export default function ActiveSetupsPanel({ activeSetups = [], onSelectSetup }) {
  const setups = activeSetups.length > 0 ? activeSetups : [
    {
      id: 's1',
      name: 'Propulsion Block (OB in FVG)',
      grade: 'S++',
      direction: 'BUY',
      entryZone: { low: 67200, high: 67600, mid: 67400 },
      confidence: 94,
      confluenceFactors: ['OB inside FVG zone', 'Double institutional confirmation', 'High velocity fill']
    },
    {
      id: 's2',
      name: 'Liquidity Sweep Reversal',
      grade: 'S',
      direction: 'BUY',
      entryZone: { low: 67050, high: 67200, mid: 67125 },
      confidence: 88,
      confluenceFactors: ['SSL retail stop hunt swept', 'Immediate reversal candle confirmed']
    },
    {
      id: 's3',
      name: 'OTE Golden Zone (62-79% Fib)',
      grade: 'S',
      direction: 'BUY',
      entryZone: { low: 67250, high: 67550, mid: 67400 },
      confidence: 85,
      confluenceFactors: ['Price at 70.5% ICT equilibrium', 'FVG inside discount zone']
    },
    {
      id: 's4',
      name: 'ICT Silver Bullet Window 3',
      grade: 'A',
      direction: 'BUY',
      entryZone: { low: 67300, high: 67600, mid: 67450 },
      confidence: 81,
      confluenceFactors: ['14:00-15:00 UTC execution window', '5M/15M FVG aligned']
    }
  ]

  const getGradeStyle = (grade) => {
    if (grade === 'S++') return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-950 font-black shadow-lg shadow-amber-900/40 animate-pulse'
    if (grade === 'S') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
    if (grade === 'A') return 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl p-6 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <div>
            <h3 className="font-bold text-white tracking-wide">ACTIVE SMC SETUPS</h3>
            <p className="text-xs text-gray-400">Ranked by Institutional Quality</p>
          </div>
        </div>

        <span className="px-2.5 py-1 text-xs font-bold bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
          {setups.length} Setups Active
        </span>
      </div>

      {/* Setups List */}
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {setups.map((setup, idx) => (
          <div
            key={setup.id || idx}
            onClick={() => onSelectSetup && onSelectSetup(setup)}
            className="group p-3.5 rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-gray-700 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getGradeStyle(setup.grade)}`}>
                  {setup.grade}
                </span>
                <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                  {setup.name}
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400">
                Zone: <strong className="text-gray-200">${setup.entryZone?.low?.toLocaleString()} - ${setup.entryZone?.high?.toLocaleString()}</strong>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                setup.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {setup.direction}
              </span>
              <div className="text-[10px] text-amber-400 font-mono mt-1">
                Conf: {setup.confidence}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
