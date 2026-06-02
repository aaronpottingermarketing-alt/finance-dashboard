'use client'

import type { FinanceTransaction } from './types'

interface Props {
  subscriptions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

// Strip bank reference codes from descriptions so "DAVID LLOYD LEISUR 080925DABG31 DDR"
// and "DAVID LLOYD LEISUR 080925DABG31B DDR" both deduplicate to "David Lloyd Leisur"
function cleanName(t: FinanceTransaction): string {
  if (t.merchant_name) return t.merchant_name
  const words = t.description.split(/\s+/)
  // First word that looks like a reference code (contains digits and is long)
  const refIdx = words.findIndex(w => /\d/.test(w) && w.length > 6)
  const meaningful = refIdx > 0 ? words.slice(0, refIdx) : words
  return meaningful.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function merchantKey(t: FinanceTransaction): string {
  return cleanName(t).toLowerCase().trim()
}

export default function SubscriptionPanel({ subscriptions }: Props) {
  // Deduplicate by cleaned merchant name — keep most recent
  const byMerchant = new Map<string, FinanceTransaction>()
  for (const t of subscriptions) {
    const key = merchantKey(t)
    const existing = byMerchant.get(key)
    if (!existing || t.booking_date > existing.booking_date) {
      byMerchant.set(key, t)
    }
  }

  const entries = Array.from(byMerchant.values()).sort(
    (a, b) => Math.abs(b.amount_pence) - Math.abs(a.amount_pence)
  )

  const totalPence = entries.reduce((s, t) => s + Math.abs(t.amount_pence), 0)

  if (!entries.length) {
    return (
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: '#475569' }}
        >
          Subscriptions
        </p>
        <div
          className="text-center py-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '1rem',
          }}
        >
          <p className="text-xs" style={{ color: '#334155' }}>No subscriptions detected yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Subscriptions
        </p>
        <span className="text-xs" style={{ color: '#334155' }}>{fmt(totalPence)}/mo total</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {entries.map(t => {
          const isExpensive = Math.abs(t.amount_pence) > 2000 // > £20
          return (
            <div
              key={t.id}
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '1rem',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0" style={{ color: '#a78bfa' }}>↻</span>
                <span className="text-xs truncate" style={{ color: '#e2e8f0' }}>
                  {cleanName(t)}
                </span>
              </div>
              <span
                className="text-xs font-medium shrink-0 ml-2"
                style={{ color: isExpensive ? '#fbbf24' : '#475569' }}
              >
                {fmt(t.amount_pence)}/mo
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
