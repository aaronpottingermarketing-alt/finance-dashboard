'use client'

import type { PriceChange } from './types'

interface Props {
  alerts: PriceChange[]
  onDismiss: (id: string) => void
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

export default function PriceAlerts({ alerts, onDismiss }: Props) {
  const unacknowledged = alerts.filter(a => !a.acknowledged)
  if (!unacknowledged.length) return null

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
        Price Changes <span className="text-amber-400 ml-1">{unacknowledged.length}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {unacknowledged.map(alert => {
          const isIncrease = alert.change_pence > 0
          return (
            <div key={alert.id} className="flex items-start justify-between gap-2 px-2 py-2 rounded-lg bg-zinc-900 border border-amber-500/20">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-zinc-200 block truncate">{alert.merchant_name}</span>
                <span className="text-[11px] text-zinc-500">
                  {fmt(alert.old_amount_pence)} →{' '}
                  <span className={isIncrease ? 'text-red-400' : 'text-emerald-400'}>
                    {fmt(alert.new_amount_pence)}
                  </span>
                  {' '}
                  <span className={isIncrease ? 'text-red-400' : 'text-emerald-400'}>
                    ({isIncrease ? '+' : ''}{fmt(alert.change_pence)}/mo)
                  </span>
                </span>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 shrink-0 mt-0.5"
              >
                Dismiss
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
