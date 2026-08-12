'use client'
// SMCPanel — Smart Money Concepts detailed breakdown panel
import { useState, useEffect } from 'react'

const SMCRow = ({ icon, label, value, detail, good }) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-800/60 last:border-0">
    <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span
          className="text-xs font-semibold px-1.5 py-0.5 rounded"
          style={{
            background: good === true ? 'rgba(34,197,94,0.12)' : good === false ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
            color: good === true ? '#22c55e' : good === false ? '#ef4444' : '#9ca3af',
          }}
        >
          {value}
        </span>
      </div>
      {detail && <div className="text-[10px] text-gray-600 mt-0.5 truncate">{detail}</div>}
    </div>
  </div>
)

export default function SMCPanel({ signalId, smcData: propData }) {
  const [data, setData]     = useState(propData || null)
  const [loading, setLoading] = useState(!propData)

  useEffect(() => {
    if (propData) { setData(propData); return }
    if (!signalId) return

    // Fetch last SMC snapshot from timeline
    fetch(`/api/track?id=${signalId}`)
      .then(r => r.json())
      .then(json => {
        // Build display-friendly SMC from available fields
        setData({
          smcBias:          json.smcBias,
          chochDetected:    json.chochDetected,
          coin:             json.coin,
          signalType:       json.signalType,
          progressPercent:  json.progressPercent,
          orderBlockStatus: json.orderBlockStatus,
          fvgStatus:        json.fvgStatus,
          liquidityStatus:  json.liquidityStatus,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [signalId, propData])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-700/30 bg-gray-900/60 p-4">
        <div className="text-xs text-gray-500 text-center py-3">Loading SMC analysis…</div>
      </div>
    )
  }

  const isLong = data?.signalType === 'BUY'
  const smcBias = data?.smcBias || 'neutral'

  return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/60" style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04))'
      }}>
        <span className="text-base">🏦</span>
        <span className="text-xs font-bold text-white uppercase tracking-wider">Smart Money Concepts</span>
        <span
          className="ml-auto text-[10px] px-2 py-0.5 rounded font-semibold"
          style={{
            background: smcBias === 'bullish' ? 'rgba(34,197,94,0.15)' : smcBias === 'bearish' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.12)',
            color: smcBias === 'bullish' ? '#22c55e' : smcBias === 'bearish' ? '#ef4444' : '#9ca3af',
          }}
        >
          {smcBias.toUpperCase()} BIAS
        </span>
      </div>

      <div className="px-4 py-2">
        <SMCRow
          icon="📊"
          label="Market Structure"
          value={smcBias === 'bullish' ? 'Bullish HH+HL' : smcBias === 'bearish' ? 'Bearish LH+LL' : 'Ranging / Mixed'}
          detail={`SMC bias: ${smcBias}`}
          good={isLong ? smcBias === 'bullish' : smcBias === 'bearish'}
        />

        <SMCRow
          icon={data?.chochDetected ? '⚠️' : '✅'}
          label="Change of Character (CHoCH)"
          value={data?.chochDetected ? 'Detected' : 'None'}
          detail={data?.chochDetected ? 'Trend reversal warning — monitor for severity' : 'Structure intact — signal healthy'}
          good={!data?.chochDetected}
        />

        <SMCRow
          icon="🔷"
          label="Break of Structure (BOS)"
          value={smcBias !== 'neutral' ? (isLong && smcBias === 'bullish' ? '✅ Bullish BOS' : '⚠️ Bearish BOS') : 'No BOS'}
          detail="Price closing beyond previous swing confirms trend direction"
          good={isLong ? smcBias === 'bullish' : smcBias === 'bearish'}
        />

        <SMCRow
          icon="🟩"
          label="Order Blocks"
          value={data?.orderBlockStatus || 'OB Zone Holding'}
          detail="Last bearish candle before bullish displacement = institutional support"
          good={!(data?.orderBlockStatus?.toLowerCase().includes('broken'))}
        />

        <SMCRow
          icon="〰️"
          label="Fair Value Gaps (FVG)"
          value={data?.fvgStatus || 'FVG Zone Intact'}
          detail="Price imbalances where fast moves left gaps — price tends to fill"
          good={true}
        />

        <SMCRow
          icon="💧"
          label="Liquidity"
          value={data?.liquidityStatus || 'Liquidity Normal'}
          detail="Equal highs/lows cluster = stop losses = institutional targets"
          good={!(data?.liquidityStatus?.toLowerCase().includes('high risk'))}
        />

        <SMCRow
          icon="📐"
          label="Premium / Discount"
          value={
            data?.progressPercent > 50 ? 'Premium' :
            data?.progressPercent < 30 ? 'Discount ✅' : 'Equilibrium'
          }
          detail={
            isLong
              ? 'Buy in discount zone = institutional alignment (smart money behavior)'
              : 'Sell in premium zone = institutional alignment'
          }
          good={
            isLong ? (data?.progressPercent || 0) < 40 : (data?.progressPercent || 0) > 60
          }
        />
      </div>

      <div className="px-4 py-2 border-t border-gray-800/40 bg-gray-900/40">
        <div className="text-[10px] text-gray-600 leading-relaxed">
          SMC analysis updates every 30 seconds. Full breakdown available after first monitoring cycle completes.
          CHoCH and BOS signals are the most critical — watch these closely.
        </div>
      </div>
    </div>
  )
}
