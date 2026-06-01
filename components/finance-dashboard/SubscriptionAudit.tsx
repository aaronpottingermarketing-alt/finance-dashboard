'use client'

import type { FinanceTransaction } from './types'

interface Props {
  allTransactions: FinanceTransaction[]
}

type UsageSignal = 'Active' | 'Low usage' | 'Possibly unused'

interface SubRow {
  name: string
  monthlyCostPence: number
  annualCostPence: number
  lastCharged: string
  chargesIn90Days: number
  usage: UsageSignal
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

function fmtRound(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const SIGNAL_ORDER: Record<UsageSignal, number> = {
  'Possibly unused': 0,
  'Low usage': 1,
  'Active': 2,
}

const SIGNAL_COLOUR: Record<UsageSignal, string> = {
  'Possibly unused': '#ef4444',
  'Low usage': '#f59e0b',
  'Active': '#00d4aa',
}

export default function SubscriptionAudit({ allTransactions }: Props) {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  // Filter to subscriptions that are debits
  const subs = allTransactions.filter(t => t.is_subscription && t.amount_pence < 0)

  if (!subs.length) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.25rem',
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>
          Subscription Audit
        </p>
        <p style={{ color: '#334155', fontSize: 12, marginTop: '0.75rem' }}>No subscriptions detected</p>
      </div>
    )
  }

  // Deduplicate by merchant — keep most recent for cost; count all within 90 days
  const byMerchant = new Map<string, FinanceTransaction[]>()
  for (const t of subs) {
    const key = t.merchant_name ?? t.description
    const arr = byMerchant.get(key) ?? []
    arr.push(t)
    byMerchant.set(key, arr)
  }

  const rows: SubRow[] = []

  byMerchant.forEach((txns, name) => {
    const sorted = [...txns].sort((a, b) => b.booking_date.localeCompare(a.booking_date))
    const latest = sorted[0]
    const monthlyCost = Math.abs(latest.amount_pence)
    const chargesIn90 = txns.filter(t => new Date(t.booking_date) >= cutoff).length

    const usage: UsageSignal =
      chargesIn90 < 2 ? 'Possibly unused' :
      chargesIn90 <= 3 ? 'Low usage' :
      'Active'

    rows.push({
      name,
      monthlyCostPence: monthlyCost,
      annualCostPence: monthlyCost * 12,
      lastCharged: latest.booking_date,
      chargesIn90Days: chargesIn90,
      usage,
    })
  })

  // Sort: possibly unused → low usage → active
  rows.sort((a, b) => SIGNAL_ORDER[a.usage] - SIGNAL_ORDER[b.usage])

  const totalMonthlyPence = rows.reduce((s, r) => s + r.monthlyCostPence, 0)
  const totalAnnualPence = totalMonthlyPence * 12

  const lowUsageSavingsPence = rows
    .filter(r => r.usage === 'Possibly unused' || r.usage === 'Low usage')
    .reduce((s, r) => s + r.annualCostPence, 0)

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
    marginBottom: '0.875rem',
  }

  return (
    <div style={cardStyle}>
      <p style={labelStyle}>Subscription Audit</p>

      {/* Banner */}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {rows.map(row => {
          const sigColour = SIGNAL_COLOUR[row.usage]
          return (
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
              {/* Icon + name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: 3 }}>
                  <span style={{ color: '#a78bfa', fontSize: 12 }}>↻</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Usage badge */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: sigColour,
                    background: `${sigColour}18`,
                    border: `1px solid ${sigColour}33`,
                    borderRadius: 999,
                    padding: '1px 7px',
                  }}>
                    {row.usage}
                  </span>
                  <span style={{ fontSize: 10, color: '#334155' }}>
                    Last: {new Date(row.lastCharged).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* Costs */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{fmt(row.monthlyCostPence)}<span style={{ fontSize: 10, fontWeight: 400, color: '#475569' }}>/mo</span></p>
                <p style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>{fmtRound(row.annualCostPence)}/yr</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom insight */}
      {lowUsageSavingsPence > 0 && (
        <div style={{
          padding: '0.625rem 0.875rem',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: '0.75rem',
          fontSize: 11,
          color: '#ef4444',
        }}>
          You could save <strong>{fmtRound(lowUsageSavingsPence)}/yr</strong> by cancelling low-usage subscriptions
        </div>
      )}
    </div>
  )
}
