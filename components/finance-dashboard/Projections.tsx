'use client'

import type { FinanceTransaction, FinanceAccount, SavingsGoal } from '@/components/finance-dashboard/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  allTransactions: FinanceTransaction[]
  accounts: FinanceAccount[]
  goals: SavingsGoal[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function getMonthStr(offsetFromNow: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - offsetFromNow, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shortMonth(offsetFromNow: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offsetFromNow, 1)
  return d.toLocaleString('en-GB', { month: 'short' })
}

// ─── Computations ─────────────────────────────────────────────────────────────

function computeAvgMonthlyNet(allTransactions: FinanceTransaction[]): number {
  let totalNet = 0
  let count = 0

  for (let i = 1; i <= 3; i++) {
    const m = getMonthStr(i)
    const { from, to } = monthRange(m)
    const txns = allTransactions.filter(t => t.booking_date >= from && t.booking_date <= to)
    if (txns.length === 0) continue
    const income = txns.filter(t => t.amount_pence > 0 && t.category !== 'transfers').reduce((s, t) => s + t.amount_pence, 0)
    const spend = txns.filter(t => t.amount_pence < 0).reduce((s, t) => s + Math.abs(t.amount_pence), 0)
    totalNet += income - spend
    count++
  }

  return count > 0 ? Math.round(totalNet / count) : 0
}

function computeAvgMonthlySavings(allTransactions: FinanceTransaction[]): number {
  // Use income - spend as a proxy for savings; filter for positive months only
  const net = computeAvgMonthlyNet(allTransactions)
  return Math.max(net, 0)
}

function computeBreakEvenDay(allTransactions: FinanceTransaction[], accounts: FinanceAccount[]): number | null {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { from, to } = monthRange(currentMonth)

  const monthTxns = allTransactions.filter(t => t.booking_date >= from && t.booking_date <= to)
  const income = monthTxns.filter(t => t.amount_pence > 0 && t.category !== 'transfers').reduce((s, t) => s + t.amount_pence, 0)

  if (income === 0) {
    // Fall back to avg monthly income across accounts if no current-month income
    const totalBalance = accounts.reduce((s, a) => s + a.balance_pence, 0)
    if (totalBalance === 0) return null
  }

  const effectiveIncome = income > 0
    ? income
    : computeAvgMonthlyNet(allTransactions) > 0
      ? computeAvgMonthlyNet(allTransactions)
      : null

  if (!effectiveIncome) return null

  // Calculate daily spend rate from current month
  const daysElapsed = now.getDate()
  const spendSoFar = monthTxns.filter(t => t.amount_pence < 0).reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  if (daysElapsed === 0 || spendSoFar === 0) return null

  const dailySpendRate = spendSoFar / daysElapsed
  const breakEvenDay = Math.round(effectiveIncome / dailySpendRate)

  return Math.min(breakEvenDay, 31)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniProjectionCard({
  label,
  amount,
  isCurrent,
  trend,
}: {
  label: string
  amount: number
  isCurrent: boolean
  trend: 'up' | 'down' | 'flat'
}) {
  const isPositive = amount >= 0
  const trendColor = trend === 'up' ? '#00d4aa' : trend === 'down' ? '#f87171' : '#475569'
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'

  return (
    <div
      className="p-3 rounded-xl flex flex-col items-center text-center"
      style={{
        background: isCurrent ? 'rgba(0,212,170,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isCurrent ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <p className="text-[10px] font-medium mb-1" style={{ color: isCurrent ? '#00d4aa' : '#475569' }}>
        {label}
      </p>
      <p
        className="text-sm font-bold"
        style={{ color: isPositive ? '#e2e8f0' : '#f87171' }}
      >
        {fmt(amount)}
      </p>
      {!isCurrent && (
        <span className="text-[10px] mt-0.5" style={{ color: trendColor }}>
          {trendArrow}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Projections({ allTransactions, accounts, goals }: Props) {
  const currentBalance = accounts.reduce((s, a) => s + a.balance_pence, 0)
  const avgMonthlyNet = computeAvgMonthlyNet(allTransactions)
  const avgMonthlySavings = computeAvgMonthlySavings(allTransactions)
  const breakEvenDay = computeBreakEvenDay(allTransactions, accounts)

  // Balance projections: Now, +1mo, +2mo, +3mo
  const balancePoints = [
    { label: 'Now', amount: currentBalance, isCurrent: true },
    { label: shortMonth(1), amount: currentBalance + avgMonthlyNet, isCurrent: false },
    { label: shortMonth(2), amount: currentBalance + avgMonthlyNet * 2, isCurrent: false },
    { label: shortMonth(3), amount: currentBalance + avgMonthlyNet * 3, isCurrent: false },
  ]

  // Goal projections
  type GoalProjection = {
    goal: SavingsGoal
    pct: number
    monthsToCompletion: number | null
    completionMonth: string | null
    status: 'on-track' | 'behind' | 'no-rate'
  }

  const goalProjections: GoalProjection[] = goals.filter(g => !g.completed_at).map(goal => {
    const pct = goal.target_pence > 0
      ? Math.min(Math.round((goal.current_pence / goal.target_pence) * 100), 100)
      : 0
    const remaining = goal.target_pence - goal.current_pence

    if (remaining <= 0) {
      return { goal, pct: 100, monthsToCompletion: 0, completionMonth: 'Complete', status: 'on-track' }
    }

    if (avgMonthlySavings <= 0) {
      return { goal, pct, monthsToCompletion: null, completionMonth: null, status: 'no-rate' }
    }

    const monthsNeeded = Math.ceil(remaining / avgMonthlySavings)
    const completionDate = new Date()
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded)
    const completionMonth = completionDate.toLocaleString('en-GB', { month: 'short', year: 'numeric' })

    let status: GoalProjection['status'] = 'on-track'
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date)
      const monthsAvailable = (targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
      status = monthsNeeded > monthsAvailable ? 'behind' : 'on-track'
    }

    return { goal, pct, monthsToCompletion: monthsNeeded, completionMonth, status }
  })

  // Upcoming heavy month detection: look at bills in allTransactions
  type HeavyMonth = { label: string; extraPence: number } | null
  let heavyMonthAlert: HeavyMonth = null
  {
    const billMonths: Record<string, number> = {}
    for (const t of allTransactions) {
      if (t.amount_pence >= 0 || !t.is_subscription) continue
      const m = t.booking_date.slice(0, 7)
      billMonths[m] = (billMonths[m] ?? 0) + Math.abs(t.amount_pence)
    }
    const values = Object.values(billMonths)
    if (values.length >= 2) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      // Check next month relative to the most recent data
      const sortedMonths = Object.keys(billMonths).sort()
      const latestMonth = sortedMonths[sortedMonths.length - 1]
      if (latestMonth) {
        const [y, m] = latestMonth.split('-').map(Number)
        const nextMonthStr = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`
        const nextBills = billMonths[nextMonthStr] ?? 0
        if (nextBills > avg * 1.2) {
          const label = new Date(Number(nextMonthStr.split('-')[0]), Number(nextMonthStr.split('-')[1]) - 1)
            .toLocaleString('en-GB', { month: 'long' })
          heavyMonthAlert = { label, extraPence: nextBills - avg }
        }
      }
    }
  }

  const statusBadge = (status: GoalProjection['status']) => {
    const map = {
      'on-track': { label: 'On track', color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', border: 'rgba(0,212,170,0.2)' },
      behind: { label: 'Behind', color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
      'no-rate': { label: 'No savings rate', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.15)' },
    }
    const s = map[status]
    return (
      <span
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
      >
        {s.label}
      </span>
    )
  }

  return (
    <div
      className="p-5 rounded-2xl flex flex-col gap-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#475569',
        }}
      >
        Projections
      </p>

      {/* ── Balance projection ── */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: '#e2e8f0' }}>Balance trajectory</p>
        <div className="grid grid-cols-4 gap-2">
          {balancePoints.map((p, i) => {
            const prev = balancePoints[i - 1]
            const trend = i === 0
              ? 'flat'
              : p.amount > (prev?.amount ?? 0)
                ? 'up'
                : p.amount < (prev?.amount ?? 0)
                  ? 'down'
                  : 'flat'
            return (
              <MiniProjectionCard
                key={p.label}
                label={p.label}
                amount={p.amount}
                isCurrent={p.isCurrent}
                trend={trend}
              />
            )
          })}
        </div>
        <p className="text-[10px] mt-2" style={{ color: '#334155' }}>
          Based on avg monthly net {avgMonthlyNet >= 0 ? '+' : ''}{fmt(avgMonthlyNet)} over last 3 months
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

      {/* ── Break-even day ── */}
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: '#e2e8f0' }}>Break-even day</p>
        {breakEvenDay !== null ? (
          <div className="flex items-baseline gap-2">
            <span
              className="font-bold"
              style={{
                fontSize: 36,
                color: breakEvenDay >= 28 ? '#f87171' : breakEvenDay >= 22 ? '#fbbf24' : '#00d4aa',
                lineHeight: 1,
              }}
            >
              {breakEvenDay}
              <span className="text-sm font-medium ml-0.5" style={{ color: '#475569' }}>
                {breakEvenDay === 1 ? 'st' : breakEvenDay === 2 ? 'nd' : breakEvenDay === 3 ? 'rd' : 'th'}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#334155' }}>—</p>
        )}
        <p className="text-[11px] mt-1" style={{ color: '#475569' }}>
          {breakEvenDay !== null
            ? `At your current rate, you'll have spent your income by the ${breakEvenDay}${breakEvenDay === 1 ? 'st' : breakEvenDay === 2 ? 'nd' : breakEvenDay === 3 ? 'rd' : 'th'}.`
            : 'Not enough current-month data to calculate.'}
        </p>
      </div>

      {/* Divider */}
      {goalProjections.length > 0 && <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />}

      {/* ── Goal projections ── */}
      {goalProjections.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: '#e2e8f0' }}>Goal projections</p>
          <div className="flex flex-col gap-2">
            {goalProjections.map(gp => (
              <div key={gp.goal.id} className="flex items-center gap-3">
                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-[11px] font-medium truncate" style={{ color: '#e2e8f0' }}>
                      {gp.goal.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px]" style={{ color: '#475569' }}>
                        {gp.completionMonth ?? '—'}
                      </span>
                      {statusBadge(gp.status)}
                    </div>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: 4, background: 'rgba(255,255,255,0.07)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${gp.pct}%`,
                        background: gp.status === 'on-track' ? '#00d4aa' : gp.status === 'behind' ? '#f87171' : '#fbbf24',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px]" style={{ color: '#334155' }}>
                      {fmt(gp.goal.current_pence)}
                    </span>
                    <span className="text-[9px]" style={{ color: '#334155' }}>
                      {fmt(gp.goal.target_pence)} · {gp.pct}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Heavy month alert ── */}
      {heavyMonthAlert && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
          <div
            className="p-3 rounded-xl flex items-start gap-2"
            style={{
              background: 'rgba(251,191,36,0.07)',
              border: '1px solid rgba(251,191,36,0.15)',
            }}
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#fbbf24' }}>
                Heavy bills month ahead
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                {heavyMonthAlert.label} looks heavier than average by {fmt(heavyMonthAlert.extraPence)} in bills. Plan ahead.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
