'use client'

import type { TransactionCategory } from './types'

interface Props {
  spendByCategory: Record<TransactionCategory, number>
}

const LABELS: Record<TransactionCategory, string> = {
  food: 'Food & drink',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  bills: 'Bills',
  income: 'Income',
  transfers: 'Transfers',
  other: 'Other',
}

// Inline bar fill colours — no Tailwind
const BAR_COLOUR: Record<TransactionCategory, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  subscriptions: '#a78bfa',
  entertainment: '#ec4899',
  health: '#22c55e',
  shopping: '#f43f5e',
  bills: '#eab308',
  income: '#00d4aa',
  transfers: '#0ea5e9',
  other: '#52525b',
}

const BADGE_BG: Record<TransactionCategory, string> = {
  food: 'rgba(249,115,22,0.15)',
  transport: 'rgba(59,130,246,0.15)',
  subscriptions: 'rgba(167,139,250,0.15)',
  entertainment: 'rgba(236,72,153,0.15)',
  health: 'rgba(34,197,94,0.15)',
  shopping: 'rgba(244,63,94,0.15)',
  bills: 'rgba(234,179,8,0.15)',
  income: 'rgba(0,212,170,0.15)',
  transfers: 'rgba(14,165,233,0.15)',
  other: 'rgba(82,82,91,0.15)',
}

const BADGE_TEXT: Record<TransactionCategory, string> = {
  food: '#fb923c',
  transport: '#60a5fa',
  subscriptions: '#a78bfa',
  entertainment: '#f472b6',
  health: '#4ade80',
  shopping: '#fb7185',
  bills: '#facc15',
  income: '#00d4aa',
  transfers: '#38bdf8',
  other: '#71717a',
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

export default function CategoryBreakdown({ spendByCategory }: Props) {
  const entries = (Object.entries(spendByCategory) as [TransactionCategory, number][])
    .filter(([cat]) => cat !== 'income' && cat !== 'transfers')
    .sort(([, a], [, b]) => b - a)

  if (!entries.length) {
    return (
      <p style={{ color: '#334155', fontSize: '0.75rem' }}>No spending data for this period</p>
    )
  }

  const total = entries.reduce((s, [, v]) => s + v, 0) || 1

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#475569',
        }}
      >
        By Category
      </span>

      {entries.map(([cat, pence]) => {
        const pct = Math.round((pence / total) * 100)
        return (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Category pill */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                borderRadius: '0.25rem',
                padding: '2px 6px',
                flexShrink: 0,
                width: '6.5rem',
                textAlign: 'center',
                background: BADGE_BG[cat] ?? 'rgba(82,82,91,0.15)',
                color: BADGE_TEXT[cat] ?? '#71717a',
              }}
            >
              {LABELS[cat]}
            </span>

            {/* Bar track */}
            <div
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '9999px',
                height: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  width: `${pct}%`,
                  background: BAR_COLOUR[cat] ?? '#52525b',
                }}
              />
            </div>

            {/* Amount */}
            <span
              style={{
                fontSize: '0.75rem',
                color: '#e2e8f0',
                flexShrink: 0,
                width: '4rem',
                textAlign: 'right',
              }}
            >
              {fmt(pence)}
            </span>

            {/* Percentage */}
            <span
              style={{
                fontSize: '10px',
                color: '#334155',
                flexShrink: 0,
                width: '2rem',
                textAlign: 'right',
              }}
            >
              {pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
