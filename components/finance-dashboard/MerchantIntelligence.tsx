'use client'

import type { FinanceTransaction } from './types'

interface Props {
  allTransactions: FinanceTransaction[]
  transactions: FinanceTransaction[]
}

interface MerchantRow {
  name: string
  totalPence: number
  visitCount: number
  avgPerVisit: number
  lastSeen: string
  currentMonthSpend: number
  priorMonthSpend: number
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

function fmtFull(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

export default function MerchantIntelligence({ allTransactions, transactions: _ }: Props) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const priorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const priorMonth = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}`

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  // Build merchant map from ALL debits
  const map = new Map<string, {
    total: number
    visits: number
    lastSeen: string
    currentMonth: number
    priorMonth: number
  }>()

  const allDebits = allTransactions.filter(t => t.amount_pence < 0)

  for (const t of allDebits) {
    const name = t.merchant_name ?? t.description
    const month = t.booking_date.slice(0, 7)
    const existing = map.get(name) ?? { total: 0, visits: 0, lastSeen: '', currentMonth: 0, priorMonth: 0 }

    existing.total += Math.abs(t.amount_pence)
    existing.visits++
    if (t.booking_date > existing.lastSeen) existing.lastSeen = t.booking_date
    if (month === currentMonth) existing.currentMonth += Math.abs(t.amount_pence)
    if (month === priorMonth) existing.priorMonth += Math.abs(t.amount_pence)

    map.set(name, existing)
  }

  const rows: MerchantRow[] = Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      totalPence: data.total,
      visitCount: data.visits,
      avgPerVisit: data.visits > 0 ? data.total / data.visits : 0,
      lastSeen: data.lastSeen,
      currentMonthSpend: data.currentMonth,
      priorMonthSpend: data.priorMonth,
    }))
    .sort((a, b) => b.totalPence - a.totalPence)
    .slice(0, 8)

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '1rem',
    padding: '1.25rem',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#475569',
  }

  if (!rows.length) {
    return (
      <div style={cardStyle}>
        <p style={labelStyle}>Top Merchants</p>
        <p style={{ color: '#334155', fontSize: 12, marginTop: '0.75rem' }}>No transaction data yet</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p style={labelStyle}>Top Merchants</p>
        <span style={{ fontSize: 11, color: '#334155' }}>Last 90 days</span>
      </div>

      <div>
        {rows.map((row, i) => {
          const isMore = row.currentMonthSpend > row.priorMonthSpend
          const isLess = row.currentMonthSpend < row.priorMonthSpend
          const arrow = isMore ? '▲' : isLess ? '▼' : '—'
          const arrowColour = isMore ? '#ef4444' : isLess ? '#00d4aa' : '#475569'

          return (
            <div key={row.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.625rem', paddingBottom: '0.625rem' }}>
                {/* Rank */}
                <span style={{ width: 16, fontSize: 11, color: '#334155', flexShrink: 0, textAlign: 'center' }}>
                  {i + 1}
                </span>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                    {row.visitCount} visit{row.visitCount !== 1 ? 's' : ''} · avg {fmtFull(row.avgPerVisit)}
                  </p>
                </div>

                {/* Right side */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: arrowColour, fontWeight: 700 }}>{arrow}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{fmt(row.totalPence)}</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
                    {row.lastSeen ? new Date(row.lastSeen).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                  </p>
                </div>
              </div>

              {/* Divider — skip after last row */}
              {i < rows.length - 1 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
