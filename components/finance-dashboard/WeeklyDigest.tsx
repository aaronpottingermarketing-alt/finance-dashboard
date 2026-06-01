'use client'

import type { FinanceTransaction, TransactionCategory } from '@/components/finance-dashboard/types'

interface Props {
  allTransactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function getMondayOf(d: Date): Date {
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return startOfDay(mon)
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & drink',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  bills: 'Bills',
  other: 'Other',
  income: 'Income',
  transfers: 'Transfers',
}

function catLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat
}

export default function WeeklyDigest({ allTransactions }: Props) {
  const today = startOfDay(new Date())
  const thisMonday = getMondayOf(today)
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000)
  const lastSunday = new Date(thisMonday.getTime() - 86400000)

  // Filter only debits (spend)
  const debits = allTransactions.filter(t => t.amount_pence < 0 && t.category !== 'transfers')

  // This week: Mon → today
  const thisWeekDebits = debits.filter(t => {
    const d = startOfDay(new Date(t.booking_date))
    return d >= thisMonday && d <= today
  })

  // Last week: Mon → Sun
  const lastWeekDebits = debits.filter(t => {
    const d = startOfDay(new Date(t.booking_date))
    return d >= lastMonday && d <= lastSunday
  })

  const thisWeekSpend = thisWeekDebits.reduce((s, t) => s + Math.abs(t.amount_pence), 0)
  const lastWeekSpend = lastWeekDebits.reduce((s, t) => s + Math.abs(t.amount_pence), 0)
  const weeklyChange = thisWeekSpend - lastWeekSpend // negative = spending less = good
  const spendingLess = weeklyChange <= 0

  // Per-category totals this week vs last week
  const thisWeekByCategory: Record<string, number> = {}
  const lastWeekByCategory: Record<string, number> = {}

  for (const t of thisWeekDebits) {
    thisWeekByCategory[t.category] = (thisWeekByCategory[t.category] ?? 0) + Math.abs(t.amount_pence)
  }
  for (const t of lastWeekDebits) {
    lastWeekByCategory[t.category] = (lastWeekByCategory[t.category] ?? 0) + Math.abs(t.amount_pence)
  }

  const allCats = Array.from(new Set([
    ...Object.keys(thisWeekByCategory),
    ...Object.keys(lastWeekByCategory),
  ])).filter(c => c !== 'income' && c !== 'transfers') as TransactionCategory[]

  // Best category = biggest reduction (this - last, most negative wins)
  const catChanges = allCats.map(cat => ({
    cat,
    change: (thisWeekByCategory[cat] ?? 0) - (lastWeekByCategory[cat] ?? 0),
  }))

  const bestCat = catChanges.length > 0
    ? catChanges.reduce((a, b) => a.change < b.change ? a : b)
    : null
  const worstCat = catChanges.length > 0
    ? catChanges.reduce((a, b) => a.change > b.change ? a : b)
    : null

  // Top merchant this week
  const merchantSpend: Record<string, number> = {}
  for (const t of thisWeekDebits) {
    const name = t.merchant_name ?? t.description
    merchantSpend[name] = (merchantSpend[name] ?? 0) + Math.abs(t.amount_pence)
  }
  const topMerchantEntry = Object.entries(merchantSpend).sort((a, b) => b[1] - a[1])[0] ?? null

  // Generate human summary
  let summaryText: string
  if (lastWeekSpend === 0) {
    summaryText = `Week is just getting started — ${fmt(thisWeekSpend)} spent so far.`
  } else if (spendingLess) {
    const saving = fmt(Math.abs(weeklyChange))
    let tail = ''
    if (bestCat && bestCat.change < 0) {
      tail = ` ${catLabel(bestCat.cat)} is your best performer.`
    }
    if (topMerchantEntry) {
      tail += ` ${topMerchantEntry[0]} is your biggest spend at ${fmt(topMerchantEntry[1])}.`
    }
    summaryText = `You've spent ${fmt(thisWeekSpend)} this week — ${saving} less than last week.${tail}`
  } else {
    const over = fmt(weeklyChange)
    let tail = ''
    if (worstCat && worstCat.change > 0) {
      tail = ` ${catLabel(worstCat.cat)} is the main culprit.`
    }
    if (topMerchantEntry) {
      tail += ` ${topMerchantEntry[0]} is your biggest spend at ${fmt(topMerchantEntry[1])}.`
    }
    summaryText = `You've spent ${fmt(thisWeekSpend)} this week — ${over} more than last week.${tail}`
  }

  // Header date: Monday of this week
  const mondayLabel = thisMonday.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    margin: '0.75rem 0',
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1rem',
      padding: '1.25rem',
    }}>
      {/* Header */}
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#475569',
        marginBottom: '0.75rem',
      }}>
        Weekly Digest · {mondayLabel}
      </p>

      <div style={dividerStyle} />

      {/* Summary text */}
      <p style={{
        fontSize: 14,
        color: '#e2e8f0',
        lineHeight: 1.6,
        margin: '0.75rem 0',
      }}>
        &ldquo;{summaryText}&rdquo;
      </p>

      <div style={dividerStyle} />

      {/* Bottom stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
        {/* Weekly change */}
        {lastWeekSpend > 0 && (
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: spendingLess ? '#00d4aa' : '#ef4444',
          }}>
            {spendingLess ? '↓' : '↑'} {fmt(Math.abs(weeklyChange))} vs last week
          </span>
        )}

        {/* Best category pill */}
        {bestCat && bestCat.change < 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#00d4aa',
            background: 'rgba(0,212,170,0.08)',
            border: '1px solid rgba(0,212,170,0.2)',
            borderRadius: '0.375rem',
            padding: '0.15rem 0.5rem',
          }}>
            Best: {catLabel(bestCat.cat)}
          </span>
        )}

        {/* Worst category pill — only show if spending more */}
        {!spendingLess && worstCat && worstCat.change > 0 && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '0.375rem',
            padding: '0.15rem 0.5rem',
          }}>
            Watch: {catLabel(worstCat.cat)}
          </span>
        )}
      </div>
    </div>
  )
}
