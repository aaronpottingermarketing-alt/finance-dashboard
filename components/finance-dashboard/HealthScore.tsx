'use client'

import { useMemo } from 'react'
import type { FinanceTransaction, FinanceAccount } from '@/components/finance-dashboard/types'

interface Props {
  transactions: FinanceTransaction[]
  allTransactions: FinanceTransaction[]
  accounts: FinanceAccount[]
}

interface ScoreBreakdown {
  savingsRate: number   // 0-40
  spendingTrend: number // 0-25
  subscriptionRatio: number // 0-20
  balanceCushion: number // 0-15
}

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function getMonthStr(offsetFromNow: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offsetFromNow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function computeScore(
  allTransactions: FinanceTransaction[],
  accounts: FinanceAccount[]
): { breakdown: ScoreBreakdown; total: number } {
  // ── Savings rate (40 pts): last 3 months ──────────────────────────────────
  let totalIncome = 0
  let totalSpend = 0
  let monthsWithData = 0

  for (let i = 1; i <= 3; i++) {
    const m = getMonthStr(-i)
    const { from, to } = monthRange(m)
    const monthTxns = allTransactions.filter(t => t.booking_date >= from && t.booking_date <= to)
    if (monthTxns.length === 0) continue
    const inc = monthTxns.filter(t => t.amount_pence > 0 && t.category !== 'transfers').reduce((s, t) => s + t.amount_pence, 0)
    const sp = monthTxns.filter(t => t.amount_pence < 0).reduce((s, t) => s + Math.abs(t.amount_pence), 0)
    totalIncome += inc
    totalSpend += sp
    monthsWithData++
  }

  let savingsRate = 0
  if (monthsWithData > 0 && totalIncome > 0) {
    const rate = (totalIncome - totalSpend) / totalIncome
    if (rate >= 0.2) savingsRate = 40
    else if (rate > 0) savingsRate = Math.round((rate / 0.2) * 40)
    else savingsRate = 0
  }

  // ── Spending trend (25 pts): this month vs last month ────────────────────
  const currentM = getMonthStr(0)
  const lastM = getMonthStr(-1)
  const { from: cFrom, to: cTo } = monthRange(currentM)
  const { from: lFrom, to: lTo } = monthRange(lastM)

  const currentSpend = allTransactions
    .filter(t => t.booking_date >= cFrom && t.booking_date <= cTo && t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  const lastSpend = allTransactions
    .filter(t => t.booking_date >= lFrom && t.booking_date <= lTo && t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  let spendingTrend = 0
  if (lastSpend > 0) {
    const changePct = (currentSpend - lastSpend) / lastSpend
    if (changePct < -0.05) spendingTrend = 25
    else if (changePct <= 0.05) spendingTrend = Math.round(25 * (1 - changePct / 0.1))
    else if (changePct < 0.10) spendingTrend = Math.round(25 * (1 - (changePct - 0.05) / 0.05))
    else spendingTrend = 0
    spendingTrend = Math.max(0, Math.min(25, spendingTrend))
  } else {
    spendingTrend = 12 // neutral if no prior data
  }

  // ── Subscription ratio (20 pts): subscriptions / total spend ─────────────
  const subSpend = allTransactions
    .filter(t => t.is_subscription && t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  const allSpend = allTransactions
    .filter(t => t.amount_pence < 0)
    .reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  let subscriptionRatio = 0
  if (allSpend > 0) {
    const ratio = subSpend / allSpend
    if (ratio <= 0.10) subscriptionRatio = 20
    else if (ratio >= 0.25) subscriptionRatio = 0
    else subscriptionRatio = Math.round(20 * (1 - (ratio - 0.10) / 0.15))
  } else {
    subscriptionRatio = 20
  }

  // ── Balance cushion (15 pts): total balance / avg monthly spend ───────────
  const totalBalancePence = accounts.reduce((s, a) => s + a.balance_pence, 0)
  const avgMonthlySpend = monthsWithData > 0 ? totalSpend / monthsWithData : 0

  let balanceCushion = 0
  if (avgMonthlySpend > 0) {
    const months = totalBalancePence / avgMonthlySpend
    if (months >= 3) balanceCushion = 15
    else if (months >= 0.5) balanceCushion = Math.round(15 * ((months - 0.5) / 2.5))
    else balanceCushion = 0
  } else {
    balanceCushion = 7 // neutral if no spend data
  }

  const breakdown: ScoreBreakdown = { savingsRate, spendingTrend, subscriptionRatio, balanceCushion }
  const total = savingsRate + spendingTrend + subscriptionRatio + balanceCushion

  return { breakdown, total }
}

function scoreTier(total: number): { colour: string; label: string } {
  if (total <= 30) return { colour: '#ef4444', label: 'At Risk' }
  if (total <= 55) return { colour: '#f59e0b', label: 'Needs Attention' }
  if (total <= 75) return { colour: '#3b82f6', label: 'On Track' }
  return { colour: '#00d4aa', label: 'Excellent' }
}

function buildCommentary(breakdown: ScoreBreakdown): string {
  const { savingsRate, spendingTrend, subscriptionRatio, balanceCushion } = breakdown

  // Find the two lowest scoring sub-components (as % of max)
  const items = [
    { key: 'savings', pct: savingsRate / 40, label: 'savings rate' },
    { key: 'trend', pct: spendingTrend / 25, label: 'spending trend' },
    { key: 'subs', pct: subscriptionRatio / 20, label: 'subscription costs' },
    { key: 'cushion', pct: balanceCushion / 15, label: 'cash cushion' },
  ].sort((a, b) => a.pct - b.pct)

  const lowest = items[0]
  const secondLowest = items[1]

  if (lowest.key === 'subs' && lowest.pct < 0.6) {
    return "You're tracking well overall but subscriptions are eating into your margin."
  }
  if (lowest.key === 'savings' && lowest.pct < 0.5) {
    return "Your spending is outpacing income — focus on building a consistent savings habit."
  }
  if (lowest.key === 'cushion' && lowest.pct < 0.5) {
    return "Your cash runway is thin. Aim to build at least 3 months of expenses in reserve."
  }
  if (lowest.key === 'trend' && lowest.pct < 0.4) {
    return "Spending is rising month over month. Identifying one category to cut could help."
  }
  if (lowest.pct < 0.7 && secondLowest.pct < 0.7) {
    return `You're saving consistently — watch your ${lowest.label} and ${secondLowest.label} to push your score higher.`
  }
  return "Strong financial health across the board. Keep building on this momentum."
}

// SVG circle radius and circumference
const RADIUS = 52
const CIRC = 2 * Math.PI * RADIUS

export default function HealthScore({ transactions: _transactions, allTransactions, accounts }: Props) {
  const { breakdown, total } = useMemo(
    () => computeScore(allTransactions, accounts),
    [allTransactions, accounts]
  )

  const { colour, label } = scoreTier(total)
  const commentary = buildCommentary(breakdown)

  const dashOffset = CIRC * (1 - total / 100)

  const bars: { label: string; value: number; max: number }[] = [
    { label: 'Savings rate', value: breakdown.savingsRate, max: 40 },
    { label: 'Spending trend', value: breakdown.spendingTrend, max: 25 },
    { label: 'Subscriptions', value: breakdown.subscriptionRatio, max: 20 },
    { label: 'Balance cushion', value: breakdown.balanceCushion, max: 15 },
  ]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1rem',
      padding: '1.5rem',
    }}>
      {/* Section label */}
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#475569',
        marginBottom: '1.25rem',
      }}>
        Financial Health Score
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {/* Circle */}
        <div style={{ flexShrink: 0, position: 'relative', width: 130, height: 130 }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle
              cx="65" cy="65" r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
            />
            {/* Score arc */}
            <circle
              cx="65" cy="65" r={RADIUS}
              fill="none"
              stroke={colour}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
            />
          </svg>
          {/* Centre text */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: colour, lineHeight: 1 }}>
              {total}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: colour, letterSpacing: '0.04em' }}>
              {label}
            </span>
          </div>
        </div>

        {/* Right side: bars + commentary */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bars.map(bar => {
            const pct = Math.round((bar.value / bar.max) * 100)
            return (
              <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', width: 130, flexShrink: 0 }}>
                  {bar.label}
                </span>
                <div style={{
                  flex: 1,
                  height: 6,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: colour,
                    borderRadius: 999,
                    transition: 'width 0.5s ease',
                    opacity: 0.8,
                  }} />
                </div>
                <span style={{ fontSize: 12, color: '#64748b', width: 36, textAlign: 'right', flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
            )
          })}

          {/* Commentary */}
          <p style={{
            fontSize: 13,
            color: '#94a3b8',
            marginTop: '0.25rem',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}>
            &ldquo;{commentary}&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
