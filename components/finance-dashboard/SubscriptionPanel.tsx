'use client'

import type { FinanceTransaction } from './types'

interface Props {
  subscriptions: FinanceTransaction[]
}

function fmt(pence: number): string {
  return (Math.abs(pence) / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

export default function SubscriptionPanel({ subscriptions }: Props) {
  // Deduplicate by merchant — keep most recent
  const byMerchant = new Map<string, FinanceTransaction>()
  for (const t of subscriptions) {
    const key = t.merchant_name ?? t.description
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
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Subscriptions</p>
        <p className="text-xs text-zinc-600">No subscriptions detected yet</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Subscriptions</p>
        <span className="text-xs text-zinc-400">{fmt(totalPence)}/mo total</span>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map(t => {
          const isExpensive = Math.abs(t.amount_pence) > 2000 // > £20
          return (
            <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-purple-400 text-sm shrink-0">↻</span>
                <span className="text-xs text-zinc-300 truncate">
                  {t.merchant_name ?? t.description}
                </span>
              </div>
              <span className={`text-xs font-medium shrink-0 ml-2 ${isExpensive ? 'text-amber-400' : 'text-zinc-400'}`}>
                {fmt(t.amount_pence)}/mo
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
