'use client'

import type { BillScheduleItem } from './types'

interface Props {
  bills: BillScheduleItem[]
  month: string // 'YYYY-MM'
}

function fmt(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function BillCalendar({ bills, month }: Props) {
  const [year, m] = month.split('-').map(Number)
  const firstDay = new Date(year, m - 1, 1)
  const daysInMonth = new Date(year, m, 0).getDate()

  // Monday-first offset
  const startOffset = (firstDay.getDay() + 6) % 7

  // Map day-of-month to bills
  const billsByDay: Record<number, BillScheduleItem[]> = {}
  for (const bill of bills) {
    const day = bill.day_of_month
    if (day >= 1 && day <= daysInMonth) {
      if (!billsByDay[day]) billsByDay[day] = []
      billsByDay[day].push(bill)
    }
  }

  const totalBills = bills.reduce((s, b) => s + b.monthly_pence, 0)
  const today = new Date()
  const todayDay = today.getFullYear() === year && today.getMonth() + 1 === m ? today.getDate() : null

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Bill Calendar</span>
        {totalBills > 0 && (
          <span className="text-xs text-zinc-400">{fmt(totalBills)}/mo total</span>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[9px] text-zinc-600 font-medium">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dayBills = billsByDay[day] ?? []
          const isToday = day === todayDay
          const total = dayBills.reduce((s, b) => s + b.monthly_pence, 0)
          const isHeavy = total > 5000  // > £50
          const isMedium = total > 2000 && !isHeavy // > £20

          return (
            <div
              key={i}
              className={`relative rounded p-0.5 min-h-[36px] text-center ${
                isToday ? 'border border-zinc-500' : ''
              } ${
                isHeavy ? 'bg-red-950/40' : isMedium ? 'bg-amber-950/40' : dayBills.length > 0 ? 'bg-zinc-800' : ''
              }`}
            >
              <span className={`text-[10px] ${isToday ? 'text-zinc-200 font-bold' : 'text-zinc-500'}`}>{day}</span>
              {dayBills.map((b, j) => (
                <div key={j} className="mt-0.5">
                  <span className={`text-[9px] leading-tight block ${isHeavy ? 'text-red-300' : isMedium ? 'text-amber-300' : 'text-zinc-400'}`}>
                    {fmt(b.monthly_pence)}
                  </span>
                </div>
              ))}
              {dayBills.length > 0 && (
                <title>
                  {dayBills.map(b => `${b.merchant_name}: ${fmt(b.monthly_pence)}`).join('\n')}
                </title>
              )}
            </div>
          )
        })}
      </div>

      {bills.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">No recurring bills detected yet</p>
      )}
    </div>
  )
}
