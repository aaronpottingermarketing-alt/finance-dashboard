'use client'

import { useState } from 'react'
import type { AIInsight, InsightType } from './types'

interface Props {
  insights: AIInsight[]
  loading: boolean
  streamText: string
  selectedMonth: string
  onGenerate: (month: string, type: InsightType) => void
}

const TABS: { type: InsightType; label: string }[] = [
  { type: 'savings_recommendations', label: 'Savings' },
  { type: 'subscription_audit', label: 'Subscriptions' },
  { type: 'life_improvements', label: 'Life' },
]

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

export default function AIInsightsPanel({ insights, loading, streamText, selectedMonth, onGenerate }: Props) {
  const [activeTab, setActiveTab] = useState<InsightType>('savings_recommendations')

  const activeInsight = insights.find(i => i.insight_type === activeTab)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">AI Insights</p>
        <button
          onClick={() => onGenerate(selectedMonth, activeTab)}
          disabled={loading}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
        >
          {loading ? 'Thinking…' : '↺ Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-md border border-zinc-800 overflow-hidden mb-3">
        {TABS.map(tab => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              activeTab === tab.type
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Streaming state */}
      {loading && streamText && (
        <div className="text-xs text-zinc-400 leading-relaxed animate-pulse">
          {streamText}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !streamText && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-2 bg-zinc-800 rounded w-full mb-1" />
              <div className="h-2 bg-zinc-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Insights cards */}
      {!loading && activeInsight && (
        <div className="flex flex-col gap-2">
          {activeInsight.payload.map((item, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-zinc-200">{item.title}</span>
                {item.saving_estimate_pence && (
                  <span className="text-[10px] font-medium text-emerald-400 shrink-0">
                    {fmt(item.saving_estimate_pence)}/yr
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{item.description}</p>
              {item.action && (
                <p className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-1.5 mt-1">
                  → {item.action}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !activeInsight && !streamText && (
        <div className="text-center py-4">
          <p className="text-xs text-zinc-600 mb-2">No insights yet for this period</p>
          <button
            onClick={() => onGenerate(selectedMonth, activeTab)}
            className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded px-3 py-1.5 transition-colors"
          >
            Generate insights
          </button>
        </div>
      )}
    </div>
  )
}
