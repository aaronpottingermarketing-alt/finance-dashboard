'use client'

import type { BillScheduleItem } from './types'

interface Props {
  bills: BillScheduleItem[]
  month: string
}

function fmt(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function BillCalendar({ bills, month }: Props) {
  const [year, m] = month.split('-').map(Number)
  const firstDay = new Date(year, m - 1, 1)
  const daysInMonth = new Date(year, m, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7

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
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>
          Bill Calendar
        </span>
        {totalBills > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
            {fmt(totalBills)}<span style={{ color: '#475569', fontWeight: 400 }}>/mo total</span>
          </span>
        )}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexShrink: 0 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#475569', paddingBottom: '6px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — fills remaining space */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${cells.length / 7}, 1fr)`, gap: '4px', flex: 1 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ borderRadius: '8px' }} />

          const dayBills = billsByDay[day] ?? []
          const isToday = day === todayDay
          const total = dayBills.reduce((s, b) => s + b.monthly_pence, 0)
          const isHeavy = total > 5000
          const isMedium = total > 2000 && !isHeavy
          const hasBills = dayBills.length > 0

          let bg = 'rgba(255,255,255,0.02)'
          let border = '1px solid rgba(255,255,255,0.04)'
          if (isToday) { bg = 'rgba(0,212,170,0.08)'; border = '1px solid rgba(0,212,170,0.4)' }
          else if (isHeavy) { bg = 'rgba(239,68,68,0.12)'; border = '1px solid rgba(239,68,68,0.25)' }
          else if (isMedium) { bg = 'rgba(251,191,36,0.1)'; border = '1px solid rgba(251,191,36,0.2)' }
          else if (hasBills) { bg = 'rgba(255,255,255,0.05)'; border = '1px solid rgba(255,255,255,0.1)' }

          return (
            <div key={i} style={{ background: bg, border, borderRadius: '8px', padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
              {/* Date number */}
              <span style={{ fontSize: '13px', fontWeight: isToday ? 700 : 500, color: isToday ? '#00d4aa' : '#e2e8f0', lineHeight: 1 }}>
                {day}
              </span>

              {/* Bill amounts */}
              {dayBills.map((b, j) => (
                <span key={j} style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isHeavy ? '#f87171' : isMedium ? '#fbbf24' : '#94a3b8',
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}>
                  {fmt(b.monthly_pence)}
                </span>
              ))}
            </div>
          )
        })}
      </div>

      {bills.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#334155', padding: '2rem 0' }}>
          No recurring bills detected yet
        </p>
      )}
    </div>
  )
}
