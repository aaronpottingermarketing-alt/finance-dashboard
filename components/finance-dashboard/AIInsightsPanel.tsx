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
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          AI Insights
        </p>
        <button
          onClick={() => onGenerate(selectedMonth, activeTab)}
          disabled={loading}
          className="text-[11px] transition-colors disabled:opacity-50"
          style={{ color: '#475569' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
        >
          {loading ? 'Thinking…' : '↺ Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex overflow-hidden mb-3"
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.type
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className="flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                color: isActive ? '#00d4aa' : '#475569',
                borderBottom: isActive ? '2px solid #00d4aa' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Streaming text */}
      {loading && streamText && (
        <div
          className="text-xs leading-relaxed animate-pulse"
          style={{ color: '#00d4aa' }}
        >
          {streamText}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !streamText && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-lg p-3 animate-pulse"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem',
              }}
            >
              <div className="h-3 rounded w-3/4 mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="h-2 rounded w-full mb-1" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="h-2 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Insight cards */}
      {!loading && activeInsight && (
        <div className="flex flex-col gap-2">
          {activeInsight.payload.map((item, i) => (
            <div
              key={i}
              className="p-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{item.title}</span>
                {item.saving_estimate_pence && (
                  <span
                    className="text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded-full"
                    style={{
                      color: '#00d4aa',
                      background: 'rgba(0,212,170,0.12)',
                      border: '1px solid rgba(0,212,170,0.2)',
                    }}
                  >
                    {fmt(item.saving_estimate_pence)}/yr
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#475569' }}>{item.description}</p>
              {item.action && (
                <p
                  className="text-[11px] pt-1.5 mt-1"
                  style={{
                    color: '#334155',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  → {item.action}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !activeInsight && !streamText && (
        <div className="text-center py-6">
          <p className="text-xs mb-3" style={{ color: '#334155' }}>No insights yet for this period</p>
          <button
            onClick={() => onGenerate(selectedMonth, activeTab)}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{
              color: '#00d4aa',
              border: '1px solid rgba(0,212,170,0.3)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,212,170,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Generate insights
          </button>
        </div>
      )}
    </div>
  )
}
