'use client'

import type { BillScheduleItem } from './types'

interface Props {
  bills: BillScheduleItem[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

export default function UpcomingBills({ bills }: Props) {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  // Bills in next 7 days (wrapping into next month)
  const upcoming = bills
    .map(bill => {
      let daysUntil = bill.day_of_month - currentDay
      if (daysUntil < 0) daysUntil += daysInMonth // wrap to next month
      const date = new Date(today)
      date.setDate(today.getDate() + daysUntil)
      return { ...bill, daysUntil, date }
    })
    .filter(b => b.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  if (!upcoming.length) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Upcoming Bills</p>
        <p className="text-xs text-zinc-600">No bills in the next 7 days</p>
      </div>
    )
  }

  const totalUpcoming = upcoming.reduce((s, b) => s + b.monthly_pence, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Upcoming Bills (7 days)</p>
        <span className="text-xs text-zinc-500">{fmt(totalUpcoming)}</span>
      </div>
      <div className="flex flex-col gap-1">
        {upcoming.map((bill, i) => {
          const isToday = bill.daysUntil === 0
          const isTomorrow = bill.daysUntil === 1
          const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : bill.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          const isHeavy = bill.monthly_pence > 5000

          return (
            <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] font-medium shrink-0 ${isToday ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {dayLabel}
                </span>
                <span className="text-xs text-zinc-300 truncate">{bill.merchant_name}</span>
              </div>
              <span className={`text-xs font-medium shrink-0 ml-2 ${isHeavy ? 'text-red-400' : 'text-zinc-400'}`}>
                {fmt(bill.monthly_pence)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
