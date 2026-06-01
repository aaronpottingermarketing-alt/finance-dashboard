'use client'

import type { FinanceTransaction } from './types'

interface Props {
  allTransactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function SpendingPatterns({ allTransactions }: Props) {
  const debits = allTransactions.filter(t => t.amount_pence < 0)

  // ── Day of week spending ─────────────────────────────────────────────────────
  const dayTotals: number[] = [0, 0, 0, 0, 0, 0, 0]   // Mon=0 … Sun=6
  const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]

  for (const t of debits) {
    const d = new Date(t.booking_date)
    // getDay(): 0=Sun,1=Mon…6=Sat → remap to Mon=0…Sun=6
    const raw = d.getDay()
    const idx = raw === 0 ? 6 : raw - 1
    dayTotals[idx] += Math.abs(t.amount_pence)
    dayCounts[idx]++
  }

  const dayAvgs = dayTotals.map((total, i) => (dayCounts[i] > 0 ? total / dayCounts[i] : 0))
  const maxAvg = Math.max(...dayAvgs, 1)
  const mostExpensiveDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs))

  // ── Weekend vs weekday ───────────────────────────────────────────────────────
  // Mon-Fri = weekday (idx 0-4), Sat-Sun = weekend (idx 5-6)
  const weekdayTotal = dayTotals.slice(0, 5).reduce((a, b) => a + b, 0)
  const weekdayDays = dayCounts.slice(0, 5).reduce((a, b) => a + b, 0)
  const weekendTotal = dayTotals.slice(5).reduce((a, b) => a + b, 0)
  const weekendDays = dayCounts.slice(5).reduce((a, b) => a + b, 0)

  const avgWeekday = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0
  const avgWeekend = weekendDays > 0 ? weekendTotal / weekendDays : 0
  const weekendPct = avgWeekday > 0 ? Math.round(((avgWeekend - avgWeekday) / avgWeekday) * 100) : 0

  // ── Month-week pattern ───────────────────────────────────────────────────────
  const weekBuckets: number[] = [0, 0, 0, 0]  // w1:1-7, w2:8-14, w3:15-21, w4:22-31
  for (const t of debits) {
    const day = new Date(t.booking_date).getDate()
    const wIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3
    weekBuckets[wIdx] += Math.abs(t.amount_pence)
  }
  const heaviestWeek = weekBuckets.indexOf(Math.max(...weekBuckets)) + 1

  // ── Biggest single-day spend (last 90 days) ──────────────────────────────────
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const recent = debits.filter(t => new Date(t.booking_date) >= cutoff)

  const daySpend = new Map<string, number>()
  for (const t of recent) {
    const key = t.booking_date.slice(0, 10)
    daySpend.set(key, (daySpend.get(key) ?? 0) + Math.abs(t.amount_pence))
  }

  let biggestDay = ''
  let biggestAmount = 0
  daySpend.forEach((amount, date) => {
    if (amount > biggestAmount) { biggestAmount = amount; biggestDay = date }
  })

  // ── Weekend pill colour ──────────────────────────────────────────────────────
  const weekendColour = weekendPct > 20 ? '#ef4444' : weekendPct > 10 ? '#f59e0b' : '#00d4aa'

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '1rem',
    padding: '1.25rem',
  }

  const pillStyle = (colour: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.625rem',
    borderRadius: '999px',
    fontSize: 11,
    fontWeight: 500,
    color: colour,
    background: `${colour}18`,
    border: `1px solid ${colour}33`,
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#475569',
  }

  return (
    <div style={cardStyle}>
      <p style={{ ...labelStyle, marginBottom: '1rem' }}>Spending Patterns</p>

      {/* Day of week bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {DAY_LABELS.map((label, i) => {
          const pct = maxAvg > 0 ? (dayAvgs[i] / maxAvg) * 100 : 0
          const isTop = i === mostExpensiveDayIdx
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: 28,
                fontSize: 11,
                color: isTop ? '#e2e8f0' : '#475569',
                fontWeight: isTop ? 600 : 400,
                flexShrink: 0,
              }}>
                {label}
              </span>
              <div style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: isTop ? '#00d4aa' : 'rgba(0,212,170,0.35)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{
                width: 44,
                textAlign: 'right',
                fontSize: 11,
                color: isTop ? '#e2e8f0' : '#475569',
                fontWeight: isTop ? 600 : 400,
                flexShrink: 0,
              }}>
                {dayAvgs[i] > 0 ? fmt(dayAvgs[i]) : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Insight pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={pillStyle(weekendColour)}>
          {weekendPct >= 0
            ? `Weekends cost ${weekendPct}% more than weekdays`
            : `Weekends cost ${Math.abs(weekendPct)}% less than weekdays`}
        </span>
        <span style={pillStyle('#00d4aa')}>
          Most expensive day: {DAY_LABELS[mostExpensiveDayIdx]} (avg {fmt(dayAvgs[mostExpensiveDayIdx])})
        </span>
        <span style={pillStyle('#f59e0b')}>
          Heaviest week: Week {heaviestWeek} of the month
        </span>
        {biggestDay && (
          <span style={pillStyle('#475569')}>
            Biggest single day: {biggestDay} — {fmt(biggestAmount)}
          </span>
        )}
      </div>
    </div>
  )
}
