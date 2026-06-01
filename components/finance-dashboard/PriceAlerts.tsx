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
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: '#475569' }}
      >
        Price Changes{' '}
        <span style={{ color: '#fbbf24' }} className="ml-1">{unacknowledged.length}</span>
      </p>
      <div className="flex flex-col gap-1.5">
        {unacknowledged.map(alert => {
          const isIncrease = alert.change_pence > 0
          return (
            <div
              key={alert.id}
              className="flex items-start justify-between gap-2 px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: isIncrease
                  ? '1px solid rgba(251,191,36,0.35)'
                  : '1px solid rgba(0,212,170,0.25)',
                borderRadius: '1rem',
              }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium block truncate" style={{ color: '#e2e8f0' }}>
                  {alert.merchant_name}
                </span>
                <span className="text-[11px]" style={{ color: '#475569' }}>
                  {fmt(alert.old_amount_pence)} →{' '}
                  <span style={{ color: isIncrease ? '#f87171' : '#00d4aa' }}>
                    {fmt(alert.new_amount_pence)}
                  </span>
                  {' '}
                  <span style={{ color: isIncrease ? '#f87171' : '#00d4aa' }}>
                    ({isIncrease ? '+' : ''}{fmt(alert.change_pence)}/mo)
                  </span>
                </span>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-[10px] shrink-0 mt-0.5 transition-colors"
                style={{ color: '#334155' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
                onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
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
