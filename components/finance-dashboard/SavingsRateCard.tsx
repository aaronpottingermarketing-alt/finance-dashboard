'use client'

import type { FinanceTransaction } from '@/components/finance-dashboard/types'

interface Props {
  allTransactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000)
}

export default function SavingsRateCard({ allTransactions }: Props) {
  const today = startOfDay(new Date())

  // ── Last payday ────────────────────────────────────────────────────────────
  const incomeTxns = allTransactions
    .filter(t => t.category === 'income' && t.amount_pence > 0)
    .sort((a, b) => b.booking_date.localeCompare(a.booking_date))

  const lastPaydayDate: Date | null = incomeTxns.length > 0
    ? startOfDay(new Date(incomeTxns[0].booking_date))
    : null

  // Next payday = last payday + 28 days (approximate monthly cycle)
  const nextPaydayDate: Date | null = lastPaydayDate
    ? new Date(lastPaydayDate.getTime() + 28 * 86400000)
    : null

  const rawDaysUntil = nextPaydayDate ? diffDays(nextPaydayDate, today) : null
  const daysUntilPayday = rawDaysUntil !== null ? Math.max(0, rawDaysUntil) : null
  const isPaydaySoon = daysUntilPayday !== null && daysUntilPayday <= 1

  // ── Remaining balance since last payday ────────────────────────────────────
  const txnsSincePayday = lastPaydayDate
    ? allTransactions.filter(t => startOfDay(new Date(t.booking_date)) >= lastPaydayDate)
    : allTransactions

  const remainingBalance = txnsSincePayday.reduce((sum, t) => sum + t.amount_pence, 0)

  // ── Savings rate over last 3 months ────────────────────────────────────────
  const threeMonthsAgo = new Date(today)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const recent = allTransactions.filter(t => new Date(t.booking_date) >= threeMonthsAgo)
  const totalIncome = recent.filter(t => t.amount_pence > 0).reduce((s, t) => s + t.amount_pence, 0)
  const totalSpend = recent.filter(t => t.amount_pence < 0).reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalSpend) / totalIncome) * 100)
    : 0

  // ── Savings rate vs last month (simple approximation) ─────────────────────
  const oneMonthAgo = new Date(today)
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const twoMonthsAgo = new Date(today)
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  const lastMonthTxns = allTransactions.filter(t => {
    const d = new Date(t.booking_date)
    return d >= twoMonthsAgo && d < oneMonthAgo
  })
  const lmIncome = lastMonthTxns.filter(t => t.amount_pence > 0).reduce((s, t) => s + t.amount_pence, 0)
  const lmSpend = lastMonthTxns.filter(t => t.amount_pence < 0).reduce((s, t) => s + Math.abs(t.amount_pence), 0)
  const lastMonthRate = lmIncome > 0 ? Math.round(((lmIncome - lmSpend) / lmIncome) * 100) : null
  const rateChange = lastMonthRate !== null ? savingsRate - lastMonthRate : null
  const improving = rateChange !== null && rateChange >= 0

  // ── Colours ────────────────────────────────────────────────────────────────
  const rateColour = savingsRate > 15 ? '#00d4aa' : savingsRate >= 5 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1rem',
      padding: '1.25rem',
      display: 'flex',
      gap: '0',
    }}>
      {/* ── Left: Savings Rate ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingRight: '1.25rem' }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#475569',
          marginBottom: '0.5rem',
        }}>
          Savings Rate
        </p>

        <p style={{
          fontSize: 40,
          fontWeight: 700,
          color: rateColour,
          lineHeight: 1,
          marginBottom: '0.25rem',
        }}>
          {savingsRate}%
        </p>

        <p style={{ fontSize: 13, color: '#475569', marginBottom: '0.5rem' }}>
          of income saved
        </p>

        {rateChange !== null && (
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: improving ? '#00d4aa' : '#ef4444',
          }}>
            {improving ? '▲' : '▼'} {rateChange > 0 ? '+' : ''}{rateChange}% vs last month
          </p>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div style={{
        width: 1,
        background: 'rgba(255,255,255,0.06)',
        margin: '0 0',
        alignSelf: 'stretch',
      }} />

      {/* ── Right: Payday Countdown ──────────────────────────────────────────── */}
      <div style={{ flex: 1, paddingLeft: '1.25rem' }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#475569',
          marginBottom: '0.5rem',
        }}>
          Next Payday
        </p>

        {isPaydaySoon ? (
          <p style={{ fontSize: 28, fontWeight: 700, color: '#00d4aa', lineHeight: 1, marginBottom: '0.25rem' }}>
            🎉 Payday!
          </p>
        ) : daysUntilPayday !== null ? (
          <>
            <p style={{
              fontSize: 40,
              fontWeight: 700,
              color: '#e2e8f0',
              lineHeight: 1,
              marginBottom: '0.25rem',
            }}>
              {daysUntilPayday}
            </p>
            <p style={{ fontSize: 13, color: '#334155', marginBottom: '0.5rem' }}>
              days away
            </p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#475569', marginBottom: '0.5rem' }}>No income data</p>
        )}

        <p style={{ fontSize: 13, fontWeight: 600, color: '#00d4aa' }}>
          {fmt(remainingBalance)} remaining
        </p>
      </div>
    </div>
  )
}
