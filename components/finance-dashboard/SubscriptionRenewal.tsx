'use client'

import type { BillScheduleItem } from '@/components/finance-dashboard/types'

interface Props {
  bills: BillScheduleItem[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

export default function SubscriptionRenewal({ bills }: Props) {
  const today = new Date()
  const todayDay = today.getDate()

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Find bills renewing in the next 7 days, subscription-range only (< £150/month)
  const renewing = bills.filter(b => {
    if (b.monthly_pence < 200) return false  // below £2 — noise (mandate fees etc.)
    if (b.monthly_pence >= 15000) return false // above £150 — not a subscription
    let daysUntil: number
    if (b.next_payment_date) {
      const billDate = new Date(b.next_payment_date)
      const billMidnight = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate())
      daysUntil = Math.round((billMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      daysUntil = b.day_of_month - todayDay
      if (daysUntil < 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
        daysUntil += daysInMonth
      }
    }
    return daysUntil >= 0 && daysUntil <= 7
  })

  if (renewing.length === 0) return null

  const total = renewing.reduce((s, b) => s + b.monthly_pence, 0)
  const shown = renewing.slice(0, 3)
  const overflow = renewing.length - 3

  // Build merchant list string
  const merchantParts = shown.map(b => `${b.merchant_name} ${fmt(b.monthly_pence)}`)
  const merchantLine = merchantParts.join(' · ') + (overflow > 0 ? ` · +${overflow} more` : '')

  return (
    <div style={{
      background: 'rgba(167,139,250,0.08)',
      border: '1px solid rgba(167,139,250,0.2)',
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
    }}>
      {/* Top line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{ color: '#a78bfa', fontSize: 15, lineHeight: 1 }}>↻</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
          {renewing.length} subscription{renewing.length !== 1 ? 's' : ''} renewing this week
        </span>
        <span style={{ fontSize: 13, color: '#475569' }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
          {fmt(total)} total
        </span>
      </div>

      {/* Merchant list */}
      <p style={{
        fontSize: 12,
        color: '#334155',
        marginLeft: '1.5rem',
        lineHeight: 1.4,
      }}>
        {merchantLine}
      </p>
    </div>
  )
}
