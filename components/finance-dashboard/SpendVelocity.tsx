'use client'

import type { FinanceTransaction } from '@/components/finance-dashboard/types'

interface Props {
  transactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Returns last month's total debit spend in pence */
function lastMonthSpend(txns: FinanceTransaction[]): number {
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

export default function SpendVelocity({ transactions }: Props) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysElapsed = now.getDate()
  const daysInMonth = getDaysInMonth(year, month)
  const daysRemaining = daysInMonth - daysElapsed

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

  const dailyRate = daysElapsed > 0 ? spentSoFar / daysElapsed : 0
  const projectedTotal = Math.round(dailyRate * daysInMonth)

  const prevMonthSpend = lastMonthSpend(transactions)
  const overThreshold = prevMonthSpend > 0
    ? projectedTotal / prevMonthSpend
    : 1

  const projectedColour =
    overThreshold >= 1.25
      ? '#ef4444'
      : overThreshold >= 1.1
        ? '#f59e0b'
        : '#00d4aa'

  const timePct = Math.round((daysElapsed / daysInMonth) * 100)

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
        Spend Velocity
      </p>

      {/* Narrative + big number */}
      <p style={{ fontSize: 13, color: '#475569', marginBottom: '0.25rem' }}>
        At your current rate you&apos;ll spend
      </p>
      <p
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: projectedColour,
          lineHeight: 1,
          marginBottom: '1rem',
        }}
      >
        {fmt(projectedTotal)}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#475569', marginLeft: 6 }}>
          this month
        </span>
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
          Spent so far{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(spentSoFar)}</span>
        </span>
        <span style={{ color: '#334155', fontSize: 12 }}>·</span>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Daily avg{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(Math.round(dailyRate))}</span>
        </span>
        <span style={{ color: '#334155', fontSize: 12 }}>·</span>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Days left{' '}
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{daysRemaining}</span>
        </span>
      </div>

      {/* Time-elapsed progress bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 11, color: '#334155' }}>
            Day {daysElapsed} of {daysInMonth}
          </span>
          <span style={{ fontSize: 11, color: '#334155' }}>{timePct}% through month</span>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '9999px',
            height: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '9999px',
              width: `${timePct}%`,
              background: '#00d4aa',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}
