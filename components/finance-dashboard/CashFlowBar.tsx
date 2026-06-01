'use client'

import type { FinanceTransaction } from '@/components/finance-dashboard/types'

interface Props {
  transactions: FinanceTransaction[]
  allTransactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  })
}

function currentMonthTransactions(txns: FinanceTransaction[]): FinanceTransaction[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return txns.filter(t => {
    const d = new Date(t.booking_date)
    return d.getFullYear() === year && d.getMonth() === month
  })
}

export default function CashFlowBar({ transactions }: Props) {
  const monthTxns = currentMonthTransactions(transactions)

  // Count ALL positive credits as inflow — real descriptions rarely say "salary"
  const income = monthTxns
    .filter(t => t.amount_pence > 0 && t.category !== 'transfers')
    .reduce((s, t) => s + t.amount_pence, 0)

  const spend = monthTxns
    .filter(t => t.amount_pence < 0 && t.category !== 'transfers')
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  const net = income - spend
  const savingsRate = net > 0 && income > 0 ? Math.round((net / income) * 100) : 0
  const overBudget = spend > income
  const barWidth = income > 0 ? Math.min(spend / income, 1) * 100 : 0

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.25rem',
      }}
    >
      {/* Label */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#475569',
          marginBottom: '1rem',
        }}
      >
        Cash Flow
      </p>

      {/* Three stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        {/* In */}
        <div>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>In</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#00d4aa', lineHeight: 1 }}>
            {fmt(income)}
          </p>
        </div>

        {/* Out */}
        <div>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Out</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>
            {fmt(spend)}
          </p>
        </div>

        {/* Net */}
        <div>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Net</p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: net >= 0 ? '#00d4aa' : '#ef4444',
              lineHeight: 1,
            }}
          >
            {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
          </p>
        </div>
      </div>

      {/* Progress bar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Track */}
        <div
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '9999px',
            height: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '9999px',
              width: `${barWidth}%`,
              background: overBudget ? '#ef4444' : '#00d4aa',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Label right of bar */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: overBudget ? '#ef4444' : '#00d4aa',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {overBudget
            ? `${Math.round((spend / income - 1) * 100)}% over`
            : `${savingsRate}% saved`}
        </span>
      </div>
    </div>
  )
}
