'use client'

import type { BillScheduleItem } from './types'

interface Props {
  bills: BillScheduleItem[]
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

const MERCHANT_ICONS: Record<string, string> = {
  netflix: '🎬', spotify: '🎵', 'amazon prime': '📦', disney: '🏰',
  apple: '🍎', youtube: '▶️', gym: '🏋️', puregym: '🏋️', sky: '📡',
  'bt ': '📡', virgin: '📡', vodafone: '📱', 'ee ': '📱', o2: '📱',
  'council tax': '🏛️', water: '💧', electric: '⚡', gas: '🔥',
  'british gas': '🔥', octopus: '🐙', insurance: '🛡️', rent: '🏠', mortgage: '🏠',
}

function getIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(MERCHANT_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '💳'
}

export default function UpcomingBills({ bills }: Props) {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const upcoming = bills
    .map(bill => {
      let daysUntil: number
      let date: Date
      if (bill.next_payment_date) {
        date = new Date(bill.next_payment_date)
        const billMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        daysUntil = Math.round((billMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
      } else {
        daysUntil = bill.day_of_month - currentDay
        if (daysUntil < 0) daysUntil += daysInMonth
        date = new Date(today)
        date.setDate(today.getDate() + daysUntil)
      }
      return { ...bill, daysUntil, date }
    })
    .filter(b => b.daysUntil >= 0 && b.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const totalUpcoming = upcoming.reduce((s, b) => s + b.monthly_pence, 0)

  if (!upcoming.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">Upcoming Bills</p>
        <p className="text-xs text-zinc-600 text-center py-3">No bills in the next 14 days</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Upcoming Bills</p>
        <span className="text-xs font-semibold text-zinc-300">{fmt(totalUpcoming)} due</span>
      </div>

      <div className="flex flex-col gap-2">
        {upcoming.map((bill, i) => {
          const isToday = bill.daysUntil === 0
          const isTomorrow = bill.daysUntil === 1
          const isThisWeek = bill.daysUntil <= 7
          const isLarge = bill.monthly_pence > 5000

          const dayLabel = isToday ? 'Today'
            : isTomorrow ? 'Tomorrow'
            : bill.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

          const cardStyle = isToday
            ? 'border-red-500/40 bg-red-950/20'
            : isTomorrow
            ? 'border-amber-500/30 bg-amber-950/10'
            : isThisWeek
            ? 'border-zinc-700 bg-zinc-800/50'
            : 'border-zinc-800'

          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cardStyle}`}>
              <span className="text-xl shrink-0 w-8 text-center leading-none">
                {getIcon(bill.merchant_name)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{bill.merchant_name}</p>
                <p className={`text-[11px] ${isToday ? 'text-red-400 font-semibold' : isTomorrow ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {dayLabel}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${isLarge ? 'text-red-400' : 'text-zinc-300'}`}>
                  {fmt(bill.monthly_pence)}
                </p>
                {bill.daysUntil > 0 && (
                  <p className="text-[10px] text-zinc-600">{bill.daysUntil}d</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
