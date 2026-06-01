'use client'

import type { FinanceTransaction } from '@/components/finance-dashboard/types'

interface Props {
  transactions: FinanceTransaction[]
  monthlyBudgetPence?: number
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Compute last month's total debit spend in pence (used as fallback budget) */
function lastMonthTotalSpend(txns: FinanceTransaction[]): number {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() - 1
  if (month < 0) { month = 11; year -= 1 }
  return txns
    .filter(t => {
      const d = new Date(t.booking_date)
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        t.amount_pence < 0 &&
        t.category !== 'transfers'
      )
    })
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)
}

export default function DailyBudget({ transactions, monthlyBudgetPence }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = getDaysInMonth(year, month)
  const daysRemaining = daysInMonth - today + 1 // include today

  // Current month debits
  const spentSoFar = transactions
    .filter(t => {
      const d = new Date(t.booking_date)
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        t.amount_pence < 0 &&
        t.category !== 'transfers'
      )
    })
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  // Resolve budget
  const budget = monthlyBudgetPence ?? lastMonthTotalSpend(transactions)

  const budgetRemaining = budget - spentSoFar
  const dailyAllowance = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0
  const budgetUsedPct = budget > 0 ? Math.min(Math.round((spentSoFar / budget) * 100), 100) : 0

  // Colour for the big daily number
  const allowanceColour =
    dailyAllowance < 0
      ? '#ef4444'
      : dailyAllowance < 2000   // < £20
        ? '#ef4444'
        : dailyAllowance < 5000 // £20–£50
          ? '#f59e0b'
          : '#00d4aa'

  // Budget bar colour
  const barColour =
    budgetUsedPct > 90
      ? '#ef4444'
      : budgetUsedPct > 75
        ? '#f59e0b'
        : '#00d4aa'

  const overBudget = dailyAllowance < 0

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
          marginBottom: '0.5rem',
        }}
      >
        Daily Budget
      </p>

      {/* Narrative */}
      <p style={{ fontSize: 13, color: '#475569', marginBottom: '0.25rem' }}>
        {overBudget ? 'You are' : 'You have'}
      </p>

      {/* Big daily allowance */}
      <p
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: allowanceColour,
          lineHeight: 1,
          marginBottom: '0.25rem',
        }}
      >
        {overBudget ? '−' : ''}{fmt(Math.abs(dailyAllowance))}
      </p>
      <p style={{ fontSize: 13, color: '#475569', marginBottom: '1rem' }}>
        {overBudget ? 'over budget today' : 'left to spend today'}
      </p>

      {/* Sub-stats row */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: '#475569' }}>
          Budget remaining{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(Math.max(budgetRemaining, 0))}</span>
        </span>
        <span style={{ color: '#334155', fontSize: 12 }}>·</span>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Days left{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{daysRemaining}</span>
        </span>
      </div>

      {/* Budget used bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 11, color: '#334155' }}>Budget used</span>
          <span style={{ fontSize: 11, color: '#334155' }}>{budgetUsedPct}%</span>
        </div>
        <div
          style={{
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
              width: `${budgetUsedPct}%`,
              background: barColour,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}
