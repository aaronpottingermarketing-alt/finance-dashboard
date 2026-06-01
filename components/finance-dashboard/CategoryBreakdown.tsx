'use client'

import type { TransactionCategory } from './types'
import { CATEGORY_BAR, CATEGORY_BG } from './types'

interface Props {
  spendByCategory: Record<TransactionCategory, number>
}

const LABELS: Record<TransactionCategory, string> = {
  food: 'Food & drink',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  bills: 'Bills',
  income: 'Income',
  transfers: 'Transfers',
  other: 'Other',
}

function fmt(pence: number): string {
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

export default function CategoryBreakdown({ spendByCategory }: Props) {
  const entries = Object.entries(spendByCategory)
    .filter(([cat]) => cat !== 'income' && cat !== 'transfers')
    .sort(([, a], [, b]) => b - a) as [TransactionCategory, number][]

  if (!entries.length) {
    return <p className="text-xs text-zinc-600">No spending data for this period</p>
  }

  const total = entries.reduce((s, [, v]) => s + v, 0) || 1

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">By Category</span>
      {entries.map(([cat, pence]) => {
        const pct = Math.round((pence / total) * 100)
        return (
          <div key={cat} className="flex items-center gap-2">
            <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0 w-24 text-center ${CATEGORY_BG[cat]}`}>
              {LABELS[cat]}
            </span>
            <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full ${CATEGORY_BAR[cat]}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-zinc-400 shrink-0 w-16 text-right">{fmt(pence)}</span>
            <span className="text-[10px] text-zinc-600 shrink-0 w-8 text-right">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}
