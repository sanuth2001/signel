'use client'

import React, { useState } from 'react'
import FundingPanel from './FundingPanel'

export default function OnchainPanel({ onchainData }) {
  const [showFullFunding, setShowFullFunding] = useState(false)
  if (!onchainData) return null

  const { fearGreed, funding, exchangeFlow, whaleTransactions } = onchainData

  const ratePercent = funding?.current?.ratePercent ?? 0
  const label = funding?.current?.label ?? 'Neutral'
  const trendArrow = funding?.history?.trend === 'rising' ? '↑' : funding?.history?.trend === 'falling' ? '↓' : '→'
  const consecutivePeriods = funding?.history?.consecutive?.positive || funding?.history?.consecutive?.negative || 0
  const consecutiveLabel = funding?.history?.consecutive?.positive > 0 ? 'positive' : 'negative'

  return (
    <div className="rounded-2xl border p-4 bg-gray-900/60 border-gray-700/30 backdrop-blur-sm space-y-4">
      <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">On-chain Metrics</div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-gray-500 block">Fear & Greed</span>
          <span className="text-sm font-bold text-white">{fearGreed?.value || '50'}</span>
          <span className="text-[10px] text-gray-400 block">{fearGreed?.label || 'Neutral'}</span>
        </div>

        <div>
          <span className="text-[10px] text-gray-500 block">Exchange Flow</span>
          <span className="text-sm font-bold text-white uppercase">{exchangeFlow?.direction || 'N/A'}</span>
          <span className="text-[10px] text-gray-400 block">
            {exchangeFlow?.netFlow ? `${Math.abs(exchangeFlow.netFlow).toLocaleString()} BTC` : 'N/A'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-gray-500 block">Whale Transactions</span>
          <span className="text-sm font-bold text-white">{whaleTransactions?.count || 'N/A'}</span>
          <span className="text-[10px] text-gray-400 block">Large transfers</span>
        </div>

        <div>
          <span className="text-[10px] text-gray-500 block">Overall Score</span>
          <span className="text-sm font-bold text-white">{onchainData.onchainScore || 0}/4</span>
          <span className="text-[10px] text-gray-400 block">On-chain strength</span>
        </div>
      </div>

      {/* Rich Funding Rate summary display */}
      <div className="pt-3 border-t border-gray-800/80">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-gray-500 block">Funding Rate</span>
          <button 
            onClick={() => setShowFullFunding(!showFullFunding)} 
            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold focus:outline-none"
          >
            {showFullFunding ? 'Close Details' : 'Expand Details'}
          </button>
        </div>
        <div className="text-xs text-gray-200 font-semibold">
          Funding: {ratePercent.toFixed(4)}% {trendArrow} {label} {consecutivePeriods > 0 ? `| ${consecutivePeriods} ${consecutiveLabel} periods` : ''}
        </div>
      </div>

      {showFullFunding && funding && (
        <div className="mt-3 transition-all">
          <FundingPanel funding={funding} />
        </div>
      )}
    </div>
  )
}
