'use client'

import type { FinanceTransaction, TransactionCategory } from './types'

interface Props {
  transactions: FinanceTransaction[]
}

// Inline colour maps — no Tailwind colour classes
const DOT_COLOUR: Record<TransactionCategory, string> = {
  food: '#fb923c',
  transport: '#60a5fa',
  subscriptions: '#a78bfa',
  entertainment: '#f472b6',
  health: '#4ade80',
  shopping: '#fb7185',
  bills: '#facc15',
  income: '#00d4aa',
  transfers: '#38bdf8',
  other: '#64748b',
}

const BADGE_BG: Record<TransactionCategory, string> = {
  food: 'rgba(251,146,60,0.15)',
  transport: 'rgba(96,165,250,0.15)',
  subscriptions: 'rgba(167,139,250,0.15)',
  entertainment: 'rgba(244,114,182,0.15)',
  health: 'rgba(74,222,128,0.15)',
  shopping: 'rgba(251,113,133,0.15)',
  bills: 'rgba(250,204,21,0.15)',
  income: 'rgba(0,212,170,0.15)',
  transfers: 'rgba(56,189,248,0.15)',
  other: 'rgba(100,116,139,0.15)',
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
  other: '#94a3b8',
}

function fmt(pence: number): string {
  const sign = pence < 0 ? '-' : '+'
  return `${sign}£${(Math.abs(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function groupByDate(txns: FinanceTransaction[]): [string, FinanceTransaction[]][] {
  const map = new Map<string, FinanceTransaction[]>()
  for (const t of txns) {
    const key = t.booking_date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TransactionList({ transactions }: Props) {
  if (!transactions.length) {
    return (
      <p style={{ color: '#334155', fontSize: '0.75rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
        No transactions for this period
      </p>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
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
        Transactions
      </span>

      {groups.map(([date, txns]) => (
        <div key={date}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#334155',
              marginBottom: '0.375rem',
            }}
          >
            {formatDate(date)}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {txns.map(t => {
              const cat = t.category as TransactionCategory
              const isCredit = t.amount_pence >= 0
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Category dot */}
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: DOT_COLOUR[cat] ?? '#64748b',
                    }}
                  />

                  {/* Merchant + pending */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        color: '#e2e8f0',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.merchant_name ?? t.description}
                    </span>
                    {t.is_pending && (
                      <span style={{ fontSize: '10px', color: '#facc15' }}>Pending</span>
                    )}
                  </div>

                  {/* Category badge */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 500,
                      borderRadius: '0.25rem',
                      padding: '2px 6px',
                      flexShrink: 0,
                      background: BADGE_BG[cat] ?? 'rgba(100,116,139,0.15)',
                      color: BADGE_TEXT[cat] ?? '#94a3b8',
                    }}
                  >
                    {t.category}
                  </span>

                  {/* Subscription indicator */}
                  {t.is_subscription && (
                    <span style={{ fontSize: '12px', color: '#a78bfa', flexShrink: 0 }}>↻</span>
                  )}

                  {/* Amount */}
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      flexShrink: 0,
                      color: isCredit ? '#00d4aa' : '#e2e8f0',
                    }}
                  >
                    {fmt(t.amount_pence)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
