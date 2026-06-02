'use client'

import { useState, useCallback } from 'react'
import type { useFinanceDashboard } from './useFinanceDashboard'
import HealthScore from './HealthScore'
import FullInsightCards from './FullInsightCards'
import type { FullAnalysis } from './FullInsightCards'
import SubscriptionAudit from './SubscriptionAudit'
import SpendingPatterns from './SpendingPatterns'
import MerchantIntelligence from './MerchantIntelligence'
import Projections from './Projections'

type Props = { fd: ReturnType<typeof useFinanceDashboard> }

export default function InsightsDashboard({ fd }: Props) {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [streamText, setStreamText] = useState('')

  const generateFullAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    setStreamText('')
    let accumulated = ''

    try {
      const res = await fetch('/api/finance/insights-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: fd.selectedMonth }),
      })
      if (!res.ok || !res.body) throw new Error('Failed to start analysis')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) { accumulated += data.text; setStreamText(accumulated) }
            if (data.done) {
              const raw = data.full ?? accumulated
              // Strip markdown code fences if Claude wrapped the JSON
              const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
              try { setAnalysis(JSON.parse(cleaned)) } catch { /* couldn't parse */ }
              setStreamText('')
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } finally {
      setAnalysisLoading(false)
    }
  }, [fd.selectedMonth])

  return (
    <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>AI Insights</p>
          <p style={{ fontSize: 13, color: '#475569' }}>Your full financial picture — patterns, risks and what to do next</p>
        </div>
        <button
          onClick={generateFullAnalysis}
          disabled={analysisLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', fontSize: 13, fontWeight: 600,
            borderRadius: '0.5rem', border: 'none', cursor: analysisLoading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #00d4aa, #00a884)',
            color: '#000', opacity: analysisLoading ? 0.7 : 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={analysisLoading ? { animation: 'spin 1s linear infinite' } : {}}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {analysisLoading ? 'Analysing…' : analysis ? '↺ Refresh Analysis' : 'Generate Analysis'}
        </button>
      </div>

      {/* Health Score — full width */}
      <HealthScore
        transactions={fd.transactions}
        allTransactions={fd.allTransactions}
        accounts={fd.accounts}
      />

      {/* Claude full analysis — full width */}
      <FullInsightCards
        analysis={analysis}
        loading={analysisLoading}
        streamText={streamText}
        onRefresh={generateFullAnalysis}
        selectedMonth={fd.selectedMonth}
      />

      {/* Row 1: Subscription Audit + Spending Patterns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <SubscriptionAudit allTransactions={fd.allTransactions} />
        <SpendingPatterns allTransactions={fd.allTransactions} />
      </div>

      {/* Row 2: Merchant Intelligence + Projections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <MerchantIntelligence
          allTransactions={fd.allTransactions}
          transactions={fd.transactions}
        />
        <Projections
          allTransactions={fd.allTransactions}
          accounts={fd.accounts}
          goals={fd.goals}
        />
      </div>

    </div>
  )
}
