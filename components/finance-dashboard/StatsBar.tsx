'use client'

import type { TransactionCategory } from './types'

interface Props {
  totalBalance: number
  spendThisMonth: number
  spendLastMonth: number
  biggestCategory: { name: TransactionCategory; pence: number } | null
  totalMonthSpend: number
}

function fmt(pence: number, compact = false): string {
  if (compact && Math.abs(pence) >= 100000) {
    return `£${(pence / 100000).toFixed(1)}k`
  }
  return (pence / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & drink',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  bills: 'Bills',
  other: 'Other',
}

export default function StatsBar({ totalBalance, spendThisMonth, spendLastMonth, biggestCategory, totalMonthSpend }: Props) {
  const monthChange = spendThisMonth - spendLastMonth
  const changePositive = monthChange > 0 // spending more = bad

  const stats = [
    {
      label: 'Total Balance',
      value: fmt(totalBalance),
      sub: 'across all accounts',
      accent: totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400',
      valueClass: totalBalance >= 0 ? 'text-zinc-100' : 'text-red-400',
    },
    {
      label: 'Spent This Month',
      value: fmt(spendThisMonth),
      sub: null,
      accent: 'text-zinc-400',
      valueClass: 'text-zinc-100',
    },
    {
      label: 'vs Last Month',
      value: spendLastMonth > 0
        ? `${changePositive ? '▲' : '▼'} ${fmt(Math.abs(monthChange))}`
        : '—',
      sub: spendLastMonth > 0
        ? `${Math.abs(Math.round((monthChange / spendLastMonth) * 100))}% ${changePositive ? 'more' : 'less'}`
        : 'No prior data',
      accent: spendLastMonth > 0 ? (changePositive ? 'text-red-400' : 'text-emerald-400') : 'text-zinc-600',
      valueClass: spendLastMonth > 0 ? (changePositive ? 'text-red-400' : 'text-emerald-400') : 'text-zinc-500',
    },
    {
      label: 'Biggest Category',
      value: biggestCategory ? CATEGORY_LABELS[biggestCategory.name] ?? biggestCategory.name : '—',
      sub: biggestCategory && totalMonthSpend > 0
        ? `${fmt(biggestCategory.pence)} · ${Math.round((biggestCategory.pence / totalMonthSpend) * 100)}% of spend`
        : null,
      accent: 'text-zinc-400',
      valueClass: 'text-zinc-100',
    },
  ]

  return (
    <div className="grid grid-cols-4 divide-x divide-zinc-800 border-b border-zinc-800 shrink-0">
      {stats.map((stat, i) => (
        <div key={i} className="px-4 py-3">
          <p className="text-[11px] text-zinc-500 mb-0.5">{stat.label}</p>
          <p className={`text-lg font-bold leading-tight ${stat.valueClass}`}>{stat.value}</p>
          {stat.sub && <p className={`text-[11px] ${stat.accent}`}>{stat.sub}</p>}
        </div>
      ))}
    </div>
  )
}
