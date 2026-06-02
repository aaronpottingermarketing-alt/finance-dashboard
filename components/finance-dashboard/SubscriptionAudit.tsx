'use client'

import type { FinanceTransaction } from './types'

interface Props {
  allTransactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

function fmtRound(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

// Strip bank reference codes so "DAVID LLOYD LEISUR 080925DABG31 DDR" → "David Lloyd Leisur"
function cleanName(t: FinanceTransaction): string {
  if (t.merchant_name) return t.merchant_name
  const words = t.description.split(/\s+/)
  const refIdx = words.findIndex(w => /\d/.test(w) && w.length > 6)
  const meaningful = refIdx > 0 ? words.slice(0, refIdx) : words
  return meaningful.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

export default function SubscriptionAudit({ allTransactions }: Props) {
  const cutoff45 = new Date()
  cutoff45.setDate(cutoff45.getDate() - 45)
  const cutoff45Str = cutoff45.toISOString().split('T')[0]

  // Use category filter — is_subscription flag is unreliable
  const subs = allTransactions.filter(t => t.category === 'subscriptions' && t.amount_pence < 0)

  // Group by cleaned merchant name
  const byMerchant = new Map<string, FinanceTransaction[]>()
  for (const t of subs) {
    const key = cleanName(t).toLowerCase().trim()
    const arr = byMerchant.get(key) ?? []
    arr.push(t)
    byMerchant.set(key, arr)
  }

  // Keep only active: charged at least once in last 45 days
  const activeRows: { name: string; monthlyCostPence: number; lastCharged: string }[] = []

  byMerchant.forEach((txns, _key) => {
    const recentTxns = txns.filter(t => t.booking_date >= cutoff45Str)
    if (!recentTxns.length) return  // not active

    const sorted = [...txns].sort((a, b) => b.booking_date.localeCompare(a.booking_date))
    const latest = sorted[0]
    activeRows.push({
      name: cleanName(latest),
      monthlyCostPence: Math.abs(latest.amount_pence),
      lastCharged: latest.booking_date,
    })
  })

  activeRows.sort((a, b) => b.monthlyCostPence - a.monthlyCostPence)

  const totalMonthlyPence = activeRows.reduce((s, r) => s + r.monthlyCostPence, 0)
  const totalAnnualPence = totalMonthlyPence * 12

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '1rem',
    padding: '1.25rem',
  }

  if (!activeRows.length) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>
          Active Subscriptions
        </p>
        <p style={{ color: '#334155', fontSize: 12, marginTop: '0.75rem' }}>No active subscriptions found</p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: '0.875rem' }}>
        Active Subscriptions
      </p>

      {/* Totals banner */}
      <div style={{
        background: 'rgba(167,139,250,0.08)',
        border: '1px solid rgba(167,139,250,0.18)',
        borderRadius: '0.75rem',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'baseline',
      }}>
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.1 }}>{fmtRound(totalMonthlyPence)}</p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>per month</p>
        </div>
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.1 }}>{fmtRound(totalAnnualPence)}</p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>per year</p>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {activeRows.map(row => (
          <div
            key={row.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.75rem',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '0.75rem',
            }}
          >
            <span style={{ color: '#a78bfa', fontSize: 12, flexShrink: 0 }}>↻</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.name}
            </span>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                {fmt(row.monthlyCostPence)}<span style={{ fontSize: 10, fontWeight: 400, color: '#475569' }}>/mo</span>
              </p>
              <p style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
                {fmtRound(row.monthlyCostPence * 12)}/yr
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
