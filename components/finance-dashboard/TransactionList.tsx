'use client'

import type { FinanceTransaction } from './types'
import { CATEGORY_DOT, CATEGORY_BG } from './types'

interface Props {
  transactions: FinanceTransaction[]
}

function fmt(pence: number): string {
  const sign = pence < 0 ? '-' : '+'
  return `${sign}£${(Math.abs(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function groupByDate(txns: FinanceTransaction[]): [string, FinanceTransaction[]][] {
  const map = new Map<string, FinanceTransaction[]>()
  for (const t of txns) {
    const key = t.booking_date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TransactionList({ transactions }: Props) {
  if (!transactions.length) {
    return <p className="text-xs text-zinc-600 py-4">No transactions for this period</p>
  }

  const groups = groupByDate(transactions)

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Transactions</span>
      {groups.map(([date, txns]) => (
        <div key={date}>
          <p className="text-[11px] font-medium text-zinc-600 mb-1.5">{formatDate(date)}</p>
          <div className="flex flex-col gap-0.5">
            {txns.map(t => (
              <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors group">
                <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT[t.category]}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-300 truncate block">
                    {t.merchant_name ?? t.description}
                  </span>
                  {t.is_pending && (
                    <span className="text-[10px] text-yellow-500">Pending</span>
                  )}
                </div>
                <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0 ${CATEGORY_BG[t.category]}`}>
                  {t.category}
                </span>
                {t.is_subscription && (
                  <span className="text-[10px] text-purple-400 shrink-0">↻</span>
                )}
                <span className={`text-sm font-medium shrink-0 ${t.amount_pence < 0 ? 'text-zinc-300' : 'text-emerald-400'}`}>
                  {fmt(t.amount_pence)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
